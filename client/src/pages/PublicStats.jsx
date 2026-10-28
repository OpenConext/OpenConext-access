import "./Statistics.scss";
import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import I18n from "../locale/I18n";
import SegmentedControl from "../components/SegmentedControl.jsx";
import PeriodPicker from "../components/PeriodPicker.jsx";
import StatsLineChart from "../components/StatsLineChart.jsx";
import {DateField} from "../components/DateField.jsx";
import {loginTimeFrame} from "../api/index.js";

const AUTO_REFRESH_INTERVAL = 30_000; // ms

const periods = {
    minute: "minute",
    hour: "hour",
    day: "day",
    week: "week",
    month: "month",
    quarter: "quarter",
    year: "year",
    custom: "custom",
};

// Scales that use a fixed rolling window (no PeriodPicker, auto-refresh)
const rollingPeriods = new Set(["minute", "hour"]);

// Scales that use a named year with PeriodPicker
const yearPeriods = new Set(["day", "week", "month", "quarter", "year"]);

const scaleForPeriod = {
    minute: "minute",
    hour: "hour",
    day: "day",
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
        default:        return formatDayLabel(timestamp); // "day" scale, named period or custom range
    }
};

const formatStatNumber = (n) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(".", ",")}K`;
    return n.toLocaleString("nl-NL");
};

const PublicStats = ({embedded = false}) => {
    const [period, setPeriod] = useState(periods.week);
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

            loginTimeFrame(from, to, scale, "", "", false)
                .then((data) => {
                    const arr = Array.isArray(data) ? data : [data];
                    setTotalLogins(arr.reduce((sum, d) => sum + (d.count_user_id || 0), 0));
                    setTimeFrameData(arr);
                    setLoading(false);
                })
                .catch(() => setLoading(false));
            return;
        }

        if (rollingPeriods.has(period)) {
            const {from, to} = buildRollingFromTo(period);
            const scale = scaleForPeriod[period];

            loginTimeFrame(from, to, scale, "", "", false)
                .then((data) => {
                    const arr = Array.isArray(data) ? data : [data];
                    setTotalLogins(arr.reduce((sum, d) => sum + (d.count_user_id || 0), 0));
                    setTimeFrameData(arr);
                    setLoading(false);
                })
                .catch(() => setLoading(false));
            return;
        }

        const {from, to} = buildYearFromTo(periodValue);
        const scale = scaleForPeriod[period];

        // When "year" period is selected, make one call spanning 5 years (one point per year)
        if (period === "year") {
            const from5 = new Date(periodValue - 4, 0, 1).getTime() / 1000;
            const to5   = new Date(periodValue + 1, 0, 1).getTime() / 1000;
            loginTimeFrame(from5, to5, "year", "", "", false)
                .then(data => {
                    const arr = Array.isArray(data) ? data : [data];
                    setTotalLogins(arr.reduce((sum, d) => sum + (d.count_user_id || 0), 0));
                    setTimeFrameData(arr);
                    setLoading(false);
                })
                .catch(() => setLoading(false));
            return;
        }

        loginTimeFrame(from, to, scale, "", "", false)
            .then(data => {
                const arr = Array.isArray(data) ? data : [data];
                setTotalLogins(arr.reduce((sum, d) => sum + (d.count_user_id || 0), 0));
                setTimeFrameData(arr);
                setLoading(false);
            })
            .catch(() => setLoading(false));
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

    // Use a fluent (dot-free) line for high-density scales: rolling periods and
    // custom ranges that resolve to minute or hour scale.
    const isFluent = rollingPeriods.has(period) ||
        (period === "custom" && (customScale === "minute" || customScale === "hour"));

    // Limit x-axis tick density for high-density scales to avoid a crowded axis.
    const maxXTicks = (() => {
        if (period === "minute" || (period === "custom" && customScale === "minute")) return 24;
        if (period === "hour"   || (period === "custom" && customScale === "hour"))   return 14;
        if (period === "week") return 13;
        return undefined;
    })();

    const periodMenu = (
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
            </div>
        </div>
    );

    const totalCard = (
        <section className="cardy">
            <div className="stat">
                <h1 className="text-[length:var(--text-2xl-font-size)]">{loading ? "—" : formatStatNumber(totalLogins)}</h1>
                <p>{I18n.t("statistics.total")}</p>
                <span className="blue"/>
            </div>
        </section>
    );

    return (
        <div className={`statistics-container ${embedded ? "embedded" : ""}`}>
            {embedded ?
                <div className="statistics-toolbar">
                    {totalCard}
                    {periodMenu}
                </div> :
                <>
                    <div className="statistics-header">
                        <div className="title">
                            <h2 className="text-[length:var(--text-xl-font-size)] mb-3.5">{I18n.t("statistics.title")}</h2>
                            <p>{I18n.t("statistics.loginPublic")}</p>
                        </div>
                        {periodMenu}
                    </div>
                    <div className="main-stats">
                        {totalCard}
                    </div>
                </>}

            <section className="cardy chart-section">
                <StatsLineChart
                    data={timeFrameData}
                    labels={chartLabels}
                    showUnique={false}
                    fluent={isFluent}
                    maxXTicks={maxXTicks}/>
            </section>
        </div>
    );
};

export default PublicStats;
