import "./AuditLog.scss";
import React, {useEffect, useMemo, useState} from "react";
import I18n from "../locale/I18n";
import {useAppStore} from "../stores/AppStore.js";
import {useShallow} from "zustand/react/shallow";
import {Navigate} from "react-router";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious
} from "@surfnet/curve-react";
import {
    AppWindowIcon,
    ArrowRightIcon,
    CheckCircleIcon,
    LockIcon,
    UsersThreeIcon,
    XIcon
} from "@phosphor-icons/react";
import {SearchField} from "../components/SearchField.jsx";
import SelectField from "../components/SelectField.jsx";
import {auditLog, auditLogActors, auditLogSummary} from "../api/index.js";
import {authorities} from "../utils/Permissions.js";
import {isEmpty} from "../utils/Utils.js";
import {mainMenuItems} from "../utils/MenuItems.js";
import {pageRangeWithDots} from "../utils/Pagination.js";
import {
    actionIcon,
    badgeOf,
    auditPeriods,
    diffOf,
    formatTime,
    groupByDay,
    periodRange
} from "../utils/AuditLog.js";

const PAGE_SIZE = 25;
const ALL = "ALL";

//The pending items are open tasks, they are shown on the home page
const summaryCards = [
    {category: "APPLICATION", Icon: AppWindowIcon, labelKey: "applications"},
    {category: "ACCESS", Icon: LockIcon, labelKey: "access"},
    {category: "ORGANISATION", Icon: UsersThreeIcon, labelKey: "organisation"}
];

