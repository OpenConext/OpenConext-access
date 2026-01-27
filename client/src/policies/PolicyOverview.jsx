import "./PolicyOverview.scss";
import React, {useState} from "react";
import {Button, ButtonType, Tooltip} from "@surfnet/sds";
import I18n from "../locale/I18n.js";
import {InfoBlock} from "../components/InfoBlock.jsx";
import {providerOrganizationName} from "../utils/Manage.js";
import {isEmpty} from "../utils/Utils.js";
import PencilIcon from "@surfnet/sds/icons/functional-icons/pencil.svg";
import PolicyIcon from "@surfnet/sds/icons/functional-icons/id-1.svg";
import TrashIcon from "@surfnet/sds/icons/functional-icons/bin.svg";
import {deletePolicy} from "../api/index.js";
import {useAppStore} from "../stores/AppStore.js";
import {useShallow} from "zustand/react/shallow";
import ConfirmationDialog from "../components/ConfirmationDialog.jsx";

export const PolicyOverview = ({serviceProvider, policies, backToAccess, policyDetails, refreshPolicies}) => {

    const {setFlash} = useAppStore(useShallow(state => ({
        setFlash: state.setFlash
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
                <a href="/#" onClick={e => backToAccess(e)}>{I18n.t("appAccess.backToAccess")}</a>
                <div className="grouped">
                    <h2>{I18n.t("appAccess.authorizationRules")}</h2>
                    <Button type={ButtonType.Primary}
                            onClick={() => policyDetails("new")}
                            txt={I18n.t("forms.new")}/>
                </div>
                <InfoBlock className="light-grey">
                    <div>
                        <h3>{I18n.t("appAccess.users", {name: providerOrganizationName(I18n.locale, serviceProvider)})}</h3>
                        <p>{I18n.t("appAccess.config")}</p>
                    </div>
                    {isEmpty(policies) && <>
                        <div className="access-card grey border">
                            {I18n.t("appAccess.noPolicies")}
                        </div>
                    </>}
                    {!isEmpty(policies) && <>
                        {policies.map((policy, index) =>
                            <div key={index} className="access-card-container">

                                <div className="access-card large">
                                    {policy.data.name}
                                    <PolicyIcon/>
                                </div>
                                <Tooltip tip={I18n.t("forms.edit")}
                                         standalone={true}
                                         children={<PencilIcon onClick={() => policyDetails(policy.id)}/>}/>
                                <Tooltip tip={I18n.t("forms.delete")}
                                         standalone={true}
                                         children={<TrashIcon onClick={() => doDeletePolicy(true, policy)}/>}/>
                            </div>)}

                    </>}
                </InfoBlock>
            </div>
        </div>
    );
}
