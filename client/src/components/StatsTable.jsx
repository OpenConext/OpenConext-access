import "./StatsTable.scss";
import React, {useState} from "react";
import I18n from "../locale/I18n";
import ToggleSegmentButton from "./ToggleSegmentButton.jsx";

const INITIAL_ROWS = 6;

const formatNumber = (n) =>
    Number(n).toLocaleString("nl-NL");

const StatsTable = ({data = [], titleKey, nameResolver}) => {
    const [metric, setMetric] = useState("logins");
    const [mode, setMode] = useState("absolute");
    const [expanded, setExpanded] = useState(false);

    const key = metric === "logins" ? "count_user_id" : "distinct_count_user_id";
    const total = data.reduce((sum, d) => sum + (d[key] || 0), 0);
    const sorted = [...data].sort((a, b) => (b[key] || 0) - (a[key] || 0));
    const maxVal = sorted.length > 0 ? sorted[0][key] || 1 : 1;
    const visible = expanded ? sorted : sorted.slice(0, INITIAL_ROWS);

    return (
        <div className="stats-table">
            <div className="stats-table-header">
                <h4>{I18n.t(`statistics.${titleKey}`)}</h4>
                <div className="stats-table-toggles">
                    <ToggleSegmentButton
                        value={metric}
                        onChange={setMetric}
                        options={[
                            {value: "logins", label: I18n.t("statistics.logins")},
                            {value: "unique", label: I18n.t("statistics.uniqueUsers")},
                        ]}
                    />
                    <ToggleSegmentButton
                        value={mode}
                        onChange={setMode}
                        options={[
                            {value: "absolute", label: I18n.t("statistics.absolute")},
                            {value: "percentage", label: I18n.t("statistics.percentage")},
                        ]}
                    />
                </div>
            </div>
            <div className="stats-table-body">
                {visible.map((row, idx) => {
                    const val = row[key] || 0;
                    const pct = total > 0 ? (val / total) * 100 : 0;
                    const barWidth = (val / maxVal) * 100;
                    const entityId = row.sp_entity_id || row.idp_entity_id || "";
                    const name = nameResolver ? nameResolver(entityId) : entityId;
                    return (
                        <div key={entityId || idx} className={`stats-table-row ${metric === "logins" ? "logins" : "unique"}`}>
                            <div className="row-label">{name}</div>
                            <div className="row-bar-container">
                                <div className="row-bar" style={{width: `${barWidth}%`}}/>
                            </div>
                            <div className="row-value">
                                {mode === "absolute" ? formatNumber(val) : `${pct.toFixed(1)}%`}
                            </div>
                        </div>
                    );
                })}
            </div>
            {!expanded && sorted.length > INITIAL_ROWS && (
                <button className="show-more" onClick={() => setExpanded(true)}>
                    {I18n.t("statistics.showMore")} ({sorted.length - INITIAL_ROWS})
                </button>
            )}
        </div>
    );
};

export default StatsTable;
