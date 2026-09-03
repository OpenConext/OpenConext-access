import "./Statistics.scss";
import React, {useCallback, useEffect, useMemo, useState} from "react";
import I18n from "../locale/I18n";
import {useAppStore} from "../stores/AppStore.js";
import {useShallow} from "zustand/react/shallow";
import SegmentedControl from "../components/SegmentedControl.jsx";
import PeriodPicker from "../components/PeriodPicker.jsx";
import {Button} from "@surfnet/curve-react";
import ExportIcon from "../icons/export.svg";
import StatsLineChart from "../components/StatsLineChart.jsx";
import StatsTable from "../components/StatsTable.jsx";
import {DateField} from "../components/DateField.jsx";
import {loginTimeFrame, loginAggregated, uniqueLoginCount, publicServiceProviders, publicIdentityProviders} from "../api/index.js";
import {providerName} from "../utils/Manage.js";
import {authorities} from "../utils/Permissions.js";
import {isEmpty, sanitize} from "../utils/Utils.js";
import {Navigate} from "react-router";

const periods = {
    year: "year",
    quarter: "quarter",
    month: "month",
    week: "week",
    custom: "custom",
}

const scaleForPeriod = {
    year: "month",
    quarter: "quarter",
    month: "month",
    week: "week",
}

const buildPeriodString = (period, year) => {
    // For loginAggregated: "2026" (year), "2026Q1" (quarter), "2026M3" (month), "2026W12" (week)
    // We always request the full year, so just the year string
    return `${year}`;
}

const buildFromTo = (year) => {
    const from = new Date(year, 0, 1).getTime() / 1000;
    const to = new Date(year + 1, 0, 1).getTime() / 1000;
    return {from, to};
}

const buildChartLabels = (scale) => {
    switch (scale) {
        case "month":
            return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        case "week": {
            const labels = [];
            for (let i = 1; i <= 52; i++) labels.push(`W${i}`);
            return labels;
        }
        default:
            return [];
    }
}

const scaleForCustomRange = (from, to) => {
    const diffDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 3 * 365) return "year";
    if (diffDays > 365) return "quarter";
    if (diffDays > 180) return "month";
    return "day";
}

const formatCustomLabel = (timestamp, scale) => {
    const d = new Date(typeof timestamp === "number" && timestamp < 1e12 ? timestamp * 1000 : timestamp);
    if (isNaN(d.getTime())) return String(timestamp);
    switch (scale) {
        case "year":
            return `${d.getFullYear()}`;
        case "quarter": {
            const quarter = Math.ceil((d.getMonth() + 1) / 3);
            return `Q${quarter} ${d.getFullYear()}`;
        }
        case "month":
            return d.toLocaleDateString("en-GB", {month: "short", year: "numeric"});
        default:
            return d.toLocaleDateString("en-GB", {day: "numeric", month: "short"});
    }
}

