import "./ExternalOrganization.scss";
import React, {useState} from "react";
import {useAppStore} from "../stores/AppStore";
import I18n from "../locale/I18n";
import {useNavigate} from "react-router-dom";
import {deleteOrganizationById} from "../api/index.js";
import {stopEvent} from "../utils/Utils.js";
import ConfirmationDialog from "../components/ConfirmationDialog.jsx";
import DOMPurify from "dompurify";
import {isOrganizationAdmin} from "../utils/Permissions.js";
import {Button, ButtonType, Loader} from "@surfnet/sds";

const sections = {
    contactPersons: "contactPersons",
    general: "general",
    delete: "delete"
}

const ExternalOrganization = ({organization, user, refreshUser}) => {
    const [confirmation, setConfirmation] = useState({});
    const [section, setSection] = useState(sections.contactPersons);
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

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

    const renderContactPersonsSection = () => {
        return <span>ToDo</span>
    }

    const renderGeneralSection = () => {
        return <span>ToDo</span>
    }

    const renderDeleteSection = () => {
        return (
            <div>
                <h3>{I18n.t(`externalOrganization.${sections.delete}`)}</h3>
                <p>{I18n.t("externalOrganization.deleteWarning")}</p>
                <div className="actions">
                    <Button onClick={e => doDelete(e, true)}
                            type={ButtonType.DestructivePrimary}
                            txt={I18n.t("externalOrganization.deleteButton")}
                            />
                </div>
            </div>
        );
    }
    const renderCurrentSection = () => {
        switch (section) {
            case sections.contactPersons: {
                return renderContactPersonsSection();
            }
            case sections.general: {
                return renderGeneralSection();
            }
            case sections.delete: {
                return renderDeleteSection();
            }
        }
    }

    if (loading) {
        return <Loader/>
    }

    const {open, cancel, action, question, okButton} = confirmation;
    return (
        <div
            className="external-organization-outer-container">
            {open && <ConfirmationDialog confirm={action}
                                         cancel={cancel}
                                         confirmationHeader={I18n.t("forms.delete")}
                                         confirmationTxt={okButton}
                                         isDeleteAction={true}
                                         question={question}
            />}
            <div className="external-organization-header-container">
                <div className="top-header">
                    <h1>{I18n.t("externalOrganization.title")}</h1>
                </div>
                <p dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("externalOrganization.info"))}}/>
            </div>
            <div className="external-organization">
                <h1>{I18n.t("externalOrganization.maintenance")}</h1>
                <div className="menu-container">
                    <div className="left-menu">
                        {Object.values(sections)
                            .filter(s => s !== sections.delete || user.superUser || isOrganizationAdmin(user, organization))
                            .map((s, index) =>
                                <div key={index} className={`menu-item ${s === section ? "active" : ""}`}>
                                    <span onClick={() => setSection(s)}>{I18n.t(`externalOrganization.${s}`)}</span>
                                </div>
                            )}
                    </div>
                    <div className="right-menu">
                        {renderCurrentSection()}
                    </div>

                </div>

            </div>
        </div>

    )
};
export default ExternalOrganization;