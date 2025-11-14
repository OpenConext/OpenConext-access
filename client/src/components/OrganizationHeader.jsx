import I18n from "../locale/I18n";
import "./ApplicationConnectionHeader.scss"
import {stopEvent} from "../utils/Utils.js";
import MenuIcon from "../icons/menu.svg";
import TrashIcon from "@surfnet/sds/icons/functional-icons/bin.svg";
import React, {useState} from "react";
import {useNavigate} from "react-router-dom";
import {deleteOrganizationById} from "../api/index.js";
import ConfirmationDialog from "./ConfirmationDialog.jsx";
import {useAppStore} from "../stores/AppStore.js";

export const OrganizationHeader = ({organization, setLoading, refreshUser}) => {

    const [dropDownActive, setDropDownActive] = useState(false);
    const [confirmation, setConfirmation] = useState({});

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

    const renderMenu = () => {
        return (
            <div className="sds--user-info--dropdown">
                <ul>
                    {/*<li>*/}
                    {/*    <PencilIcon/>*/}
                    {/*    <a href="/edit" onClick={e => menuLink(e, `/organisation/${application.id}`)}>*/}
                    {/*        {I18n.t(`forms.edit`)}*/}
                    {/*    </a>*/}
                    {/*</li>*/}
                    <li onClick={e => doDelete(e, true)}>
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
                <h1>{I18n.t("organization.applicationManagement")}</h1>
                <span className={`menu ${dropDownActive ? "drop-down" : ""}`}
                      onClick={() => setDropDownActive(!dropDownActive)}>
                    <MenuIcon/>
                    {dropDownActive && renderMenu()}
                </span>
            </div>
            <p>{I18n.t("organization.info", {name: organization.name})}</p>
        </div>
    );
}
