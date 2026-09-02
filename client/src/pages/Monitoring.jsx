import React, {useEffect, useMemo, useState} from "react";
import {createPortal} from "react-dom";
import {useNavigate} from "react-router";
import "./Monitoring.scss";
import {monitoring} from "../api/index.js";
import I18n from "../locale/I18n.js";
import {MagnifyingGlassIcon as SearchIcon} from "@phosphor-icons/react";
import CheckPlainIcon from "../icons/check-plain.svg";
import MonitoringIncidentIcon from "../icons/monitoring_incident.svg";
import SegmentedControl from "../components/SegmentedControl.jsx";
import {formatDate} from "../utils/Date.js";
import {stopEvent} from "../utils/Utils.js";
import {getParameterByName} from "../utils/QueryParameters.js";

// Query parameter used to persist the selected service, so the selection survives a
// refresh and the URL can be bookmarked.
const SERVICE_QUERY_PARAM = "service";

// Period constants
const PERIOD_DEFAULT = 60;
const PERIOD_ALL = 364;

//Slice number for large incidentGroups
const INCIDENT_GROUPS_NUMBER_SLICE = 10;

// Severity thresholds (downtime minutes) and their CSS classes + bar colors.
// Evaluated in order — first match wins. Segments with no downtime use "ok".
// labelKey is also the single source for the bar-segment color legend below.
const SEVERITY_LEVELS = [
    {minMinutes: 0, maxMinutes: 1, cls: "ok", color: "#a8dfc0", labelKey: "legendOk"},
    {minMinutes: 1, maxMinutes: 5, cls: "warn-light", color: "#FEFBE6", labelKey: "legendWarnLight"},
    {minMinutes: 5, maxMinutes: 15, cls: "warn-heavy", color: "#F5B800", labelKey: "legendWarnHeavy"},
    {minMinutes: 15, maxMinutes: Infinity, cls: "critical", color: "var(--destructive)", labelKey: "legendCritical"},
];

// Incidents shorter than the first non-ok severity threshold (minutes) are ignored.
// Derived from SEVERITY_LEVELS so there is a single source of truth.
const MIN_INCIDENT_MINUTES = SEVERITY_LEVELS.find(l => l.cls !== "ok")?.minMinutes ?? 1;

function isSignificant(incident) {
    if (!incident.resolvedAt) return true;
    const start = new Date(incident.startedAt.replace(" ", "T") + "Z");
    const end = new Date(incident.resolvedAt.replace(" ", "T") + "Z");
    return (end - start) / 60000 >= MIN_INCIDENT_MINUTES;
}

function buildUptimeSegments(incidents, period) {
    const significant = incidents.filter(isSignificant);
    const now = Date.now();
    const startMs = now - period * 24 * 60 * 60 * 1000;
    const segMs = (now - startMs) / period;

    return Array.from({length: period}, (_, i) => {
        const segStart = startMs + i * segMs;
        const segEnd = startMs + (i + 1) * segMs;

        // Compute total downtime overlap (ms) for this segment
        let downtimeMs = 0;
        for (const inc of significant) {
            const iStart = new Date(inc.startedAt.replace(" ", "T") + "Z").getTime();
            const iEnd = inc.resolvedAt
                ? new Date(inc.resolvedAt.replace(" ", "T") + "Z").getTime()
                : now;
            const overlapStart = Math.max(iStart, segStart);
            const overlapEnd = Math.min(iEnd, segEnd);
            if (overlapEnd > overlapStart) {
                downtimeMs += overlapEnd - overlapStart;
            }
        }

        const uptimePct = 100 - (downtimeMs / segMs) * 100;

        // Tooltip date: use the midpoint of the segment
        const midMs = segStart + segMs / 2;
        const segDate = new Date(midMs);

        // Downtime in minutes + seconds for tooltip
        const downtimeSec = Math.round(downtimeMs / 1000);
        const downtimeMin = Math.floor(downtimeSec / 60);
        const downtimeRemSec = downtimeSec % 60;

        const severity = SEVERITY_LEVELS.find(l => downtimeMin >= l.minMinutes && downtimeMin < l.maxMinutes)?.cls ?? "ok";

        return {severity, uptimePct, segDate, downtimeMin, downtimeRemSec};
    });
}

function formatRelativeTime(isoString) {
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 60) return I18n.t("monitoring.secondsAgo", {n: diff});
    if (diff < 3600) return I18n.t("monitoring.minutesAgo", {n: Math.floor(diff / 60)});
    if (diff < 86400) return I18n.t("monitoring.hoursAgo", {n: Math.floor(diff / 3600)});
    return I18n.t("monitoring.daysAgoShort", {n: Math.floor(diff / 86400)});
}

