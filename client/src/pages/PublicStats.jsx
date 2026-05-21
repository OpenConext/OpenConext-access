import "./Statistics.scss";
import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import I18n from "../locale/I18n";
import SegmentedControl from "../components/SegmentedControl.jsx";
import PeriodPicker from "../components/PeriodPicker.jsx";
import {Button, ButtonIconPlacement} from "@surfnet/sds";
import ExportIcon from "../icons/export.svg";
import StatsLineChart from "../components/StatsLineChart.jsx";
import {DateField} from "../components/DateField.jsx";
import {loginTimeFrame} from "../api/index.js";

const AUTO_REFRESH_INTERVAL = 30_000; // ms

const periods = {
    minute: "minute",
    hour: "hour",
    week: "week",
    month: "month",
    quarter: "quarter",
    year: "year",
    custom: "custom",
};

// Scales that use a fixed rolling window (no PeriodPicker, auto-refresh)
const rollingPeriods = new Set(["minute", "hour"]);

// Scales that use a named year with PeriodPicker
const yearPeriods = new Set(["week", "month", "quarter", "year"]);

const scaleForPeriod = {
    minute: "minute",
    hour: "hour",
    week: "week",
    month: "month",
    quarter: "quarter",
    year: "year",
};

// Rolling window sizes in seconds
const rollingWindowSeconds = {
    minute: 86_400,       // last 1 day for minute-scale
    hour: 7 * 86_400,     // last 7 days for hour-scale
};

// Maximum custom range in days per scale
const MAX_CUSTOM_DAYS = {
    minute: 1,
    hour: 7,
};

const buildRollingFromTo = (period) => {
    const now = Math.floor(Date.now() / 1000);
    return {from: now - rollingWindowSeconds[period], to: now};
};

const buildYearFromTo = (year) => {
    const from = new Date(year, 0, 1).getTime() / 1000;
    const to = new Date(year + 1, 0, 1).getTime() / 1000;
    return {from, to};
};

// Shift a year-based period back by `steps` years
const shiftYearPeriod = (year, steps) => buildYearFromTo(year - steps);

// Determine the appropriate API scale for a custom date range.
// Minute and hour scales are selected for short ranges; longer ranges fall back
// to the same heuristic as Statistics.jsx.
const scaleForCustomRange = (from, to) => {
    const diffDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays <= MAX_CUSTOM_DAYS.minute) return "minute";
    if (diffDays <= MAX_CUSTOM_DAYS.hour)   return "hour";
    if (diffDays > 3 * 365)                 return "year";
    if (diffDays > 365)                     return "quarter";
    if (diffDays > 180)                     return "month";
    return "day";
};

// All label formatters derive from the timestamp in d.time.
// The API returns ms-epoch values (epoch=ms), so timestamps >= 1e12 are already ms;
// values < 1e12 are treated as seconds and multiplied.
const toDate = (timestamp) =>
    new Date(typeof timestamp === "number" && timestamp < 1e12 ? timestamp * 1000 : timestamp);

const formatRollingLabel = (timestamp, scale) => {
    const d = toDate(timestamp);
    if (isNaN(d.getTime())) return String(timestamp);
    if (scale === "minute") {
        return d.toLocaleTimeString("en-GB", {hour: "2-digit", minute: "2-digit"});
    }
    // hour: "Mon 14:00"
    return d.toLocaleDateString("en-GB", {weekday: "short"}) + " " +
        d.toLocaleTimeString("en-GB", {hour: "2-digit", minute: "2-digit"});
};

const formatWeekLabel = (timestamp) => {
    const d = toDate(timestamp);
    if (isNaN(d.getTime())) return String(timestamp);
    const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((tmp - yearStart) / 86_400_000) + 1) / 7);
    return `W${week} ${d.getFullYear()}`;
};

const formatMonthLabel = (timestamp) => {
    const d = toDate(timestamp);
    if (isNaN(d.getTime())) return String(timestamp);
    return d.toLocaleDateString("en-GB", {month: "short", year: "numeric"});
};

const formatQuarterLabel = (timestamp) => {
    const d = toDate(timestamp);
    if (isNaN(d.getTime())) return String(timestamp);
    const quarter = Math.ceil((d.getMonth() + 1) / 3);
    return `Q${quarter} ${d.getFullYear()}`;
};

const formatYearLabel = (timestamp) => {
    const d = toDate(timestamp);
    if (isNaN(d.getTime())) return String(timestamp);
    return String(d.getFullYear());
};

const formatDayLabel = (timestamp) => {
    const d = toDate(timestamp);
    if (isNaN(d.getTime())) return String(timestamp);
    return d.toLocaleDateString("en-GB", {day: "numeric", month: "short"});
};

