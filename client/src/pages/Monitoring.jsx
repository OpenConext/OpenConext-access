import React, {useEffect, useState, useMemo} from "react";
import {createPortal} from "react-dom";
import "./Monitoring.scss";
import {monitoring} from "../api/index.js";
import I18n from "../locale/I18n.js";
import SearchIcon from "@surfnet/sds/icons/functional-icons/search.svg";
import SegmentedControl from "../components/SegmentedControl.jsx";
import {formatDate} from "../utils/Date.js";

// Configurable: incidents shorter than this many minutes are ignored
const MIN_INCIDENT_MINUTES = 10;

// Period constants
const PERIOD_DEFAULT = 60;
const PERIOD_ALL = 364;

// Number of bar segments in the uptime chart
const SEGMENT_COUNT = 90;

// ─── helpers ──────────────────────────────────────────────────────────────────

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
    const segMs = (now - startMs) / SEGMENT_COUNT;

    return Array.from({length: SEGMENT_COUNT}, (_, i) => {
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

        const hasIncident = downtimeMs > 0;
        const uptimePct = 100 - (downtimeMs / segMs) * 100;

        // Tooltip date: use the midpoint of the segment
        const midMs = segStart + segMs / 2;
        const segDate = new Date(midMs);

        // Downtime in minutes + seconds for tooltip
        const downtimeSec = Math.round(downtimeMs / 1000);
        const downtimeMin = Math.floor(downtimeSec / 60);
        const downtimeRemSec = downtimeSec % 60;

        return {hasIncident, uptimePct, segDate, downtimeMin, downtimeRemSec};
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

function groupIncidentsByDate(incidents) {
    const significant = incidents.filter(isSignificant);
    const byDate = {};

    significant.forEach(inc => {
        const d = parseDateStr(inc.startedAt);
        const label = formatDate(d, true, false);
        if (!byDate[label]) byDate[label] = [];
        byDate[label].push({
            startedTime: formatDate(parseDateStr(inc.startedAt), true, true),
            resolvedTime: inc.resolvedAt ? formatDate(parseDateStr(inc.resolvedAt), true, true) : null,
            startedDate: d,
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

function CheckCircleIcon({small}) {
    const size = small ? 22 : 28;
    return (
        <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="14" cy="14" r="14" fill="#d4edda"/>
            <path d="M8 14.5l4 4 8-8" stroke="#2e7d32" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    );
}

function WarningCircleIcon() {
    return (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="11" cy="11" r="11" fill="#fff3cd"/>
            <path d="M11 6v6" stroke="#856404" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="11" cy="15.5" r="1.2" fill="#856404"/>
        </svg>
    );
}

// ─── component ────────────────────────────────────────────────────────────────

export const Monitoring = () => {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedService, setSelectedService] = useState(null);
    const [period, setPeriod] = useState(PERIOD_DEFAULT);
    const [search, setSearch] = useState("");
    const [tooltip, setTooltip] = useState(null);

    useEffect(() => {
        setLoading(true);
        setSelectedService(null);
        monitoring(period)
            .then(data => {
                setStatus(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [period]);

    useEffect(() => {
        if (!status || !selectedService) return;
        for (const group of status.groups) {
            const found = group.services.find(s => s.id === selectedService.id);
            if (found) {
                setSelectedService(found);
                return;
            }
        }
    }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

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

    return (
        <div className="monitoring-container">

            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="monitoring-header">
                <div className="monitoring-title">
                    <h2>{I18n.t("monitoring.title")}</h2>
                    <p>{I18n.t("monitoring.subTitle")}</p>
                </div>

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
                                        onClick={() => setSelectedService(isSelected ? null : service)}
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
                                                    setSelectedService(null);
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
                                        className={`bar-segment ${seg.hasIncident ? "incident" : "ok"}`}
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
                                    {tooltip.seg.hasIncident && (
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
                                    {incidentGroups.map(group => (
                                        <div key={group.date} className="incident-day">
                                            <span className="incident-date">{group.date}</span>
                                            <div className="incident-events">
                                                {group.incidents.map((inc, idx) => (
                                                    <React.Fragment key={idx}>
                                                        {inc.resolvedTime && (
                                                            <div className="event resolved">
                                                                <span className="event-icon">
                                                                    <CheckCircleIcon small/>
                                                                </span>
                                                                <div className="event-body">
                                                                    <span className="event-message">
                                                                        {I18n.t("monitoring.resolvedMessage", {name: selectedService.name})}
                                                                    </span>
                                                                    <span className="event-time">{inc.resolvedTime}</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div className="event started">
                                                            <span className="event-icon">
                                                                <WarningCircleIcon/>
                                                            </span>
                                                            <div className="event-body">
                                                                <span className="event-message">
                                                                    {I18n.t("monitoring.startedMessage", {name: selectedService.name})}
                                                                </span>
                                                                <span className="event-time">{inc.startedTime}</span>
                                                            </div>
                                                        </div>
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};