function parseDateStr(dateStr) {
    return new Date(dateStr.replace(" ", "T") + "Z");
}

// Same thresholds as the uptime bar segments, applied to a single incident's own duration -
// so the incident icon uses the same severity color as the bar for how long it lasted.
function incidentSeverityClass(startedDate, resolvedDate) {
    const minutes = Math.floor(((resolvedDate ?? new Date()) - startedDate) / 60000);
    return SEVERITY_LEVELS.find(l => minutes >= l.minMinutes && minutes < l.maxMinutes)?.cls ?? "ok";
}

function groupIncidentsByDate(incidents) {
    const significant = incidents.filter(isSignificant);
    const byDate = {};

    significant.forEach(inc => {
        const d = parseDateStr(inc.startedAt);
        const resolvedDate = inc.resolvedAt ? parseDateStr(inc.resolvedAt) : null;
        const label = formatDate(d, true, false);
        if (!byDate[label]) byDate[label] = [];
        byDate[label].push({
            startedTime: formatDate(d, true, true),
            resolvedTime: resolvedDate ? formatDate(resolvedDate, true, true) : null,
            startedDate: d,
            message: inc.message,
            severity: incidentSeverityClass(d, resolvedDate),
        });
    });

    return Object.entries(byDate)
        .sort(([, a], [, b]) => b[0].startedDate - a[0].startedDate)
        .map(([date, entries]) => ({
            date,
            incidents: entries.sort((a, b) => b.startedDate - a.startedDate),
        }));
}

// ─── icons ────────────────────────────────────────────────────────────────────

function CheckCircleIcon() {
    return (
        <span className="event-circle event-circle--ok">
            <CheckPlainIcon/>
        </span>
    );
}

function WarningCircleIcon({severity}) {
    return (
        <span className={`event-circle event-circle--${severity}`}>
            <MonitoringIncidentIcon/>
        </span>
    );
}

// ─── component ────────────────────────────────────────────────────────────────