const AuditLog = () => {
    const {user, currentOrganization} = useAppStore(useShallow(state => ({
        user: state.user,
        currentOrganization: state.currentOrganization
    })));

    const [query, setQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [days, setDays] = useState("7");
    const [actorId, setActorId] = useState(ALL);
    //The summary cards act as filters, no selected card means all categories
    const [categories, setCategories] = useState([]);
    const [pageNumber, setPageNumber] = useState(0);
    const [events, setEvents] = useState([]);
    const [totalElements, setTotalElements] = useState(0);
    const [summary, setSummary] = useState({});
    const [actors, setActors] = useState([]);
    const [loading, setLoading] = useState(true);

    const organizationId = currentOrganization?.id;
    const isOrgAdmin = user?.superUser || (user?.organizationMemberships || [])
        .some(m => m.authority === authorities.ADMIN && m.organization.id === organizationId);

    useEffect(() => {
        useAppStore.setState({
            breadcrumbPaths: [
                {path: "/home", value: I18n.t("breadCrumb.home"), menuItemName: mainMenuItems.home},
                {value: I18n.t("breadCrumb.auditLog")}
            ]
        });
    }, []);

    useEffect(() => {
        const timeout = setTimeout(() => {
            setDebouncedQuery(query);
            setPageNumber(0);
        }, 300);
        return () => clearTimeout(timeout);
    }, [query]);

    useEffect(() => {
        if (organizationId && isOrgAdmin) {
            auditLogActors(organizationId).then(setActors).catch(() => setActors([]));
        }
    }, [organizationId, isOrgAdmin]);

    useEffect(() => {
        if (!organizationId || !isOrgAdmin) {
            return;
        }
        let cancelled = false;
        const {from, to} = periodRange(auditPeriods[days]);
        Promise.all([
            auditLog(organizationId, {
                from,
                to,
                pageNumber,
                pageSize: PAGE_SIZE,
                query: debouncedQuery,
                actorId: actorId === ALL ? null : actorId,
                category: categories
            }),
            auditLogSummary(organizationId, {from, to, actorId: actorId === ALL ? null : actorId})
        ]).then(([page, summaryResult]) => {
            if (!cancelled) {
                setEvents(page.content || []);
                setTotalElements(page.totalElements || 0);
                setSummary(summaryResult || {});
                setLoading(false);
            }
        }).catch(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, [organizationId, isOrgAdmin, days, actorId, categories, debouncedQuery, pageNumber]);

    const groups = useMemo(() => groupByDay(events), [events]);

    if (!isOrgAdmin) {
        return <Navigate to="/404" replace/>;
    }

    const toggleCategory = key => {
        setCategories(current => current.includes(key) ? current.filter(c => c !== key) : [...current, key]);
        setPageNumber(0);
    };

    const changeFilter = setter => option => {
        setter(option.value);
        setPageNumber(0);
    };

    const periodOptions = Object.keys(auditPeriods).map(key => ({
        value: key,
        label: I18n.t("auditLog.periods.last", {days: key})
    }));
    const actorOptions = [{value: ALL, label: I18n.t("auditLog.filters.allActors")},
        ...actors.map(actor => ({value: String(actor.id), label: actor.name}))];

    //The actor is a filter like the categories, it is shown in the active filters
    const actor = actors.find(a => String(a.id) === actorId);
    const actorLabel = I18n.t("auditLog.filters.actor", {name: actor?.name || ""});
    const hasActiveFilters = !isEmpty(categories) || actorId !== ALL;

    const dayLabel = date => {
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        const sameDay = (a, b) => a.toDateString() === b.toDateString();
        const full = date.toLocaleDateString(I18n.locale, {weekday: "long", day: "numeric", month: "long"});
        if (sameDay(date, today)) {
            return {title: I18n.t("auditLog.today"), subtitle: full};
        }
        if (sameDay(date, yesterday)) {
            return {title: I18n.t("auditLog.yesterday"), subtitle: full};
        }
        const [weekday, ...rest] = full.split(" ");
        return {title: weekday.charAt(0).toUpperCase() + weekday.slice(1), subtitle: rest.join(" ")};
    };

    const eventParams = event => ({
        target: event.targetName || "",
        actor: event.actorName || I18n.t("auditLog.system"),
        ...(event.details || {})
    });

    const renderDiffValue = value => {
        const key = `auditLog.values.${value}`;
        return I18n.t(key, {defaultValue: String(value)});
    };

    const renderEvent = event => {
        const Icon = actionIcon(event.action);
        const params = eventParams(event);
        const diff = diffOf(event);
        const badge = badgeOf(event);
        return (
            <div className="audit-event" key={event.id}>
                <span className="time">{formatTime(event.date)}</span>
                <span className={`icon cat-${event.category.toLowerCase()}`}><Icon/></span>
                <div className="what">
                    <span className="title">{I18n.t(`auditLog.events.${event.action}.title`, params)}</span>
                    <span className="description">{I18n.t(`auditLog.events.${event.action}.description`, params)}</span>
                    {diff && <span className="diff">
                        {diff.field && <span>{I18n.t(`auditLog.fields.${diff.field}`)}:</span>}
                        <span>{renderDiffValue(diff.from)}</span>
                        <ArrowRightIcon/>
                        <span>{renderDiffValue(diff.to)}</span>
                    </span>}
                </div>
                <span className="actor">{params.actor}</span>
                <span className={`badge ${badge.className}`}>{I18n.t(badge.labelKey)}</span>
            </div>
        );
    };

    const nbrPages = Math.ceil(totalElements / PAGE_SIZE);
    const page = pageNumber + 1;
    const goTo = (e, number) => {
        e.preventDefault();
        setPageNumber(number - 1);
    };
    const first = totalElements === 0 ? 0 : pageNumber * PAGE_SIZE + 1;
    const last = Math.min((pageNumber + 1) * PAGE_SIZE, totalElements);

    return (
        <div className="audit-log-container">
            <h1 className="text-[length:var(--text-2xl-font-size)] mb-3.5">{I18n.t("auditLog.title")}</h1>
            <p className="intro">{I18n.t("auditLog.intro")}</p>

            <div className="filters">
                <SearchField value={query}
                             onChange={e => setQuery(e.target.value)}
                             placeholder={I18n.t("auditLog.filters.search")}/>
                <SelectField value={periodOptions.find(option => option.value === days)}
                             options={periodOptions}
                             onChange={option => {
                                 setDays(option.value);
                                 setPageNumber(0);
                             }}/>
                <SelectField value={actorOptions.find(option => option.value === actorId)}
                             options={actorOptions}
                             onChange={changeFilter(setActorId)}/>
            </div>

            <div className="summary">
                {summaryCards.map(({category: key, Icon, labelKey}) => {
                    const active = categories.includes(key);
                    const count = summary[key] ?? 0;
                    return (
                        <button type="button"
                                className={`card cat-${key.toLowerCase()} ${active ? "active" : ""} ${count === 0 ? "empty" : ""}`}
                                key={key}
                                aria-pressed={active}
                                onClick={() => toggleCategory(key)}>
                            <span className="card-header">
                                <span className="card-label">
                                    {active && <CheckCircleIcon weight="fill" className="check"/>}
                                    <span>{I18n.t(`auditLog.summary.${labelKey}`)}</span>
                                </span>
                                <span className={`icon cat-${key.toLowerCase()}`}><Icon/></span>
                            </span>
                            <span className="count">{count}</span>
                            <span className="unit">{I18n.t("auditLog.summary.changes")}</span>
                        </button>
                    );
                })}
            </div>

            {hasActiveFilters && <div className="active-filters">
                <span className="label">{I18n.t("auditLog.filters.activeFilters")}</span>
                {categories.map(key => (
                    <span className="filter-badge" key={key}>
                        {I18n.t(`auditLog.categories.${key}`)}
                        <button type="button"
                                aria-label={I18n.t("auditLog.filters.removeFilter", {filter: I18n.t(`auditLog.categories.${key}`)})}
                                onClick={() => toggleCategory(key)}>
                            <XIcon/>
                        </button>
                    </span>
                ))}
                {actorId !== ALL && <span className="filter-badge">
                    {actorLabel}
                    <button type="button"
                            aria-label={I18n.t("auditLog.filters.removeFilter", {filter: actorLabel})}
                            onClick={() => {
                                setActorId(ALL);
                                setPageNumber(0);
                            }}>
                        <XIcon/>
                    </button>
                </span>}
                <button type="button" className="clear" onClick={() => {
                    setCategories([]);
                    setActorId(ALL);
                    setPageNumber(0);
                }}>{I18n.t("auditLog.filters.clearFilters")}</button>
                <span className="spacer"/>
                <span className="label">{I18n.t("auditLog.eventCount", {count: totalElements})}</span>
            </div>}

            <div className="events">
                {isEmpty(groups) && <p className="empty">{loading ? "" : I18n.t("auditLog.empty")}</p>}
                {groups.map(group => {
                    const label = dayLabel(group.date);
                    return (
                        <section key={group.key}>
                            <div className="day">
                                <span className="day-title">{label.title}</span>
                                <span className="day-subtitle">· {label.subtitle}</span>
                                <span className="day-count">{I18n.t("auditLog.eventCount", {count: group.events.length})}</span>
                            </div>
                            {group.events.map(renderEvent)}
                        </section>
                    );
                })}
            </div>

            {totalElements > 0 && <div className="pagination-row">
                <span className="range">{I18n.t("auditLog.range", {first, last, total: totalElements})}</span>
                {nbrPages > 1 && <Pagination>
                    <PaginationContent>
                        {page !== 1 && <PaginationItem>
                            <PaginationPrevious href="#" text={I18n.t("pagination.previous")}
                                                onClick={e => goTo(e, page - 1)}/>
                        </PaginationItem>}
                        {pageRangeWithDots(page, nbrPages).map((nbr, index) =>
                            <PaginationItem key={`${nbr}_${index}`}>
                                {typeof nbr === "string" ? <PaginationEllipsis/> :
                                    <PaginationLink href="#" isActive={nbr === page}
                                                    aria-current={nbr === page ? "page" : undefined}
                                                    onClick={e => goTo(e, nbr)}>{nbr}</PaginationLink>}
                            </PaginationItem>)}
                        {page !== nbrPages && <PaginationItem>
                            <PaginationNext href="#" text={I18n.t("pagination.next")}
                                            onClick={e => goTo(e, page + 1)}/>
                        </PaginationItem>}
                    </PaginationContent>
                </Pagination>}
            </div>}
        </div>
    );
};

export default AuditLog;
