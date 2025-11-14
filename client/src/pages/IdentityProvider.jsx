import "./IdentityProvider.scss";
import React, {useEffect, useState} from "react";
import {useAppStore} from "../stores/AppStore";
import I18n from "../locale/I18n";
import {Loader} from "@surfnet/sds";
import {useNavigate, useParams} from "react-router-dom";
import {organizationById} from "../api/index.js";
import {isEmpty} from "../utils/Utils.js";
import ConfirmationDialog from "../components/ConfirmationDialog.jsx";

const IdentityProvider = ({organization, user}) => {
    const [confirmation, setConfirmation] = useState({});

    const doDelete = (e, confirmationRequired) => {
        stopEvent(e);
        if (confirmationRequired) {
            setConfirmation({
                open: true,
                cancel: () => setConfirmation({open: false}),
                action: () => doDelete(null, false),
                question: I18n.t("organization.deleteConfirmation", {name: organization.name}),
                okButton: I18n.t("forms.delete")
            });
        } else {
            setLoading(true);
            deleteOrganizationById(organization.id).then(() => {
                setConfirmation({});
                useAppStore.setState({
                    currentOrganization: {name: ""}
                });
                refreshUser();
                setTimeout(() => navigate("/home"), 350);
            })
        }
    }
    const {open, cancel, action, question, okButton} = confirmation;
    return (
        <div
            className="identity-provider-outer-container">
            {open && <ConfirmationDialog confirm={action}
                                         cancel={cancel}
                                         confirmationHeader={I18n.t("forms.delete")}
                                         confirmationTxt={okButton}
                                         question={question}
            />}
            <div className="identity-provider-header-container">
                <div className="top-header">
                    <h1>{I18n.t("identityProvider.title")}</h1>
                </div>
                <p>{I18n.t("identityProvider.info", {name: organization.name})}</p>
            </div>
            <div className="identity-provider">

            </div>
        </div>

    )
};
export default IdentityProvider;