export const Monitoring = () => {
    const navigate = useNavigate();
    const [status, setStatus] = useState(null);
    const [loadedPeriod, setLoadedPeriod] = useState(null);
    const [selectedServiceId, setSelectedServiceId] = useState(() => {
        const serviceParam = getParameterByName(SERVICE_QUERY_PARAM, window.location.search);
        return serviceParam ? Number(serviceParam) : null;
    });
    const [period, setPeriod] = useState(PERIOD_DEFAULT);
    const [search, setSearch] = useState("");
    const [tooltip, setTooltip] = useState(null);
    const [showMore, setShowMore] = useState(false);

    const loading = loadedPeriod !== period;

    useEffect(() => {
        monitoring(period)
            .then(data => {
                setStatus(data);
                setLoadedPeriod(period);
            })
            .catch(() => setLoadedPeriod(period));
    }, [period]);

    const selectService = serviceId => {
        setSelectedServiceId(serviceId);
        const params = new URLSearchParams(window.location.search);
        if (serviceId) {
            params.set(SERVICE_QUERY_PARAM, serviceId);
        } else {
            params.delete(SERVICE_QUERY_PARAM);
        }
        const query = params.toString();
        navigate(`/monitoring${query ? `?${query}` : ""}`, {replace: true});
    };

    const selectedService = useMemo(() => {
        if (!status || !selectedServiceId) return null;
        for (const group of status.groups) {
            const found = group.services.find(s => s.id === selectedServiceId);
            if (found) return found;
        }
        return null;
    }, [status, selectedServiceId]);

    const filteredGroups = useMemo(() => {
        if (!status) return [];
        const q = search.trim().toLowerCase();
        return status.groups
            .map(group => ({
                ...group,
                services: group.services.filter(s =>
                    !q || s.name.toLowerCase().includes(q)
                ),
            }))
            .filter(group => group.services.length > 0);
    }, [status, search]);

    const uptimeSegments = useMemo(() => {
        if (!selectedService) return [];
        return buildUptimeSegments(selectedService.incidents, period);
    }, [selectedService, period]);

    const incidentGroups = useMemo(() => {
        if (!selectedService) return [];
        return groupIncidentsByDate(selectedService.incidents);
    }, [selectedService]);

    const visibleIncidentGroups = showMore ? incidentGroups : incidentGroups.slice(0, INCIDENT_GROUPS_NUMBER_SLICE);

    const lastUpdatedText = status
        ? formatRelativeTime(status.lastUpdated)
        : "—";

    const periodLabel = period === PERIOD_DEFAULT
        ? I18n.t("monitoring.daysAgo", {n: PERIOD_DEFAULT})
        : I18n.t("monitoring.daysAgo", {n: PERIOD_ALL});

    const handleSegmentMouseEnter = (e, seg) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setTooltip({seg, x: rect.left + rect.width / 2, y: rect.top});
    };

    const handleSegmentMouseLeave = () => setTooltip(null);

    const toggleShowMore = e => {
        stopEvent(e);
        setShowMore(!showMore);
    };

    return (
        <div className="monitoring-container">

            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="monitoring-header">
                <div className="monitoring-title">
                    <h2>{I18n.t("monitoring.title")}</h2>
                    <p>{I18n.t("monitoring.subTitle")}</p>
                </div>

                <div className="header-actions">
                    {selectedService && (
                        <div className="uptime-legend">
                            {SEVERITY_LEVELS.map(level => (
                                <span className="legend-item" key={level.cls}>
                                    <span className={`legend-swatch ${level.cls}`}/>
                                    {I18n.t(`monitoring.${level.labelKey}`)}
                                </span>
                            ))}
                        </div>
                    )}

                    {selectedService && (
                        <div className="overall-status">
                            <span className="status-label">
                                {I18n.t("monitoring.status")}&nbsp;
                                <span className={`status-dot ${status?.overallStatus ?? "operational"}`}/>
                            </span>
                            <strong>{I18n.t("monitoring.noIssues")}</strong>
                            <span className="last-update-small">
                                {I18n.t("monitoring.lastUpdate", {time: lastUpdatedText})}
                            </span>
                        </div>
                    )}

                    <div className="period-control">
                        <span className="period-label">{I18n.t("monitoring.period")}</span>
                        <SegmentedControl
                            options={[PERIOD_DEFAULT, PERIOD_ALL]}
                            option={period}
                            optionLabelResolver={p => p === PERIOD_DEFAULT
                                ? I18n.t("monitoring.period60")
                                : I18n.t("monitoring.periodAll")}
                            onClick={p => setPeriod(p)}
                        />
                    </div>
                </div>
            </div>

            {/* ── Body ───────────────────────────────────────────────────── */}
            <div className="monitoring-body">

                {/* Left: service list */}
                <div className="service-list">
                    <div className="search-bar">
                        <div className="sds--text-field sds--text-field--has-icon">
                            <div className="sds--text-field--shape">
                                <div className="sds--text-field--input-and-icon">
                                    <input
                                        className="sds--text-field--input"
                                        type="search"
                                        placeholder={I18n.t("monitoring.searchPlaceholder")}
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                    />
                                    <span className="sds--text-field--icon">
                                        <SearchIcon/>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {loading && (
                        <div className="list-loading">
                            <span className="spinner"/>
                        </div>
                    )}

                    {!loading && filteredGroups.map(group => (
                        <div className="service-group" key={group.name || "__ungrouped__"}>
                            {group.name && (
                                <div className="group-header">{group.name}</div>
                            )}
                            {group.services.map(service => {
                                const isSelected = selectedService?.id === service.id;
                                return (
                                    <div
                                        key={service.id}
                                        className={`service-item${isSelected ? " selected" : ""}`}
                                        onClick={() => selectService(isSelected ? null : service.id)}
                                    >
                                        <span className={`status-dot ${service.status}`}/>
                                        <div className="service-info">
                                            <strong>{service.name}</strong>
                                            <span>
                                                {service.uptimePercentage.toFixed(2)}% uptime
                                            </span>
                                        </div>
                                        {isSelected && (
                                            <button
                                                className="deselect-btn"
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    selectService(null);
                                                    setSearch("");
                                                }}
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>

                {/* Right: detail / empty state */}
                <div className="service-detail">
                    {!selectedService ? (
                        <div className="empty-state">
                            <div className="check-circle-large">
                                <CheckCircleIcon/>
                            </div>
                            <h3>{I18n.t("monitoring.noIssues")}</h3>
                            <p className="last-update-text">
                                {I18n.t("monitoring.lastUpdate", {time: lastUpdatedText})}
                            </p>
                            <p className="select-hint">
                                {I18n.t("monitoring.selectApp")}
                            </p>
                        </div>
                    ) : (
                        <div className="detail-view">
                            {/* Uptime heading */}
                            <h3 className="uptime-heading">
                                {I18n.t("monitoring.uptimeTitle")}&nbsp;
                                {selectedService.name}&nbsp;
                                <span className="uptime-pct">
                                    {selectedService.uptimePercentage.toFixed(2)}%
                                </span>
                            </h3>

                            {/* Uptime bar */}
                            <div className="uptime-bar">
                                {uptimeSegments.map((seg, i) => (
                                    <div
                                        key={i}
                                        className={`bar-segment ${seg.severity}`}
                                        onMouseEnter={e => handleSegmentMouseEnter(e, seg)}
                                        onMouseLeave={handleSegmentMouseLeave}
                                    />
                                ))}
                            </div>
                            {tooltip && createPortal(
                                <div
                                    className="bar-tooltip"
                                    style={{
                                        position: "fixed",
                                        left: tooltip.x,
                                        top: tooltip.y,
                                        transform: "translateX(-50%) translateY(calc(-100% - 10px))",
                                    }}
                                >
                                    <div className="bar-tooltip--date">
                                        {formatDate(tooltip.seg.segDate, true, false)}
                                    </div>
                                    <div className="bar-tooltip--uptime">
                                        {I18n.t("monitoring.tooltipUp")}&nbsp;
                                        <strong>{tooltip.seg.uptimePct.toFixed(2)}%</strong>&nbsp;
                                        {I18n.t("monitoring.tooltipOfTheTime")}
                                    </div>
                                    {tooltip.seg.severity !== "ok" && (
                                        <div className="bar-tooltip--downtime">
                                            {I18n.t("monitoring.tooltipDowntime")}&nbsp;
                                            <strong>
                                                {tooltip.seg.downtimeMin > 0
                                                    ? I18n.t("monitoring.tooltipDuration", {
                                                        min: tooltip.seg.downtimeMin,
                                                        sec: tooltip.seg.downtimeRemSec
                                                    })
                                                    : I18n.t("monitoring.tooltipDurationSec", {
                                                        sec: tooltip.seg.downtimeRemSec
                                                    })
                                                }
                                            </strong>
                                        </div>
                                    )}
                                    <div className="bar-tooltip--arrow"/>
                                </div>,
                                document.body
                            )}
                            <div className="bar-axis">
                                <span>{periodLabel}</span>
                                <span>{I18n.t("monitoring.today")}</span>
                            </div>

                            {/* Incident history */}
                            <h3 className="incidents-heading">
                                {I18n.t("monitoring.incidentHistory")}&nbsp;
                                {selectedService.name}
                            </h3>

                            {incidentGroups.length === 0 ? (
                                <p className="no-incidents">
                                    {I18n.t("monitoring.noIncidents")}
                                </p>
                            ) : (
                                <div className="incident-list">
                                    {visibleIncidentGroups.map(group => (
                                        <div key={group.date} className="incident-day">
                                            <span className="incident-date">{group.date}</span>
                                            <div className="incident-events">
                                                {group.incidents.map((inc, idx) => (
                                                    <div key={idx} className="incident-entry">
                                                        {inc.resolvedTime ? (
                                                            <>
                                                                {/* Left: icons + connector */}
                                                                <div className="entry-icons">
                                                                    <CheckCircleIcon/>
                                                                    <div className="event-connector"/>
                                                                    <WarningCircleIcon severity={inc.severity}/>
                                                                </div>
                                                                {/* Right: text rows */}
                                                                <div className="entry-texts">
                                                                    <div className="event-body">
                                                                        <span className="event-message">
                                                                            {I18n.t("monitoring.resolvedMessage", {name: selectedService.name})}
                                                                        </span>
                                                                        <span
                                                                            className="event-time">{inc.resolvedTime}</span>
                                                                    </div>
                                                                    <div className="event-body">
                                                                        {inc.message && (
                                                                            <span className="event-note">{inc.message}</span>
                                                                        )}
                                                                        <span className="event-message">
                                                                            {I18n.t("monitoring.startedMessage", {name: selectedService.name})}
                                                                        </span>
                                                                        <span
                                                                            className="event-time">{inc.startedTime}</span>
                                                                    </div>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div className="entry-icons entry-icons--single">
                                                                    <WarningCircleIcon severity={inc.severity}/>
                                                                </div>
                                                                <div className="entry-texts">
                                                                    <div className="event-body">
                                                                        {inc.message && (
                                                                            <span className="event-note">{inc.message}</span>
                                                                        )}
                                                                        <span className="event-message">
                                                                            {I18n.t("monitoring.startedMessage", {name: selectedService.name})}
                                                                        </span>
                                                                        <span
                                                                            className="event-time">{inc.startedTime}</span>
                                                                    </div>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                            )}
                            {incidentGroups.length > INCIDENT_GROUPS_NUMBER_SLICE &&
                                <a href="/#"
                                   className="show-more-toggle"
                                   onClick={e => toggleShowMore(e)}>
                                    {I18n.t(`monitoring.${showMore ? "showLess" : "showMore"}Incidents`)}
                                </a>
                            }
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};
