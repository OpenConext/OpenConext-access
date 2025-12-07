import React, {useEffect, useMemo, useRef, useState} from "react";
import {useAppStore} from "../stores/AppStore";
import {useNavigate, useParams} from "react-router-dom";
import {deleteOrganizationById, organizationById} from "../api/index.js";
import {isEmpty, stopEvent} from "../utils/Utils.js";
import "./MyOrganization.scss";
import I18n from "../locale/I18n";
import ConfirmationDialog from "../components/ConfirmationDialog.jsx";
import DOMPurify from "dompurify";
import {isOrganizationAdmin} from "../utils/Permissions.js";
import {Button, ButtonType, Loader} from "@surfnet/sds";
import {ContactPersons} from "../components/ContactPersons.jsx";
import {convertServerApplicationToClient} from "../utils/Application.js";

const sections = {
    contactPersons: "contactPersons",
    general: "general",
    delete: "delete"
}

const MyOrganization = ({refreshUser}) => {
    const {user} = useAppStore(state => state);
    const {organizationId} = useParams();

    const [loading, setLoading] = useState(true);
    const [organization, setOrganization] = useState({});
    const [confirmation, setConfirmation] = useState({});
    const [section, setSection] = useState(user.externalUser ? sections.general : sections.contactPersons);
    const [focusedId, setFocusedId] = useState(null);
    const [initial, setInitial] = useState(true);

    const inputRef = useRef(null);

    const navigate = useNavigate();

    useEffect(() => {
        if (isEmpty(organizationId)) {
            navigate("/home");
        } else {
            organizationById(organizationId, true)
                .then(res => {
                    const convertedOrganization = convertServerApplicationToClient(res);
                    setOrganization(convertedOrganization);
                    setLoading(false);
                }).catch(() => {
                navigate("/home")
            });
        }
    }, [navigate, organizationId]);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, [focusedId]);

    const availableSections = useMemo(() => {
        return Object.values(sections)
            .filter(s => s !== sections.delete || (user.externalUser && (user.superUser || isOrganizationAdmin(user, organization))))
            .filter(s => s !== sections.contactPersons || !user.externalUser)
    }, [organization, user])

    if (loading) {
        return <Loader/>
    }

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
        return <ContactPersons application={organization}
                               setApplication={setOrganization}
                               setFocusedId={setFocusedId}
                               focusedId={focusedId}
                               inputRef={inputRef}
                               initial={initial}/>
    }

    const renderGeneralSection = () => {
        return <span>renderGeneralSection-TODO</span>
    }

    const renderDeleteSection = () => {
        return (
            <div>
                <h3>{I18n.t(`myOrganization.${sections.delete}`)}</h3>
                <p>{I18n.t("myOrganization.deleteWarning")}</p>
                <div className="actions">
                    <Button onClick={e => doDelete(e, true)}
                            type={ButtonType.DestructivePrimary}
                            txt={I18n.t("myOrganization.deleteButton")}
                    />
                </div>
            </div>
        );
    }

    const saveOrganization = () => {
        setInitial(false);
        alert("Implement saveOrganization")
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

    const {open, cancel, action, question, okButton} = confirmation;
    return (
        <div
            className="my-organization-outer-container">
            {open && <ConfirmationDialog confirm={action}
                                         cancel={cancel}
                                         confirmationHeader={I18n.t("forms.delete")}
                                         confirmationTxt={okButton}
                                         isDeleteAction={true}
                                         question={question}
            />}
            <div className="my-organization-header-container">
                <div className="top-header">
                    <h1>{I18n.t("myOrganization.title")}</h1>
                </div>
                <p dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("myOrganization.info"))}}/>
            </div>
            <div className="my-organization">
                <h1>{I18n.t("myOrganization.maintenance")}</h1>
                <div className="menu-container">
                    <div className="left-menu">
                        {availableSections
                            .map((s, index) =>
                                <div key={index} className={`menu-item ${s === section ? "active" : ""}`}>
                                    <span onClick={() => setSection(s)}>{I18n.t(`myOrganization.${s}`)}</span>
                                </div>
                            )}
                    </div>
                    <div className="right-menu">
                        {renderCurrentSection()}
                    </div>
                </div>
                {section !== sections.delete &&
                    <div className="actions proceed">
                        <Button onClick={saveOrganization}
                                txt={I18n.t("myOrganization.proceedButton")}
                        />

                    </div>}

            </div>
        </div>

    )

};
export default MyOrganization;