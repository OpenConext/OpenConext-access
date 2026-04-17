import "./StatsTable.scss";
import React, {useState} from "react";
import I18n from "../locale/I18n";
import ToggleSegmentButton from "./ToggleSegmentButton.jsx";

const INITIAL_ROWS = 6;
const PAGE_SIZE = 100;

const formatNumber = (n) =>
    Number(n).toLocaleString("nl-NL");

const StatsTable = ({data = [], titleKey, nameResolver, selectedId, onSelect, filterLabel, fixedMetric}) => {
    const [metric, setMetric] = useState(fixedMetric || "logins");
    const [mode, setMode] = useState("absolute");
    const [visibleCount, setVisibleCount] = useState(INITIAL_ROWS);

    const activeMetric = fixedMetric || metric;
    const key = activeMetric === "logins" ? "count_user_id" : "distinct_count_user_id";
    const total = data.reduce((sum, d) => sum + (d[key] || 0), 0);
    const sorted = [...data].sort((a, b) => (b[key] || 0) - (a[key] || 0));
    const maxVal = sorted.length > 0 ? sorted[0][key] || 1 : 1;
    const visible = sorted.slice(0, visibleCount);
    const remaining = sorted.length - visibleCount;

    const handleRowClick = (entityId) => {
        if (onSelect) {
            onSelect(entityId === selectedId ? null : entityId);
        }
    };

    return (
        <div className="stats-table">
            <div className="stats-table-header">
                <div className="stats-table-title-row">
                    {!fixedMetric && (
                        <ToggleSegmentButton
                            value={metric}
                            onChange={setMetric}
                            options={[
                                {value: "logins", label: I18n.t("statistics.logins")},
                                {value: "unique", label: I18n.t("statistics.uniqueUsers")},
                            ]}
                        />
                    )}
                    <h4>{I18n.t(`statistics.${titleKey}`)}
                        {filterLabel && <span className="filter-label"> {I18n.t("statistics.for")} {filterLabel}</span>}
                    </h4>
                </div>
                <ToggleSegmentButton
                    value={mode}
                    onChange={setMode}
                    options={[
                        {value: "absolute", label: I18n.t("statistics.absolute")},
                        {value: "percentage", label: I18n.t("statistics.percentage")},
                    ]}
                />
            </div>
            <div className="stats-table-body">
                {visible.map((row, idx) => {
                    const val = row[key] || 0;
                    const pct = total > 0 ? (val / total) * 100 : 0;
                    const barWidth = (val / maxVal) * 100;
                    const entityId = row.sp_entity_id || row.idp_entity_id || "";
                    const name = nameResolver ? nameResolver(entityId) : entityId;
                    const isSelected = entityId === selectedId;
                    return (
                        <div key={entityId || idx}
                             className={`stats-table-row ${activeMetric === "logins" ? "logins" : "unique"} ${isSelected ? "selected" : ""}`}
                             onClick={() => handleRowClick(entityId)}>
                            {isSelected && (
                                <span className="row-deselect"
                                      onClick={e => { e.stopPropagation(); onSelect(null); }}>
                                    &times;
                                </span>
                            )}
                            <div className="row-bar-container">
                                <div className="row-bar" style={{width: `${barWidth}%`}}/>
                                <span className="row-name">{name}</span>
                            </div>
                            <div className="row-value">
                                {mode === "absolute" ? formatNumber(val) : `${pct.toFixed(1)}%`}
                            </div>
                        </div>
                    );
                })}
            </div>
            {remaining > 0 && (
                <button className="show-more" onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}>
                    {I18n.t("statistics.showMore")} (+{Math.min(remaining, PAGE_SIZE)}{remaining > PAGE_SIZE ? ` of ${remaining}` : ""})
                </button>
            )}
        </div>
    );
};

export default StatsTable;
