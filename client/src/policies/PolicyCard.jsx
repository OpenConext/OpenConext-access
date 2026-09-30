import "./PolicyCard.scss";
import React, {useState} from "react";
import {Badge, Card, CardContent, Tooltip, TooltipContent, TooltipTrigger} from "@surfnet/curve-react";
import {PauseIcon, PencilSimpleIcon as PencilIcon, PlayIcon as ActivateIcon, TrashIcon} from "@phosphor-icons/react";
import I18n from "../locale/I18n.js";
import {useAppStore} from "../stores/AppStore.js";
import {useShallow} from "zustand/react/shallow";
import {capitalize, sanitize, splitListSemantically} from "../utils/Utils.js";
import {policyBreakDowwn, policyTypes} from "../utils/Policy.js";
import {providerName} from "../utils/Manage.js";
import {deletePolicy, updatePolicy} from "../api/index.js";
import ConfirmationDialog from "../components/ConfirmationDialog.jsx";

const ActionIcon = ({Icon, label, onClick}) => (
    <Tooltip>
        <TooltipTrigger render={<Icon onClick={onClick}/>}/>
        <TooltipContent><span dangerouslySetInnerHTML={{__html: sanitize(label)}}/></TooltipContent>
    </Tooltip>
);

export const PolicyCard = ({policy, serviceProviders, currentOrganization, refreshPolicies, onEdit}) => {

    const {allowedAttributes, setFlash} = useAppStore(useShallow(state => ({
        allowedAttributes: state.allowedAttributes,
        setFlash: state.setFlash
    })));
    const [confirmation, setConfirmation] = useState({});
    const active = policy.data.active;

    const doDeletePolicy = confirmationRequired => {
        if (confirmationRequired) {
            setConfirmation({
                open: true,
                cancel: () => setConfirmation({open: false}),
                action: () => doDeletePolicy(false),
                question: I18n.t("appAccess.confirmation.deleteQuestion"),
                okButton: I18n.t("forms.delete")
            });
        } else {
            deletePolicy(policy, currentOrganization.id)
                .then(() => {
                    setConfirmation({});
                    refreshPolicies();
                    setFlash(I18n.t("appAccess.flash.deleted", {name: policy.data.name}));
                });
        }
    }

    const doUpdatePolicy = (confirmationRequired, activate) => {
        if (confirmationRequired) {
            setConfirmation({
                open: true,
                cancel: () => setConfirmation({open: false}),
                action: () => doUpdatePolicy(false, activate),
                question: I18n.t(`appAccess.confirmation.${activate ? "activateQuestion" : "pauseQuestion"}`),
                okButton: I18n.t(`appAccess.${activate ? "activate" : "pause"}`)
            });
        } else {
            const newPolicy = {...policy, data: {...policy.data, active: !policy.data.active}};
            updatePolicy(newPolicy, currentOrganization.id)
                .then(() => {
                    setConfirmation({});
                    refreshPolicies();
                    setFlash(I18n.t(`appAccess.flash.${activate ? "activated" : "paused"}`, {name: policy.data.name}));
                });
        }
    }

    let policyName;
    if (policy.data.type === policyTypes.reg) {
        policyName = policy.data.name;
    } else {
        const level = policy.data.loas[0].level;
        policyName = policy.data.name + " - " + capitalize(level.substring(level.lastIndexOf("/") + 1));
    }

    const serviceProviderIds = policy.data.serviceProviderIds.map(sp => sp.name);
    const serviceProviderNames = serviceProviders
        .filter(sp => serviceProviderIds.includes(sp.data.entityid))
        .map(sp => providerName(I18n.locale, sp));

    const {open, cancel, action, question, okButton} = confirmation;

    return (
        <>
        <Card className={`policy-card ${active ? "" : "paused"}`}>
            <CardContent className="policy-card-content">
                <div className="policy-name-container">
                    <p className="policy-name">{policyName}</p>
                    <p className="policy-name">
                        {I18n.t("appAccess.applications")}
                        <span>{splitListSemantically(serviceProviderNames, I18n.t("forms.and"))}</span>
                    </p>
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
                <Badge variant="outline" className="policy-type-badge">
                    {I18n.t(`policies.policyChoices.${policy.data.type === policyTypes.step ? "stepTitle" : "regTitle"}`)}
                </Badge>
                <div className="policy-actions">
                    <ActionIcon Icon={active ? PauseIcon : ActivateIcon}
                                label={I18n.t(`appAccess.${active ? "pause" : "activate"}`)}
                                onClick={() => doUpdatePolicy(true, !active)}/>
                    <ActionIcon Icon={PencilIcon} label={I18n.t("forms.edit")} onClick={() => onEdit(policy)}/>
                    <ActionIcon Icon={TrashIcon} label={I18n.t("forms.delete")} onClick={() => doDeletePolicy(true)}/>
                </div>
                <div className="policy-paused-container">
                    <Badge variant={active ? "success" : "info"}>
                        {I18n.t(`appAccess.${active ? "active" : "paused"}`)}
                    </Badge>
                </div>
            </CardContent>
        </Card>
        {open && <ConfirmationDialog confirm={action}
                                     cancel={cancel}
                                     confirmationHeader={I18n.t("confirmationDialog.confirm")}
                                     confirmationTxt={okButton}
                                     question={question}/>}
        </>
    );
}
