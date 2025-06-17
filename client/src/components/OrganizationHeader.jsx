import I18n from "../locale/I18n";
import "./ApplicationConnectionHeader.scss"
import {stopEvent} from "../utils/Utils.js";
import MenuIcon from "../icons/menu.svg";
import PencilIcon from "@surfnet/sds/icons/functional-icons/pencil.svg";
import TrashIcon from "@surfnet/sds/icons/functional-icons/bin.svg";
import React, {useState} from "react";
import {useNavigate} from "react-router-dom";
import {deleteApplicationById, deleteOrganizationById, resetConnectionSecret} from "../api/index.js";
import ConfirmationDialog from "./ConfirmationDialog.jsx";
import InputField from "./InputField.jsx";

export const OrganizationHeader = ({tabNames, organization, tab, setTab, setLoading}) => {

    const [dropDownActive, setDropDownActive] = useState(false);
    const [confirmation, setConfirmation] = useState({});

    const navigate = useNavigate();

    const doNavigate = (e, tabName) => {
        stopEvent(e);
        setTab(tabName);
    }

    const menuLink = (e, link) => {
        stopEvent(e);
        navigate(link);
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
                navigate("/home");
                setLoading(false);
            })
        }
    }

    const renderMenu = () => {
        return (
            <div className="sds--user-info--dropdown">
                <ul>
                    <li>
                        <PencilIcon/>
                        <a href="/edit" onClick={e => menuLink(e, `/organisation/${application.id}`)}>
                            {I18n.t(`forms.edit`)}
                        </a>
                    </li>
                    <li>
                        <TrashIcon/>
                        <a href="/delete" onClick={e => doDelete(e, true)}>
                            {I18n.t(`forms.delete`)}
                        </a>

                    </li>
                </ul>
            </div>
        )
    }
    const {open, cancel, action, question, okButton} = confirmation;
    return (
        <div className="application-connection-header-container">
            {open && <ConfirmationDialog confirm={action}
                                         cancel={cancel}
                                         confirmationHeader={I18n.t("forms.delete")}
                                         confirmationTxt={okButton}
                                         question={question}
            />}

            <div className="top-header"
                 tabIndex={1}
                 onBlur={() => setTimeout(() => setDropDownActive(false), 475)}>
                <h1>{organization.name}</h1>
                <span className={`menu ${dropDownActive ? "drop-down" : ""}`}
                      onClick={() => setDropDownActive(!dropDownActive)}>
                    <MenuIcon/>
                    {dropDownActive && renderMenu()}
                </span>
            </div>

            <div className="tabs-menu">

                {tabNames.map(tabName => <a key={tabName}
                                            href={`/${tabName}`}
                                            className={tabName === tab ? "active" : ""}
                                            onClick={e => doNavigate(e, tabName)}>
                    {I18n.t(`organization.${tabName}`)}
                </a>)}
            </div>
        </div>
    );
}
