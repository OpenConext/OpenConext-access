import "./PolicyOverview.scss";
import "../styles/access_card.scss";
import React, {useState} from "react";
import {Button, ButtonType, Chip, Tooltip} from "@surfnet/sds";
import I18n from "../locale/I18n.js";
import {InfoBlock} from "../components/InfoBlock.jsx";
import {isEmpty} from "../utils/Utils.js";
import PencilIcon from "@surfnet/sds/icons/functional-icons/pencil.svg";
import TrashIcon from "@surfnet/sds/icons/functional-icons/bin.svg";
import PauseIcon from "../icons/pause.svg";
import ActivateIcon from "../icons/play.svg";
import {deletePolicy, updatePolicy} from "../api/index.js";
import {useAppStore} from "../stores/AppStore.js";
import {useShallow} from "zustand/react/shallow";
import ConfirmationDialog from "../components/ConfirmationDialog.jsx";
import {policyBreakDowwn} from "../utils/Policy.js";

export const PolicyOverview = ({policies, backToAccess, policyDetails, refreshPolicies}) => {

    const {setFlash, allowedAttributes} = useAppStore(useShallow(state => ({
        setFlash: state.setFlash,
        allowedAttributes: state.allowedAttributes
    })));

    const [confirmation, setConfirmation] = useState({});

    const doDeletePolicy = (confirmationRequired, policy) => {
        if (confirmationRequired) {
            setConfirmation({
                open: true,
                cancel: () => setConfirmation({open: false}),
                action: () => doDeletePolicy(false, policy),
                question: I18n.t("appAccess.confirmation.deleteQuestion"),
                okButton: I18n.t("forms.delete")
            });
        } else {
            deletePolicy(policy)
                .then(() => {
                    setConfirmation({});
                    refreshPolicies();
                    setFlash(I18n.t("appAccess.flash.deleted", {
                        name: policy.data.name
                    }));
                })
        }
    }

    const doUpdatePolicy = (confirmationRequired, policy, activate) => {
        if (confirmationRequired) {
            setConfirmation({
                open: true,
                cancel: () => setConfirmation({open: false}),
                action: () => doUpdatePolicy(false, policy, activate),
                question: I18n.t(`appAccess.confirmation.${activate ? "activateQuestion" : "pauseQuestion"}`),
                okButton: I18n.t(`appAccess.${activate ? "activate" : "pause"}`)
            });
        } else {
            const updates = {active: !policy.data.active}
            const newPolicy = {...policy, data: {...policy.data, ...updates}}
            updatePolicy(newPolicy)
                .then(() => {
                    setConfirmation({});
                    refreshPolicies();
                    setFlash(I18n.t(`appAccess.flash.${activate ? "activated" : "paused"}`, {
                        name: policy.data.name
                    }));
                })
        }
    }

    const {open, cancel, action, question, okButton} = confirmation;

    return (
        <div className="policy-overview-container">
            {open && <ConfirmationDialog confirm={action}
                                         cancel={cancel}
                                         confirmationHeader={I18n.t("confirmationDialog.confirm")}
                                         confirmationTxt={okButton}
                                         question={question}
            />}
            <div className="policy-overview">
                {backToAccess && <a href="/#" onClick={e => backToAccess(e)}>{I18n.t("appAccess.backToAccess")}</a>}
                <div className="grouped">
                    <h2>{I18n.t("appAccess.authorizationRules")}</h2>
                    <Button type={ButtonType.Primary}
                            onClick={() => policyDetails("new")}
                            txt={I18n.t("appAccess.new")}/>
                </div>
                <InfoBlock className="light-grey">
                    {isEmpty(policies) && <>
                        <div className="access-card grey border">
                            {I18n.t("appAccess.noPolicies")}
                        </div>
                    </>}
                    {!isEmpty(policies) && <>
                        {policies.map((policy, index) =>
                            <div key={index} className="access-card-container">
                                <div className={`access-card policy-breakdown ${policy.data.active ? "" : "paused"}`}>
                                    <div className="policy-name-container">
                                        <p className="policy-name">{policy.data.name}</p>
                                        <div className="policy-paused-container">
                                            {!policy.data.active && <p className="policy-paused">
                                                {I18n.t("appAccess.paused")}
                                            </p>}
                                            <Chip className={`policy-chip-${policy.data.denyRule ? "deny" : "allow"}`}
                                                  label={I18n.t(`appAccess.${policy.data.denyRule ? "deny" : "allow"}`)}/>
                                        </div>
                                    </div>
                                    <div className="policy-attributes-container">
                                        {policyBreakDowwn(
                                            allowedAttributes,
                                            policy,
                                            I18n.t(`appAccess.breakdown.${policy.data.denyRule ? "when" : "if"}`),
                                            I18n.t("forms.or"),
                                            I18n.t(`forms.${policy.data.allAttributesMustMatch ? "and" : "or"}`))
                                            .map((sentence, index) => <p key={index}
                                                                         className={index % 2 === 1 ? "logic" : "rule"}>
                                                {sentence}
                                            </p>)}

                                    </div>
                                </div>
                                <div className="policy-actions">
                                    <Tooltip tip={I18n.t(`appAccess.${policy.data.active ? "pause" : "activate"}`)}
                                             standalone={true}
                                             children={policy.data.active ?
                                                 <PauseIcon onClick={() => doUpdatePolicy(true, policy, false)}/> :
                                                 <ActivateIcon onClick={() => doUpdatePolicy(true, policy, true)}/>}/>
                                    <Tooltip tip={I18n.t("forms.edit")}
                                             standalone={true}
                                             children={<PencilIcon onClick={() => policyDetails(policy.id)}/>}/>
                                    <Tooltip tip={I18n.t("forms.delete")}
                                             standalone={true}
                                             children={<TrashIcon onClick={() => doDeletePolicy(true, policy)}/>}/>
                                </div>
                            </div>)}
                    </>}
                </InfoBlock>
            </div>
        </div>
    );
}
