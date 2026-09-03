import "./ChangeRequests.scss";
import React, {Fragment, useState} from "react";
import I18n from "../locale/I18n";
import {Chip, ChipType} from "../components/Chip.jsx";
import {Button} from "@surfnet/curve-react";
import {format} from 'jsondiffpatch/formatters/html';
import 'jsondiffpatch/formatters/styles/html.css';
import DOMPurify from "dompurify";
import {formatLongDate} from "../utils/Date.js";
import {create} from "jsondiffpatch";
import {stopEvent, sanitize} from "../utils/Utils.js";
import {revokeChangeRequest} from "../api/index.js";
import {useAppStore} from "../stores/AppStore.js";


export const ChangeRequests = ({
                                   connectionName,
                                   metaData,
                                   changeRequests,
                                   setConfirmation,
                                   setLoading,
                                   refresh,
                                   arpInfo
                               }) => {
    const setFlash = useAppStore(state => state.setFlash);

    const [isJsonDiffOpen, setIsJsonDiffOpen] = useState({});

    const diffPatcher = create({
        arrays: {detectMove: true, includeValueOnMove: false},
        // https://github.com/benjamine/jsondiffpatch/blob/HEAD/docs/arrays.md
        objectHash: (obj, index) => obj.name || obj.level || obj.type || obj.source || obj.value || '$$index:' + index
    });

    const diffChangeRequest = changeRequest => {
        const changeRequestMerged = {...metaData, ...changeRequest};
        //avoid false negatives about what has been changed
        ["auditData", "created", "id", "type", "metaDataId"].forEach(attr => delete changeRequestMerged[attr])
        return diffPatcher.diff(metaData, changeRequestMerged)
    }

    const toggleIsJsonDiffOpen = (e, changeRequest) => {
        stopEvent(e);
        const currentDisplay = isJsonDiffOpen[changeRequest.id] || false;
        setIsJsonDiffOpen({...isJsonDiffOpen,  [changeRequest.id]: !currentDisplay});
    }

    const doRevokeChangeRequest = (confirmationRequired, changeRequest) => {
        if (confirmationRequired) {
            setConfirmation({
                open: true,
                cancel: () => setConfirmation({open: false}),
                header: I18n.t("changeRequests.revoke"),
                question: I18n.t("changeRequests.revokeConfirmation"),
                action: () => doRevokeChangeRequest(false, changeRequest),
                modal: null,
                okButton: I18n.t("changeRequests.revoke")
            });
        } else {
            setLoading(true);
            revokeChangeRequest(changeRequest).then(() => {
                refresh();
                setConfirmation({open: false});
                setLoading(false);
                setFlash(I18n.t("changeRequests.revoked", {
                    name: connectionName
                }));
            })
        }
    }

    const renderChangeRequest = (changeRequest, index) => {
        const auditData = changeRequest.auditData;
        const created = changeRequest.created;
        const delta = diffChangeRequest(changeRequest);
        //We need to sanitize the HTML to avoid XSS
        const ticketKey = changeRequest.ticketKey;
        delete changeRequest["ticketKey"];
        const htmlDiff = DOMPurify.sanitize(format(delta, metaData));
        return (
            <div className="card change-request" key={index}>
                <div className="top-container">
                    <div className="audit-data">
                        <p className="ticket-number">{ticketKey}</p>
                        <p className="user">{auditData.user}</p>
                        <p className="created">{formatLongDate(created)}</p>
                    </div>
                    <div className="meta">
                        <Chip type={ChipType.Status_info} className={"open"}
                              label={I18n.t("changeRequests.open")}/>
                        <Button variant="destructive"
                                onClick={() => doRevokeChangeRequest(true, changeRequest)}>
                            <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("changeRequests.revoke"))}}/>
                        </Button>
                    </div>
                </div>
                <div className="changes">
                    {deltaToText(delta)}
                </div>
                <div className="change-request-toggle">
                    <a href="/" onClick={e => toggleIsJsonDiffOpen(e, changeRequest )}>
                        {I18n.t(`changeRequests.${isJsonDiffOpen[changeRequest.id] ? "hide" : "show"}`)}
                    </a>
                </div>
                {isJsonDiffOpen[changeRequest.id] &&
                    <div className="jsondiffpatch-unchanged-hidden" dangerouslySetInnerHTML={{__html: htmlDiff}}/>}
            </div>
        );
    }

    const translateARPKey = arpKey => {
        return arpInfo.attributes.find(attr => attr.urn === arpKey).friendlyNames[I18n.locale];
    }

    const actions = {
        added: "added",
        removed: "removed",
        changed: "changed",
        array_added: "array_added",
        array_removed: "array_removed",
        array_changed: "array_changed"
    }

    const enumerations = ["visibility", "connectOption", "grantTypes"]

    const formatLogicalValue = (attribute, change, value) => {
        if (attribute === "arp") {
            if (change.path[1] !== "attributes") {
                return value;
            }
            const friendlyName = translateARPKey(change.path[2]);
            if (change.path.length > 3) {
                const fieldKey = change.path[change.path.length - 1];
                const fieldLabel = I18n.t(`changeRequests.${fieldKey}`, {defaultValue: fieldKey});
                return `${friendlyName} - ${fieldLabel} - ${value}`;
            }
            return friendlyName;
        }
        if (enumerations.includes(attribute)) {
            return I18n.t(`changeRequests.${value}`);
        }
        return value.toString();
    }

    const formatValue = (attribute, change, isOld) => {
        switch (change.type) {
            case actions.added:
            case actions.array_added:
                return formatLogicalValue(attribute, change, change.newValue);
            case actions.removed:
            case actions.array_removed:
                return formatLogicalValue(attribute, change, change.oldValue);
            case actions.changed:
            case actions.array_changed:
                return formatLogicalValue(attribute, change, isOld ? change.oldValue : change.newValue);
        }
    }

    const translateAttribute = attribute => {
        return I18n.t(`changeRequests.${attribute}`);
    }

    const translateAction = (change, isOldValue) => {
        let actionLabel;
        if (change.type === actions.changed || change.type === actions.array_changed) {
            actionLabel = I18n.t(`changeRequests.actions.${isOldValue ? "oldValue" : "newValue"}`);
        } else {
            actionLabel = I18n.t(`changeRequests.actions.${change.type}`);
        }
        if (change.path[0] === "arp") {
            actionLabel += " " + I18n.t(`changeRequests.${change.path[1]}`)
        }
        return actionLabel;
    }

    const formatChange = (attribute, changes) => {
        return (
            <div className="change-request-key">
                <h5>{translateAttribute(attribute)}</h5>
                {changes.map((change, index) => {
                    const displayBothNewOld = change.type === actions.changed || change.type === actions.array_changed;
                    return (
                        <Fragment key={index}>
                            <span>
                            {`→ ${translateAction(change, true)} `}
                                <span className="attribute-value">{formatValue(attribute, change, true)}</span>
                            </span>
                            {displayBothNewOld &&
                                <span>
                            {`→ ${translateAction(change, false)} `}
                                    <span className="attribute-value">{formatValue(attribute, change, false)}</span>
                            </span>
                            }
                        </Fragment>
                    );
                })}
            </div>
        );
    }


    const extractChanges = (delta, path = [], changes = []) => {
        if (typeof delta !== "object" || delta === null) {
            return changes;
        }

        const isArrayDiff = delta._t === "a";

        for (const key in delta) {
            if (key === "_t") {
                continue;
            }

            const currentPath = [...path, key];
            const value = delta[key];

            if (isArrayDiff) {
                // key starting with '_' = removal
                if (key.startsWith("_")) {
                    const idx = key.substring(1);
                    changes.push({
                        path: [...path, idx],
                        type: actions.array_removed,
                        oldValue: value[0],
                    });
                } else if (Array.isArray(value)) {
                    if (value.length === 1) {
                        // added
                        changes.push({
                            path: [...path, key],
                            type: actions.array_added,
                            newValue: value[0],
                        });
                    } else if (value.length === 2) {
                        // changed element
                        changes.push({
                            path: [...path, key],
                            type: actions.array_changed,
                            oldValue: value[0],
                            newValue: value[1],
                        });
                    }
                } else if (typeof value === "object" && value !== null) {
                    // nested delta within an array element (e.g. a sub-property changed)
                    extractChanges(value, currentPath, changes);
                }
                continue;
            }

            // Handle normal value diffs
            if (Array.isArray(value)) {
                if (value.length === 1) {
                    changes.push({path: currentPath, type: actions.added, newValue: value[0]});
                } else if (value.length === 2) {
                    changes.push({
                        path: currentPath,
                        type: actions.changed,
                        oldValue: value[0],
                        newValue: value[1],
                    });
                } else if (value.length === 3 && value[2] === 0) {
                    changes.push({path: currentPath, type: actions.removed, oldValue: value[0]});
                }
            } else if (typeof value === "object") {
                extractChanges(value, currentPath, changes);
            }
        }

        return changes;
    }

    const deltaToText = delta => {
        const changes = extractChanges(delta);
        const grouped = Object.groupBy(changes, change => change.path[0]);
        const keys = Object.keys(grouped).sort();
        return keys.filter(key => key !== "secret" && key !== "ticketKey").map(key => formatChange(key, grouped[key]))
    }

    return (
        <section className="inner-right change-requests">
            <h3 className="text-[length:var(--text-lg-font-size)]">{I18n.t("connection.pendingChanges")}</h3>
            <div className="info">
                <p dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("changeRequests.info1"))}}/>
                <p dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("changeRequests.info2"))}}/>
            </div>
            {(changeRequests || [])
                .sort((cr1, cr2) => new Date(cr2.created) - new Date(cr1.created))
                .map((changeRequest, index) => renderChangeRequest(changeRequest, index))}
        </section>
    );
}
