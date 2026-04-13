import I18n from "../locale/I18n";
import "./ApplicationConnectionHeader.scss"
import {isEmpty, stopEvent} from "../utils/Utils.js";
import MenuIcon from "../icons/menu.svg";
import PencilIcon from "@surfnet/sds/icons/functional-icons/pencil.svg";
import TrashIcon from "@surfnet/sds/icons/functional-icons/bin.svg";
import React, {useState} from "react";
import {useNavigate} from "react-router-dom";
import {deleteApplicationById, identityProvidersByUsedConnectionsForApplication} from "../api/index.js";
import ConfirmationDialog from "./ConfirmationDialog.jsx";
import {Chip, ChipType, Loader} from "@surfnet/sds";
import {hasApplicationDeleteAccess} from "../utils/Permissions.js";
import {ConnectionInUseWarning, units} from "../connection/ConnectionInUseWarning.jsx";

export const ApplicationConnectionHeader = ({tabs, application, user, currentTab, setTab, currentOrganization}) => {

    const [dropDownActive, setDropDownActive] = useState(false);
    const [confirmation, setConfirmation] = useState({});
    const [affectedIdentityProviders, setAffectedIdentityProviders] = useState([]);
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const doNavigate = (e, tab) => {
        stopEvent(e);
        if (!tab.disabled) {
            setTab(tab.name);
        }
    }

    const menuLink = (e, link) => {
        stopEvent(e);
        navigate(link);
    }

    const doDelete = (e, confirmationRequired) => {
        stopEvent(e);
        if (confirmationRequired) {
            setLoading(true);
            //First, fetch all the possible identityProvers affected by the deletion of this application
            identityProvidersByUsedConnectionsForApplication(application.id)
                .then(res => {
                    setLoading(false);
                    setAffectedIdentityProviders(res);
                    setConfirmation({
                        open: true,
                        cancel: () => setConfirmation({open: false}),
                        action: () => doDelete(null, false),
                        question: I18n.t("application.deleteConfirmation", {name: application.name}),
                        okButton: I18n.t(isEmpty(res) ? "forms.delete" : "forms.deleteAnyway")
                    });
                })
        } else {
            setLoading(true);
            setAffectedIdentityProviders([]);
            deleteApplicationById(application.id)
                .then(() => {
                    setConfirmation({});
                    navigate("/organization/" + currentOrganization.id);
                    setLoading(false);
                })
        }
    }

    const renderMenu = () => {
        const mayDelete = hasApplicationDeleteAccess(user, application);
        return (
            <div className="sds--user-info--dropdown">
                <ul>
                    <li onClick={e => menuLink(e, `/application/${application.id}`)}>
                        <PencilIcon/>
                        <a href="/edit" onClick={e => menuLink(e, `/application/${application.id}`)}>
                            {I18n.t(`forms.edit`)}
                        </a>
                    </li>
                    {mayDelete && <li onClick={e => doDelete(e, true)}>
                        <TrashIcon/>
                        <a href="/delete" onClick={e => doDelete(e, true)}>
                            {I18n.t(`forms.delete`)}
                        </a>
                    </li>}
                </ul>
            </div>
        )
    }

    if (loading) {
        return <Loader/>
    }

    const {open, cancel, action, question, okButton} = confirmation;
    return (
        <div className="application-connection-header-container">
            {open && <ConfirmationDialog confirm={action}
                                         cancel={cancel}
                                         confirmationHeader={I18n.t("forms.delete")}
                                         confirmationTxt={okButton}
                                         isDeleteAction={true}
                                         children={<ConnectionInUseWarning
                                             identityProviders={affectedIdentityProviders}
                                             unit={units.application}
                                             applicationName={application.name}/>}
                                         question={question}
            />}

            <div className="top-header"
                 tabIndex={1}
                 onBlur={() => setTimeout(() => setDropDownActive(false), 275)}>
                <h1>{application.name}</h1>
                <div className="menu-container">
                    {application.type === "CONTENT" &&
                        <Chip type={ChipType.Status_info} label={I18n.t("application.contentAbbreviation")}
                              className="application-type"/>}
                    <span className={`menu ${dropDownActive ? "drop-down" : ""}`}
                          onClick={() => setDropDownActive(!dropDownActive)}>
                    <MenuIcon/>
                        {dropDownActive && renderMenu()}
                </span>
                </div>
            </div>

            <div className="tabs-menu">
                {tabs.map(tab => <a key={tab.name}
                                    href={`/${tab.name}`}
                                    className={tab.name === currentTab ? "active" : tab.disabled ? "disabled" : ""}
                                    onClick={e => doNavigate(e, tab)}>
                    {I18n.t(`connection.${tab.name}`)}
                </a>)}
            </div>
        </div>
    );
}
