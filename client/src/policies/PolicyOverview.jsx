import "./PolicyOverview.scss";
import "../styles/access_card.scss";
import React, {useState} from "react";
import {Badge, Button, Card, CardContent, Tooltip, TooltipContent, TooltipTrigger} from "@surfnet/curve-react";
import {Chip} from "../components/Chip.jsx";
import {sanitize} from "../utils/Utils.js";
import I18n from "../locale/I18n.js";
import {InfoBlock} from "../components/InfoBlock.jsx";
import {capitalize, isEmpty, splitListSemantically} from "../utils/Utils.js";
import {PencilSimpleIcon as PencilIcon, TrashIcon} from "@phosphor-icons/react";
import PauseIcon from "../icons/pause.svg";
import ActivateIcon from "../icons/play.svg";
import {deletePolicy, updatePolicy} from "../api/index.js";
import {useAppStore} from "../stores/AppStore.js";
import {useShallow} from "zustand/react/shallow";
import ConfirmationDialog from "../components/ConfirmationDialog.jsx";
import {policyBreakDowwn, policyTypes} from "../utils/Policy.js";
import {providerName} from "../utils/Manage.js";

export const PolicyOverview = ({
                                   policies,
                                   currentOrganization,
                                   policyDetails,
                                   selectedServiceProviders,
                                   refreshPolicies,
                                   serviceProviders
                               }) => {

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
            deletePolicy(policy, currentOrganization.id)
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
            updatePolicy(newPolicy, currentOrganization.id)
                .then(() => {
                    setConfirmation({});
                    refreshPolicies();
                    setFlash(I18n.t(`appAccess.flash.${activate ? "activated" : "paused"}`, {
                        name: policy.data.name
                    }));
                })
        }
    }

    const renderPolicyChip = policy => {
        const active = policy.data.active;
        const activeTranslation = active ? "active" : "paused";
        return (
            <Chip className={`policy-chip-${active ? "active" : "paused"}`}
                  label={I18n.t(`appAccess.${activeTranslation}`)}/>
        );
    }


    const renderPolicyName = policy => {
        let policyName;
        if (policy.data.type === policyTypes.reg) {
            policyName = policy.data.name;
        } else {
            const level = policy.data.loas[0].level;
            policyName = policy.data.name + " - " + capitalize(level.substring(level.lastIndexOf("/") + 1));
        }
        return (
            <p className="policy-name">
                {policyName}
            </p>
        );

    }

    const renderPolicyServiceProviders = policy => {
        const serviceProviderIds = policy.data.serviceProviderIds.map(sp => sp.name);
        const serviceProviderNames = serviceProviders
            .filter(sp => serviceProviderIds.includes(sp.data.entityid))
            .map(sp => providerName(I18n.locale, sp));
        const splittedNames = splitListSemantically(serviceProviderNames, I18n.t("forms.and"))
        return (
            <p className="policy-name">
                {I18n.t("appAccess.applications")}
                <span>{splittedNames}</span>
            </p>
        );

    }

    const renderPolicyType = policy => (
        <Badge variant="outline" className="policy-type-badge">
            {I18n.t(`policies.policyChoices.${policy.data.type === policyTypes.step ? "stepTitle" : "regTitle"}`)}
        </Badge>
    );

    const renderPolicy = (index, type, policy) => {
        return (
            <Card key={`${type}_${index}`} className={`policy-card ${policy.data.active ? "" : "paused"}`}>
                <CardContent className="policy-card-content">
                    <div className="policy-name-container">
                        {renderPolicyName(policy)}
                        {renderPolicyServiceProviders(policy)}

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
                    {renderPolicyType(policy)}
                    <div className="policy-actions">
                        <Tooltip>
                            <TooltipTrigger render={policy.data.active ?
                                <PauseIcon onClick={() => doUpdatePolicy(true, policy, false)}/> :
                                <ActivateIcon onClick={() => doUpdatePolicy(true, policy, true)}/>}/>
                            <TooltipContent><span dangerouslySetInnerHTML={{__html: sanitize(I18n.t(`appAccess.${policy.data.active ? "pause" : "activate"}`))}}/></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger render={<PencilIcon onClick={() => policyDetails(policy.id)}/>}/>
                            <TooltipContent><span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("forms.edit"))}}/></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger render={<TrashIcon onClick={() => doDeletePolicy(true, policy)}/>}/>
                            <TooltipContent><span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("forms.delete"))}}/></TooltipContent>
                        </Tooltip>
                    </div>
                    <div className="policy-paused-container">
                        {renderPolicyChip(policy)}
                    </div>
                </CardContent>
            </Card>
        );
    }

    const {open, cancel, action, question, okButton} = confirmation;

    const regularPolicies = policies.filter(policy => policy.data.type === "reg")
    const stepUpPolicies = policies.filter(policy => policy.data.type === "step")

    return (
        <div className="policy-overview-container">
            {open && <ConfirmationDialog confirm={action}
                                         cancel={cancel}
                                         confirmationHeader={I18n.t("confirmationDialog.confirm")}
                                         confirmationTxt={okButton}
                                         question={question}
            />}
            <div className="policy-overview">
                <p>
                    {I18n.t(`policies.policiesFound${policies.length === 1 ? "Single" : ""}${isEmpty(selectedServiceProviders) ? "" : "ForServiceProvider"}`,
                        {
                            nbr: policies.length,
                            names: splitListSemantically(selectedServiceProviders.map(sp => sp.label), I18n.t("forms.and"))
                        })}
                </p>
                <div className="grouped">
                    <h3>{I18n.t("appAccess.regularPolicies")}</h3>
                    <Button onClick={() => policyDetails("reg", policyTypes.reg)}>
                        <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("forms.new"))}}/>
                    </Button>
                </div>
                <InfoBlock className="light-grey">
                    {isEmpty(regularPolicies) && <>
                        <div className="access-card grey border">
                            {I18n.t("appAccess.noRegularPolicies")}
                        </div>
                    </>}
                    {!isEmpty(regularPolicies) && <>
                        {regularPolicies.map((policy, index) =>
                            renderPolicy(index, "reg", policy))}
                    </>}
                </InfoBlock>
                <div className="grouped">
                    <h3>{I18n.t("appAccess.stepUpPolicies")}</h3>
                    <Button onClick={() => policyDetails("step", policyTypes.step)}>
                        <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("forms.new"))}}/>
                    </Button>
                </div>
                <InfoBlock className="light-grey">
                    {isEmpty(stepUpPolicies) && <>
                        <div className="access-card grey border">
                            {I18n.t("appAccess.noStepUpPolicies")}
                        </div>
                    </>}
                    {!isEmpty(stepUpPolicies) && <>
                        {stepUpPolicies.map((policy, index) =>
                            renderPolicy(index, "step", policy))}
                    </>}
                </InfoBlock>
            </div>
        </div>
    );
}