const labelForScale = (scale, timestamp) => {
    switch (scale) {
        case "minute":
        case "hour":    return formatRollingLabel(timestamp, scale);
        case "week":    return formatWeekLabel(timestamp);
        case "month":   return formatMonthLabel(timestamp);
        case "quarter": return formatQuarterLabel(timestamp);
        case "year":    return formatYearLabel(timestamp);
        default:        return formatDayLabel(timestamp); // "day" scale for custom ranges
    }
};

const formatStatNumber = (n) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(".", ",")}K`;
    return n.toLocaleString("nl-NL");
};

const formatPct = (current, baseline) => {
    if (!baseline || baseline === 0) return null;
    const pct = Math.round(((current - baseline) / baseline) * 100);
    return pct >= 0 ? `+${pct}%` : `${pct}%`;
};

const PublicStats = () => {
    const [period, setPeriod] = useState(periods.year);
    const [periodValue, setPeriodValue] = useState(new Date().getFullYear());
    const [customFrom, setCustomFrom] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), 0, 1);
    });
    const [customTo, setCustomTo] = useState(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow;
    });

    const [timeFrameData, setTimeFrameData] = useState([]);
    const [totalLogins, setTotalLogins] = useState(0);
    const [prevPeriodTotal, setPrevPeriodTotal] = useState(null);
    const [threePeriodTotal, setThreePeriodTotal] = useState(null);
    const [loading, setLoading] = useState(true);

    const autoRefreshRef = useRef(null);

    // The resolved API scale for the current custom range — used for labels and fluent mode.
    const customScale = useMemo(
        () => (period === "custom" ? scaleForCustomRange(customFrom, customTo) : null),
        [period, customFrom, customTo]
    );

    // For custom minute/hour ranges, cap the "to" picker's maxDate to enforce the window limit.
    const customToMax = useMemo(() => {
        if (period !== "custom") return new Date();
        const scale = scaleForCustomRange(customFrom, customTo);
        if (scale === "minute") {
            const max = new Date(customFrom);
            max.setDate(max.getDate() + MAX_CUSTOM_DAYS.minute);
            return max > new Date() ? new Date() : max;
        }
        if (scale === "hour") {
            const max = new Date(customFrom);
            max.setDate(max.getDate() + MAX_CUSTOM_DAYS.hour);
            return max > new Date() ? new Date() : max;
        }
        return new Date();
    }, [period, customFrom, customTo]);

    const fetchData = useCallback(() => {
        setLoading(true);

        if (period === "custom") {
            const from = Math.floor(customFrom.getTime() / 1000);
            const to = Math.floor(customTo.getTime() / 1000);
            const scale = scaleForCustomRange(customFrom, customTo);

            loginTimeFrame(from, to, scale, "", false)
                .then((data) => {
                    const arr = Array.isArray(data) ? data : [data];
                    setTotalLogins(arr.reduce((sum, d) => sum + (d.count_user_id || 0), 0));
                    setTimeFrameData(arr);
                    setPrevPeriodTotal(null);
                    setThreePeriodTotal(null);
                    setLoading(false);
                })
                .catch(() => setLoading(false));
            return;
        }

        if (rollingPeriods.has(period)) {
            const {from, to} = buildRollingFromTo(period);
            const scale = scaleForPeriod[period];

            loginTimeFrame(from, to, scale, "", false)
                .then((data) => {
                    const arr = Array.isArray(data) ? data : [data];
                    setTotalLogins(arr.reduce((sum, d) => sum + (d.count_user_id || 0), 0));
                    setTimeFrameData(arr);
                    setPrevPeriodTotal(null);
                    setThreePeriodTotal(null);
                    setLoading(false);
                })
                .catch(() => setLoading(false));
            return;
        }

        // Year-based periods: fetch current + 2 comparison windows in parallel
        const {from, to} = buildYearFromTo(periodValue);
        const scale = scaleForPeriod[period];
        const prev = shiftYearPeriod(periodValue, 1);
        const three = shiftYearPeriod(periodValue, 3);

        Promise.all([
            loginTimeFrame(from, to, scale, "", false),
            loginTimeFrame(prev.from, prev.to, scale, "", false),
            loginTimeFrame(three.from, three.to, scale, "", false),
        ]).then(([current, prevData, threeData]) => {
            const arr = Array.isArray(current) ? current : [current];
            const prevArr = Array.isArray(prevData) ? prevData : [prevData];
            const threeArr = Array.isArray(threeData) ? threeData : [threeData];

            setTotalLogins(arr.reduce((sum, d) => sum + (d.count_user_id || 0), 0));
            setPrevPeriodTotal(prevArr.reduce((sum, d) => sum + (d.count_user_id || 0), 0));
            setThreePeriodTotal(threeArr.reduce((sum, d) => sum + (d.count_user_id || 0), 0));
            setTimeFrameData(arr);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [period, periodValue, customFrom, customTo]);

    // Auto-refresh every 30s for rolling periods (minute / hour)
    useEffect(() => {
        if (autoRefreshRef.current) {
            clearInterval(autoRefreshRef.current);
            autoRefreshRef.current = null;
        }
        if (rollingPeriods.has(period)) {
            autoRefreshRef.current = setInterval(fetchData, AUTO_REFRESH_INTERVAL);
        }
        return () => {
            if (autoRefreshRef.current) {
                clearInterval(autoRefreshRef.current);
                autoRefreshRef.current = null;
            }
        };
    }, [period, fetchData]);

    useEffect(() => {
        fetchData(); // eslint-disable-line react-hooks/set-state-in-effect
    }, [fetchData]);

    // All scales derive labels from actual data timestamps.
    const chartLabels = useMemo(() => {
        const scale = period === "custom"
            ? scaleForCustomRange(customFrom, customTo)
            : scaleForPeriod[period];
        return timeFrameData.map(d => labelForScale(scale, d.time));
    }, [period, customFrom, customTo, timeFrameData]);

    const pctVsLast = useMemo(
        () => (yearPeriods.has(period) ? formatPct(totalLogins, prevPeriodTotal) : null),
        [period, totalLogins, prevPeriodTotal]
    );

    const pctVs3 = useMemo(
        () => (yearPeriods.has(period) ? formatPct(totalLogins, threePeriodTotal) : null),
        [period, totalLogins, threePeriodTotal]
    );

    // Use a fluent (dot-free) line for high-density scales: rolling periods and
    // custom ranges that resolve to minute or hour scale.
    const isFluent = rollingPeriods.has(period) ||
        (period === "custom" && (customScale === "minute" || customScale === "hour"));

    const handleExport = () => {
        const rows = [["Label", "Logins"]];
        timeFrameData.forEach((d, i) => {
            rows.push([chartLabels[i] || i, d.count_user_id || 0]);
        });
        const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
        const blob = new Blob([csv], {type: "text/csv;charset=utf-8;"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const suffix = (rollingPeriods.has(period) || period === "custom")
            ? period
            : `${periodValue}_${period}`;
        a.download = `statistics_${suffix}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="statistics-container">
            <div className="statistics-header">
                <div className="title">
                    <h2>{I18n.t("statistics.title")}</h2>
                    <p>{I18n.t("statistics.loginPublic")}</p>
                </div>
                <div className="statistics-menu">
                    <h5 className="period">{I18n.t("statistics.period")}</h5>
                    <div className="statistics-menu-options">
                        <SegmentedControl
                            onClick={option => setPeriod(option)}
                            options={Object.keys(periods)}
                            option={period}
                            optionLabelResolver={option => I18n.t(`statistics.${option}`)}/>
                        {yearPeriods.has(period) && (
                            <PeriodPicker value={periodValue} onClick={val => setPeriodValue(val)}/>
                        )}
                        <div className="custom-date-range" style={{display: period === "custom" ? "flex" : "none"}}>
                            <DateField name={I18n.t("statistics.from")}
                                       value={customFrom}
                                       onChange={setCustomFrom}
                                       maxDate={customTo}
                                       showYearDropdown={true}
                                       pastDatesAllowed={true}
                                       allowNull={false}/>
                            <DateField name={I18n.t("statistics.to")}
                                       value={customTo}
                                       onChange={setCustomTo}
                                       minDate={customFrom}
                                       maxDate={customToMax}
                                       showYearDropdown={true}
                                       pastDatesAllowed={true}
                                       allowNull={false}/>
                        </div>
                        <Button onClick={handleExport}
                                className="export"
                                iconPlacement={ButtonIconPlacement.Left}
                                txt={I18n.t("statistics.export")}
                                icon={<ExportIcon/>}/>
                    </div>
                </div>
            </div>

            <div className="main-stats">
                <section className="cardy">
                    <div className="stat">
                        <h1>{loading ? "—" : formatStatNumber(totalLogins)}</h1>
                        <p>{I18n.t("statistics.total")}</p>
                        <span className="blue"/>
                    </div>
                </section>
                <section className="cardy">
                    <div className="stat">
                        {!loading && pctVsLast ? (
                            <>
                                <h1>{pctVsLast}</h1>
                                <p>{I18n.t("statistics.comparedToLastPeriod")}</p>
                            </>
                        ) : (
                            <p className="no-comparison">{"— " + I18n.t("statistics.comparedToLastPeriod")}</p>
                        )}
                    </div>
                </section>
                <section className="cardy">
                    <div className="stat">
                        {!loading && pctVs3 ? (
                            <>
                                <h1>{pctVs3}</h1>
                                <p>{I18n.t("statistics.comparedToLast3Periods")}</p>
                            </>
                        ) : (
                            <p className="no-comparison">{"— " + I18n.t("statistics.comparedToLast3Periods")}</p>
                        )}
                    </div>
                </section>
            </div>

            <section className="cardy chart-section">
                <StatsLineChart
                    data={timeFrameData}
                    labels={chartLabels}
                    showUnique={false}
                    fluent={isFluent}/>
            </section>
        </div>
    );
};

export default PublicStats;
