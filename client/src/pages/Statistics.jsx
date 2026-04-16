import "./Statistics.scss";
import React, {useCallback, useEffect, useMemo, useState} from "react";
import I18n from "../locale/I18n";
import ToggleSegmentButton from "../components/ToggleSegmentButton.jsx";
import {useAppStore} from "../stores/AppStore.js";
import {useShallow} from "zustand/react/shallow";
import SegmentedControl from "../components/SegmentedControl.jsx";
import PeriodPicker from "../components/PeriodPicker.jsx";
import {Button, ButtonIconPlacement} from "@surfnet/sds";
import ExportIcon from "../icons/export.svg";
import StatsLineChart from "../components/StatsLineChart.jsx";
import StatsTable from "../components/StatsTable.jsx";
import {loginTimeFrame, loginAggregated, uniqueLoginCount, publicServiceProviders, publicIdentityProviders} from "../api/index.js";
import {providerName} from "../utils/Manage.js";

const periods = {
    year: "year",
    quarter: "quarter",
    month: "month",
    week: "week",
}

const countOptions = {
    total: "total",
    unique: "unique"
}

const scaleForPeriod = {
    year: "month",
    quarter: "week",
    month: "day",
    week: "day",
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

const buildChartLabels = (period, year) => {
    switch (period) {
        case "year":
            return [`${year}`];
        case "quarter":
            return ["Q1", "Q2", "Q3", "Q4"];
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

const formatStatNumber = (n) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2).replace(".", ",")}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(2).replace(".", ",")}K`;
    return n.toLocaleString("nl-NL");
}

const Statistics = () => {
    const {currentOrganization} = useAppStore(useShallow(state => ({
        currentOrganization: state.currentOrganization
    })));

    const [period, setPeriod] = useState(periods.year);
    const [periodValue, setPeriodValue] = useState(new Date().getFullYear());
    const [userIdpOption, setUserIdpOption] = useState(countOptions.total);

    const [timeFrameData, setTimeFrameData] = useState([]);
    const [perAppData, setPerAppData] = useState([]);
    const [perInstituteData, setPerInstituteData] = useState([]);
    const [totalLogins, setTotalLogins] = useState(0);
    const [totalUnique, setTotalUnique] = useState(0);
    const [loading, setLoading] = useState(true);

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

    // Fetch statistics data when period or year changes
    useEffect(() => {
        setLoading(true);
        const {from, to} = buildFromTo(periodValue);
        const scale = scaleForPeriod[period];
        const periodStr = buildPeriodString(period, periodValue);

        Promise.all([
            loginTimeFrame(from, to, scale, ""),
            loginAggregated(periodStr, "", "sp_entity_id"),
            loginAggregated(periodStr, "", "idp_entity_id"),
            uniqueLoginCount(from, to, ""),
        ]).then(([timeFrame, perApp, perInstitute, uniqueCount]) => {
            setTimeFrameData(timeFrame || []);
            setPerAppData(perApp || []);
            setPerInstituteData(perInstitute || []);

            // Compute totals from timeFrame
            const totLogins = (timeFrame || []).reduce((sum, d) => sum + (d.count_user_id || 0), 0);
            setTotalLogins(totLogins);

            // uniqueLoginCount returns a single number or object
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
    }, [period, periodValue]);

    const chartLabels = useMemo(() => buildChartLabels(period, periodValue), [period, periodValue]);

    const spNameResolver = useCallback((entityId) => spMap[entityId] || entityId, [spMap]);
    const idpNameResolver = useCallback((entityId) => idpMap[entityId] || entityId, [idpMap]);

    const handleExport = () => {
        // Build CSV from current timeframe data + tables
        const rows = [["Label", "Logins", "Unique Users"]];
        timeFrameData.forEach((d, i) => {
            rows.push([chartLabels[i] || i, d.count_user_id || 0, d.distinct_count_user_id || 0]);
        });
        rows.push([]);
        rows.push(["Per App", "Logins", "Unique Users"]);
        perAppData.forEach(d => {
            const name = spNameResolver(d.sp_entity_id || "");
            rows.push([name, d.count_user_id || 0, d.distinct_count_user_id || 0]);
        });
        rows.push([]);
        rows.push(["Per Institute", "Logins", "Unique Users"]);
        perInstituteData.forEach(d => {
            const name = idpNameResolver(d.idp_entity_id || "");
            rows.push([name, d.count_user_id || 0, d.distinct_count_user_id || 0]);
        });

        const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
        const blob = new Blob([csv], {type: "text/csv;charset=utf-8;"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `statistics_${periodValue}_${period}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="statistics-container">
            <div className="statistics-header">
                <div className="title">
                    <h2>{I18n.t("statistics.title")}</h2>
                    <p>{I18n.t("statistics.login", {name: currentOrganization.name})}</p>
                </div>
                <div className="statistics-menu">
                    <h5 className="period">{I18n.t("statistics.period")}</h5>
                    <div className="statistics-menu-options">
                        <SegmentedControl onClick={option => setPeriod(option)}
                                          options={Object.keys(periods)}
                                          option={period}
                                          optionLabelResolver={option => I18n.t(`statistics.${option}`)}/>
                        <PeriodPicker value={periodValue} onClick={val => setPeriodValue(val)}/>

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
                        <p>{I18n.t("statistics.total")} </p>
                        <span className="blue"/>
                    </div>
                </section>
                <section className="cardy">
                    <div className="stat">
                        <h1>{loading ? "—" : formatStatNumber(totalUnique)}</h1>
                        <p>{I18n.t("statistics.unique")} </p>
                        <span className="green"/>
                    </div>
                </section>
            </div>

            <section className="cardy chart-section">
                <StatsLineChart data={timeFrameData} labels={chartLabels}/>
            </section>

            <div className="tables-row">
                <section className="cardy table-card">
                    <StatsTable data={perAppData}
                                titleKey="perApp"
                                nameResolver={spNameResolver}/>
                </section>
                <section className="cardy table-card">
                    <StatsTable data={perInstituteData}
                                titleKey="perInstitute"
                                nameResolver={idpNameResolver}/>
                </section>
            </div>
        </div>
    )
};
export default Statistics;
