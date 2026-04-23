import "./StatsTable.scss";
import React, {useEffect, useRef, useState} from "react";
import I18n from "../locale/I18n";
import ToggleSegmentButton from "./ToggleSegmentButton.jsx";
import SearchIcon from "../icons/search.svg";
import InputField from "./InputField.jsx";

const INITIAL_ROWS = 6;
const PAGE_SIZE = 100;

const formatNumber = (n) =>
    Number(n).toLocaleString("nl-NL");

const StatsTable = ({
                        data = [],
                        titleKey,
                        nameResolver,
                        selectedId,
                        onSelect,
                        filterLabel,
                        fixedMetric,
                        selectable = true
                    }) => {
    const [metric, setMetric] = useState(fixedMetric || "logins");
    const [mode, setMode] = useState("absolute");
    const [visibleCount, setVisibleCount] = useState(INITIAL_ROWS);
    const [searchActive, setSearchActive] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const searchInputRef = useRef(null);

    const activeMetric = fixedMetric || metric;
    const key = activeMetric === "logins" ? "count_user_id" : "distinct_count_user_id";
    const total = data.reduce((sum, d) => sum + (d[key] || 0), 0);
    const sorted = [...data].sort((a, b) => (b[key] || 0) - (a[key] || 0));
    const maxVal = sorted.length > 0 ? sorted[0][key] || 1 : 1;

    const displayData = (searchActive && searchQuery)
        ? sorted.filter(row => {
            const entityId = row.sp_entity_id || row.idp_entity_id || row.time || "";
            const name = nameResolver ? nameResolver(entityId) : entityId;
            return name.toLowerCase().includes(searchQuery.toLowerCase());
        })
        : sorted;

    const visible = displayData.slice(0, visibleCount);
    const remaining = displayData.length - visibleCount;

    useEffect(() => {
        if (searchActive) {
            searchInputRef.current?.focus();
        }
    }, [searchActive]);

    const openSearch = () => {
        setSearchQuery("");
        setVisibleCount(INITIAL_ROWS);
        setSearchActive(!searchActive);
    };

    const clearSearch = () => {
        setSearchQuery("");
        setSearchActive(false);
        setVisibleCount(INITIAL_ROWS);
    };

    const handleRowClick = (entityId) => {
        if (selectable && onSelect) {
            onSelect(entityId === selectedId ? null : entityId);
        }
    };

    const isInstituteTable = titleKey.toLowerCase().includes("institute");
    const searchPlaceholder = I18n.t(isInstituteTable ? "statistics.searchInstitutes" : "statistics.searchApps");

    return (
        <div className="stats-table">
            <div className="stats-table-header">
                <div className="stats-table-title-row" style={{display: searchActive ? "none" : undefined}}>
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
                    <h4>{I18n.t(`statistics.${titleKey}`)}</h4>
                </div>
                {searchActive && (
                    <div className="stats-table-search-row">
                        <InputField
                            onRef={searchInputRef}
                            value={searchQuery}
                            placeholder={searchPlaceholder}
                            onChange={e => { setSearchQuery(e.target.value); setVisibleCount(INITIAL_ROWS); }}
                            displayLabel={false}
                        />
                    </div>
                )}
                <div className="stats-table-right-controls">
                    <ToggleSegmentButton
                        value={mode}
                        onChange={setMode}
                        options={[
                            {value: "absolute", label: I18n.t("statistics.absolute")},
                            {value: "percentage", label: I18n.t("statistics.percentage")},
                        ]}
                    />
                    <button className="search-toggle" onClick={openSearch} aria-label="Search">
                        <SearchIcon/>
                    </button>
                </div>
            </div>
            {filterLabel && !searchActive && (
                <div className="filter-label-row">
                    <span className="filter-label-text">
                        {I18n.t("statistics.showingResultsFor", {label: filterLabel})}
                    </span>
                    <span className="clear-search" onClick={() => onSelect && onSelect(null)}>
                        {I18n.t("statistics.removeFilter")}
                    </span>
                </div>
            )}
            {searchActive && (
                <div className="search-meta-row">
                    {searchQuery && (
                        <span className="search-meta">
                            {I18n.t("statistics.results", {count: displayData.length})}
                        </span>
                    )}
                    <span className="clear-search" onClick={clearSearch}>
                                {I18n.t("statistics.clearSearch")}
                            </span>
                </div>
            )}
            <div className="stats-table-body">
                {visible.map((row, idx) => {
                    const val = row[key] || 0;
                    const pct = total > 0 ? (val / total) * 100 : 0;
                    const barWidth = (val / maxVal) * 100;
                    const entityId = row.sp_entity_id || row.idp_entity_id || row.time || "";
                    const name = nameResolver ? nameResolver(entityId) : entityId;
                    const isSelected = selectable && entityId === selectedId;
                    return (
                        <div key={entityId || idx}
                             className={`stats-table-row ${activeMetric === "logins" ? "logins" : "unique"} ${isSelected ? "selected" : ""} ${selectable ? "selectable" : ""}`}
                             onClick={() => handleRowClick(entityId)}>
                            {isSelected && (
                                <span className="row-deselect"
                                      onClick={e => {
                                          e.stopPropagation();
                                          onSelect(null);
                                      }}>
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