const formatStatNumber = (n) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2).replace(".", ",")}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(2).replace(".", ",")}K`;
    return n.toLocaleString("nl-NL");
}

const Statistics = () => {
    const {user, config, currentOrganization} = useAppStore(useShallow(state => ({
        user: state.user,
        config: state.config,
        currentOrganization: state.currentOrganization
    })));

    const isInstitution = !isEmpty(currentOrganization?.manageIdentifier);
    const isOrgAdmin = (user?.organizationMemberships || [])
        .some(m => m.authority === authorities.ADMIN && m.organization.id === currentOrganization?.id);

    const isSurfNet = useMemo(() => {
        if (user?.superUser) return true;
        const surfSchacHome = config?.surfSchacHomeOrganization;
        return surfSchacHome && user?.schacHomeOrganization === surfSchacHome;
    }, [user, config]);

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
    const [perAppData, setPerAppData] = useState([]);
    const [perInstituteData, setPerInstituteData] = useState([]);
    const [totalLogins, setTotalLogins] = useState(0);
    const [totalUnique, setTotalUnique] = useState(0);
    const [loading, setLoading] = useState(true);

    // Selected filters from table row clicks
    const [selectedSp, setSelectedSp] = useState(null);
    const [selectedIdp, setSelectedIdp] = useState(null);

    // Entity name lookup maps
    const [spMap, setSpMap] = useState({});
    const [idpMap, setIdpMap] = useState({});

    // Fetch SP and IdP lists on mount for name resolution
    useEffect(() => {
        const locale = I18n.locale;
        Promise.all([publicServiceProviders(), publicIdentityProviders()])
            .then(([sps, idps]) => {
                const spLookup = {};
                sps.forEach(sp => {
                    spLookup[sp.data.entityid] = providerName(locale, sp);
                });
                const idpLookup = {};
                idps.forEach(idp => {
                    idpLookup[idp.data.entityid] = providerName(locale, idp);
                });
                setSpMap(spLookup);
                setIdpMap(idpLookup);
            });
    }, []);

    // Fetch statistics data when period, year, custom dates, or filters change
    const fetchData = useCallback(() => {
        setLoading(true);

        if (period === "custom") {
            const from = Math.floor(customFrom.getTime() / 1000);
            const to = Math.floor(customTo.getTime() / 1000);
            const scale = scaleForCustomRange(customFrom, customTo);
            const spFilter = selectedSp || "";

            loginTimeFrame(from, to, scale, spFilter)
                .then((data) => {
                    const arr = Array.isArray(data) ? data : [data];
                    const totLogins = arr.reduce((sum, d) => sum + (d.count_user_id || 0), 0);
                    const totUnique = arr.reduce((sum, d) => sum + (d.distinct_count_user_id || 0), 0);
                    setTotalLogins(totLogins);
                    setTotalUnique(totUnique);
                    setTimeFrameData(arr);
                    setPerAppData(arr);
                    setPerInstituteData([]);
                    setLoading(false);
                })
                .catch(() => setLoading(false));
            return;
        }

        const {from, to} = buildFromTo(periodValue);
        const scale = scaleForPeriod[period];
        const periodStr = buildPeriodString(period, periodValue);
        const spFilter = selectedSp || "";

        // When "year" period is selected, make one call spanning 5 years (one point per year);
        // loginAggregated still uses only the selected year.
        if (period === "year") {
            const from5 = new Date(periodValue - 4, 0, 1).getTime() / 1000;
            const to5   = new Date(periodValue + 1, 0, 1).getTime() / 1000;

            const aggregatedPromises = [
                loginAggregated(periodStr, spFilter, "sp_entity_id"),
                uniqueLoginCount(from, to, spFilter),
            ];
            if (isSurfNet) {
                aggregatedPromises.push(loginAggregated(periodStr, spFilter, "idp_entity_id"));
            }

            Promise.all([
                loginTimeFrame(from5, to5, "year", spFilter),
                Promise.all(aggregatedPromises),
            ]).then(([timeFrame, [perApp, uniqueCount, perInstitute]]) => {
                const arr = Array.isArray(timeFrame) ? timeFrame : [timeFrame];
                setTimeFrameData(arr);
                setPerAppData(perApp || []);
                setPerInstituteData(isSurfNet ? (perInstitute || []) : []);

                const totLogins = arr.reduce((sum, d) => sum + (d.count_user_id || 0), 0);
                setTotalLogins(totLogins);

                if (typeof uniqueCount === "number") {
                    setTotalUnique(uniqueCount);
                } else if (uniqueCount && uniqueCount.distinct_count_user_id !== undefined) {
                    setTotalUnique(uniqueCount.distinct_count_user_id);
                } else {
                    setTotalUnique(arr.reduce((sum, d) => sum + (d.distinct_count_user_id || 0), 0));
                }
                setLoading(false);
            }).catch(() => setLoading(false));
            return;
        }

        const promises = [
            loginTimeFrame(from, to, scale, spFilter),
            loginAggregated(periodStr, spFilter, "sp_entity_id"),
            uniqueLoginCount(from, to, spFilter),
        ];

        // Only fetch per-institute data for SURFnet users
        if (isSurfNet) {
            promises.push(loginAggregated(periodStr, spFilter, "idp_entity_id"));
        }

        Promise.all(promises).then(([timeFrame, perApp, uniqueCount, perInstitute]) => {
            setTimeFrameData(timeFrame || []);
            setPerAppData(perApp || []);
            setPerInstituteData(isSurfNet ? (perInstitute || []) : []);

            // Compute totals from timeFrame
            const totLogins = (timeFrame || []).reduce((sum, d) => sum + (d.count_user_id || 0), 0);
            setTotalLogins(totLogins);

            if (typeof uniqueCount === "number") {
                setTotalUnique(uniqueCount);
            } else if (uniqueCount && uniqueCount.distinct_count_user_id !== undefined) {
                setTotalUnique(uniqueCount.distinct_count_user_id);
            } else {
                const totUnique = (timeFrame || []).reduce((sum, d) => sum + (d.distinct_count_user_id || 0), 0);
                setTotalUnique(totUnique);
            }
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [period, periodValue, customFrom, customTo, selectedSp, isSurfNet]);

    useEffect(() => {
        fetchData(); // eslint-disable-line react-hooks/set-state-in-effect
    }, [fetchData]);

    const chartLabels = useMemo(() => {
        if (period === "custom") {
            const scale = scaleForCustomRange(customFrom, customTo);
            return timeFrameData.map(d => formatCustomLabel(d.time, scale));
        }
        // For "year", data has one point per year — derive labels from timestamps
        if (period === "year") {
            return timeFrameData.map(d => formatCustomLabel(d.time, "year"));
        }
        const scale = scaleForPeriod[period];
        if (scale === "day" || scale === "quarter") {
            return timeFrameData.map(d => formatCustomLabel(d.time, scale));
        }
        return buildChartLabels(scale);
    }, [period, customFrom, customTo, timeFrameData]);

    const spNameResolver = useCallback((entityId) => spMap[entityId] || entityId, [spMap]);
    const idpNameResolver = useCallback((entityId) => idpMap[entityId] || entityId, [idpMap]);
    const customTimeResolver = useCallback((timestamp) => {
        const scale = scaleForCustomRange(customFrom, customTo);
        return formatCustomLabel(timestamp, scale);
    }, [customFrom, customTo]);

    const handleExport = () => {
        const rows = [["Label", "Logins", "Unique Users"]];
        timeFrameData.forEach((d, i) => {
            rows.push([chartLabels[i] || i, d.count_user_id || 0, d.distinct_count_user_id || 0]);
        });

        if (period !== "custom") {
            rows.push([]);
            rows.push(["Per App", "Logins", "Unique Users"]);
            perAppData.forEach(d => {
                const name = spNameResolver(d.sp_entity_id || "");
                rows.push([name, d.count_user_id || 0, d.distinct_count_user_id || 0]);
            });
            if (isSurfNet) {
                rows.push([]);
                rows.push(["Per Institute", "Logins", "Unique Users"]);
                perInstituteData.forEach(d => {
                    const name = idpNameResolver(d.idp_entity_id || "");
                    rows.push([name, d.count_user_id || 0, d.distinct_count_user_id || 0]);
                });
            }
        }

        const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
        const blob = new Blob([csv], {type: "text/csv;charset=utf-8;"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `statistics_${period === "custom" ? "custom" : periodValue + "_" + period}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (!(user?.superUser || isOrgAdmin) || !isInstitution) {
        return <Navigate to="/404" replace/>;
    }

    return (
        <div className="statistics-container">
            <div className="statistics-header">
                <div className="title">
                    <h2 className="text-[length:var(--text-xl-font-size)] mb-3.5">{I18n.t("statistics.title")}</h2>
                    <p>{I18n.t(isSurfNet ? "statistics.loginAll" : "statistics.loginOwn")}</p>
                </div>
                <div className="statistics-menu">
                    <h5 className="period">{I18n.t("statistics.period")}</h5>
                    <div className="statistics-menu-options">
                        <SegmentedControl onClick={option => setPeriod(option)}
                                          options={Object.keys(periods)}
                                          option={period}
                                          optionLabelResolver={option => I18n.t(`statistics.${option}`)}/>
                        {period !== "custom" && (
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
                                       maxDate={new Date()}
                                       showYearDropdown={true}
                                       pastDatesAllowed={true}
                                       allowNull={false}/>
                        </div>

                        <Button onClick={handleExport}
                                className="export">
                            <span data-icon="inline-start"><ExportIcon/></span>
                            <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("statistics.export"))}}/>
                        </Button>

                    </div>
                </div>
            </div>
            <div className="main-stats">
                <section className="cardy">
                    <div className="stat">
                        <h1 className="text-[length:var(--text-2xl-font-size)]">{loading ? "—" : formatStatNumber(totalLogins)}</h1>
                        <p>{I18n.t("statistics.total")} </p>
                        <span className="blue"/>
                    </div>
                </section>
                <section className="cardy">
                    <div className="stat">
                        <h1 className="text-[length:var(--text-2xl-font-size)]">{loading ? "—" : formatStatNumber(totalUnique)}</h1>
                        <p>{I18n.t("statistics.unique")} </p>
                        <span className="green"/>
                    </div>
                </section>
            </div>

            <section className="cardy chart-section">
                <StatsLineChart data={timeFrameData} labels={chartLabels}/>
            </section>

            <div className="tables-row">
                {period === "custom" ? (
                    <section className="cardy table-card full-width">
                        <StatsTable data={perAppData}
                                    titleKey="perPeriod"
                                    nameResolver={customTimeResolver}
                                    selectable={false}/>
                    </section>
                ) : isSurfNet ? (
                    <>
                        <section className="cardy table-card">
                            <StatsTable data={perAppData}
                                        titleKey="perApp"
                                        nameResolver={spNameResolver}
                                        selectedId={selectedSp}
                                        onSelect={setSelectedSp}
                                        filterLabel={selectedIdp ? idpNameResolver(selectedIdp) : null}/>
                        </section>
                        <section className="cardy table-card">
                            <StatsTable data={perInstituteData}
                                        titleKey="perInstitute"
                                        nameResolver={idpNameResolver}
                                        selectedId={selectedIdp}
                                        onSelect={setSelectedIdp}
                                        filterLabel={selectedSp ? spNameResolver(selectedSp) : null}/>
                        </section>
                    </>
                ) : (
                    <>
                        <section className="cardy table-card">
                            <StatsTable data={perAppData}
                                        titleKey="loginsPerApp"
                                        nameResolver={spNameResolver}
                                        selectedId={selectedSp}
                                        onSelect={setSelectedSp}
                                        fixedMetric="logins"/>
                        </section>
                        <section className="cardy table-card">
                            <StatsTable data={perAppData}
                                        titleKey="uniquePerApp"
                                        nameResolver={spNameResolver}
                                        selectedId={selectedSp}
                                        onSelect={setSelectedSp}
                                        fixedMetric="unique"/>
                        </section>
                    </>
                )}
            </div>
        </div>
    )
};
export default Statistics;
