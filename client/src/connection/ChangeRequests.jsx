import "./ChangeRequests.scss";
import React, {useState} from "react";
import I18n from "../locale/I18n";
import {Button, ButtonType, Chip, ChipType} from "@surfnet/sds";
import {format} from 'jsondiffpatch/formatters/html';
import 'jsondiffpatch/formatters/styles/html.css';
import DOMPurify from "dompurify";
import {formatLongDate} from "../utils/Date.js";
import {deltaToText} from "../utils/ChangeRequests.js";
import {create} from "jsondiffpatch";
import {stopEvent} from "../utils/Utils.js";
import {revokeChangeRequest} from "../api/index.js";
import {useAppStore} from "../stores/AppStore.js";


export const ChangeRequests = ({
                                   metaData,
                                   changeRequests,
                                   setConfirmation,
                                   setLoading,
                                   refresh
                               }) => {
    const {setFlash} = useAppStore(state => state);

    const [isJsonDiffOpen, setIsJsonDiffOpen] = useState(false);

    const diffPatcher = create({
        // https://github.com/benjamine/jsondiffpatch/blob/HEAD/docs/arrays.md
        objectHash: (obj, index) => obj.name || obj.level || obj.type || obj.source || obj.value || '$$index:' + index
    });

    const diffChangeRequest = changeRequest => {
        const changeRequestMerged = {...metaData, ...changeRequest};
        //avoid false negatives about what has been changed
        ["auditData", "created", "id", "type", "metaDataId"].forEach(attr => delete changeRequestMerged[attr])
        return diffPatcher.diff(metaData, changeRequestMerged)
    }

    const toggleIsJsonDiffOpen = e => {
        stopEvent(e);
        setIsJsonDiffOpen(!isJsonDiffOpen);
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
                    name: connection.name
                }));
            })
        }
    }

    const renderChangeRequest = (changeRequest, index) => {
        const auditData = changeRequest.auditData;
        const jiraIssue = auditData.notes.match(/\b[A-Z]{2,10}-\d+\b/);
        const created = changeRequest.created;
        const delta = diffChangeRequest(changeRequest);
        const changes = deltaToText(delta);
        //We need to sanitize the html to avoid XSS
        const htmlDiff = DOMPurify.sanitize(format(delta, metaData));
        return (
            <div className="card change-request" key={index}>
                <div className="top-container">
                    <div className="audit-data">
                        <p className="ticket-number">{jiraIssue[0]}</p>
                        <p className="user">{auditData.user}</p>
                        <p className="created">{formatLongDate(created)}</p>
                    </div>
                    <div className="meta">
                        <Chip type={ChipType.Status_info} className={"open"}
                              label={I18n.t("changeRequests.open")}/>
                        <Button type={ButtonType.DestructiveSecondary}
                                onClick={() => doRevokeChangeRequest(true, changeRequest)}
                                txt={I18n.t("changeRequests.revoke")}/>
                    </div>
                </div>
                <div className="changes">
                    {changes.map((change, index) =>
                        <p key={index}>{change}</p>
                    )}
                </div>
                <div className="change-request-toggle">
                    <a href="/" onClick={e => toggleIsJsonDiffOpen(e)}>
                        {I18n.t(`changeRequests.${isJsonDiffOpen ? "hide" : "show"}`)}
                    </a>
                </div>
                {isJsonDiffOpen &&
                    <div className="jsondiffpatch-unchanged-hidden" dangerouslySetInnerHTML={{__html: htmlDiff}}/>}
            </div>
        );

    }

    return (
        <section className="inner-right change-requests">
            <h3>{I18n.t("connection.pendingChanges")}</h3>
            <div className="info">
                <p dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("changeRequests.info1"))}}/>
                <p dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("changeRequests.info2"))}}/>
            </div>
            {changeRequests
                .sort((cr1, cr2) => new Date(cr2.created) - new Date(cr1.created))
                .map((changeRequest, index) => renderChangeRequest(changeRequest, index))}
        </section>
    );
}
