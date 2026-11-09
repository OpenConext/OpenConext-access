import {
    AppWindowIcon,
    CheckCircleIcon,
    ClockClockwiseIcon,
    XCircleIcon,
    ChatCenteredTextIcon,
    KeyIcon,
    LinkIcon,
    LinkBreakIcon,
    LockIcon,
    ShieldCheckIcon,
    BuildingIcon,
    EnvelopeSimpleIcon,
    FileTextIcon,
    UserCheckIcon,
    UserGearIcon,
    UserMinusIcon,
    UserPlusIcon
} from "@phosphor-icons/react";

export const auditCategories = ["APPLICATION", "ACCESS", "ORGANISATION", "PENDING"];

export const auditPeriods = {
    "7": 7,
    "30": 30,
    "90": 90,
    "365": 365
};

const actionIcons = {
    INVITATION_SENT: EnvelopeSimpleIcon,
    INVITATION_RESENT: EnvelopeSimpleIcon,
    INVITATION_ACCEPTED: UserCheckIcon,
    INVITATION_DELETED: EnvelopeSimpleIcon,
    JOIN_REQUEST_CREATED: UserPlusIcon,
    JOIN_REQUEST_APPROVED: UserCheckIcon,
    JOIN_REQUEST_DENIED: UserMinusIcon,
    MEMBER_REMOVED: UserMinusIcon,
    MEMBER_AUTHORITY_CHANGED: UserGearIcon,
    APPLICATION_MEMBER_ADDED: UserPlusIcon,
    APPLICATION_MEMBER_REMOVED: UserMinusIcon,
    ORGANISATION_UPDATED: BuildingIcon,
    ORGANISATION_METADATA_UPDATED: BuildingIcon,
    CONTRACT_REQUESTED: FileTextIcon,
    CONTRACT_UPDATED: FileTextIcon,
    APPLICATION_CREATED: AppWindowIcon,
    APPLICATION_UPDATED: AppWindowIcon,
    APPLICATION_DELETED: AppWindowIcon,
    CONNECTION_CREATED: LinkIcon,
    CONNECTION_UPDATED: LinkIcon,
    CONNECTION_DELETED: LinkBreakIcon,
    CONNECTION_SECRET_RESET: KeyIcon,
    PRODUCTION_REQUESTED: AppWindowIcon,
    APPLICATION_CONNECTED: LinkIcon,
    APPLICATION_DISCONNECTED: LinkBreakIcon,
    POLICY_CREATED: LockIcon,
    POLICY_UPDATED: LockIcon,
    POLICY_DELETED: LockIcon,
    CONSENT_UPDATED: ChatCenteredTextIcon,
    ASSURANCE_UPDATED: ShieldCheckIcon,
    CHANGE_REQUEST_SUBMITTED: ClockClockwiseIcon,
    CHANGE_REQUEST_APPLIED: CheckCircleIcon,
    CHANGE_REQUEST_REJECTED: XCircleIcon,
    CHANGE_REQUEST_CANCELLED: XCircleIcon,
    CHANGE_REQUEST_RESOLVED: CheckCircleIcon
};

export const actionIcon = action => actionIcons[action] || AppWindowIcon;

const pad = number => String(number).padStart(2, "0");

//The events are grouped by the local day of the viewer
export const dayKey = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const formatTime = date => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

//Events are expected newest first, the order is kept
export const groupByDay = events => {
    const groups = [];
    events.forEach(event => {
        const date = new Date(event.createdAt);
        const key = dayKey(date);
        let group = groups[groups.length - 1];
        if (!group || group.key !== key) {
            group = {key: key, date: date, events: []};
            groups.push(group);
        }
        group.events.push({...event, date: date});
    });
    return groups;
}

//The period is a number of days back, ending now
export const periodRange = (days, now = new Date()) => {
    const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return {from: from.toISOString(), to: new Date(now.getTime() + 60 * 1000).toISOString()};
}

//A before -> after change, or null when the event has none
export const diffOf = event => {
    const details = event.details;
    if (!details || details.from === undefined || details.to === undefined) {
        return null;
    }
    return {field: details.field, from: details.from, to: details.to};
}

//A change request event that is no longer pending shows its outcome, not the "pending" category
export const badgeOf = event => {
    if (event.action === "CHANGE_REQUEST_SUBMITTED" && event.status && event.status !== "PENDING") {
        return {className: "cat-application", labelKey: `auditLog.status.${event.status}`};
    }
    return {className: `cat-${event.category.toLowerCase()}`, labelKey: `auditLog.categories.${event.category}`};
}
