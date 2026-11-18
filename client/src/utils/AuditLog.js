import {
    AppWindowIcon,
    ArrowCounterClockwiseIcon,
    BuildingIcon,
    CheckCircleIcon,
    CheckSquareIcon,
    EnvelopeOpenIcon,
    EnvelopeSimpleIcon,
    FileTextIcon,
    GitMergeIcon,
    GitPullRequestIcon,
    HandshakeIcon,
    KeyIcon,
    LinkIcon,
    LinkBreakIcon,
    LockIcon,
    PencilSimpleIcon,
    ProhibitIcon,
    RocketLaunchIcon,
    ShieldCheckIcon,
    TrashIcon,
    UserCircleCheckIcon,
    UserCircleGearIcon,
    UserCircleMinusIcon,
    UserCirclePlusIcon,
    XCircleIcon
} from "@phosphor-icons/react";

export const auditPeriods = {
    "7": 7,
    "30": 30,
    "90": 90,
    "365": 365
};

const actionIcons = {
    INVITATION_SENT: EnvelopeSimpleIcon,
    INVITATION_RESENT: EnvelopeSimpleIcon,
    INVITATION_ACCEPTED: EnvelopeOpenIcon,
    INVITATION_DELETED: ProhibitIcon,
    JOIN_REQUEST_CREATED: UserCirclePlusIcon,
    JOIN_REQUEST_APPROVED: UserCircleCheckIcon,
    JOIN_REQUEST_DENIED: ProhibitIcon,
    MEMBER_REMOVED: UserCircleMinusIcon,
    MEMBER_AUTHORITY_CHANGED: UserCircleGearIcon,
    APPLICATION_MEMBER_ADDED: UserCirclePlusIcon,
    APPLICATION_MEMBER_REMOVED: UserCircleMinusIcon,
    ORGANISATION_UPDATED: BuildingIcon,
    ORGANISATION_METADATA_UPDATED: BuildingIcon,
    CONTRACT_REQUESTED: FileTextIcon,
    CONTRACT_UPDATED: FileTextIcon,
    APPLICATION_CREATED: AppWindowIcon,
    APPLICATION_UPDATED: PencilSimpleIcon,
    APPLICATION_DELETED: TrashIcon,
    CONNECTION_CREATED: LinkIcon,
    CONNECTION_UPDATED: LinkIcon,
    CONNECTION_DELETED: LinkBreakIcon,
    CONNECTION_SECRET_RESET: KeyIcon,
    PRODUCTION_REQUESTED: CheckSquareIcon,
    APPLICATION_CONNECTED: RocketLaunchIcon,
    APPLICATION_DISCONNECTED: XCircleIcon,
    POLICY_CREATED: LockIcon,
    POLICY_UPDATED: LockIcon,
    POLICY_DELETED: LockIcon,
    CONSENT_UPDATED: HandshakeIcon,
    ASSURANCE_UPDATED: ShieldCheckIcon,
    CHANGE_REQUEST_SUBMITTED: GitPullRequestIcon,
    CHANGE_REQUEST_APPLIED: GitMergeIcon,
    CHANGE_REQUEST_REJECTED: XCircleIcon,
    CHANGE_REQUEST_CANCELLED: ArrowCounterClockwiseIcon,
    CHANGE_REQUEST_RESOLVED: CheckCircleIcon
};

export const actionIcon = action => actionIcons[action] || AppWindowIcon;

const pad = number => String(number).padStart(2, "0");

//The events are grouped by the local day of the viewer
export const dayKey = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const formatTime = date => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

//The server serializes an Instant as epoch seconds (with a fraction), an ISO string is also accepted
export const toDate = value => typeof value === "number" ? new Date(value * 1000) : new Date(value);

//Newest first, the events are grouped by day
export const groupByDay = events => {
    const groups = [];
    const sorted = [...events].sort((a, b) => toDate(b.createdAt) - toDate(a.createdAt));
    sorted.forEach(event => {
        const date = toDate(event.createdAt);
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
