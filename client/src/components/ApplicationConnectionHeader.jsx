import I18n from "../locale/I18n";
import "./ApplicationConnectionHeader.scss"
import {stopEvent} from "../utils/Utils.js";
import MenuIcon from "../icons/menu.svg";
import PencilIcon from "@surfnet/sds/icons/functional-icons/pencil.svg";
import TrashIcon from "@surfnet/sds/icons/functional-icons/bin.svg";
import React, {useState} from "react";
import {useNavigate} from "react-router-dom";

export const ApplicationConnectionHeader = ({tabNames, application, tab, setTab}) => {

    const [dropDownActive, setDropDownActive] = useState(false);

    const navigate = useNavigate();

    const doNavigate = (e, tabName) => {
        stopEvent(e);
        setTab(tabName);
    }

    const menuLink = (e, link) => {
        stopEvent(e);
        navigate(link);
    }

    const renderMenu = () => {
        return (
            <div className="sds--user-info--dropdown">
                <ul>
                    <li>
                        <PencilIcon/>
                        <a href="/edit" onClick={e => menuLink(e, `/application/${application.id}`)}>
                            {I18n.t(`forms.edit`)}
                        </a>
                    </li>
                    <li>
                        <TrashIcon/>
                        <a href="/delete" onClick={e => menuLink(e, `/application/${application.id}`)}>
                            {I18n.t(`forms.delete`)}
                        </a>

                    </li>
                </ul>
            </div>
        )
    }

    return (
        <div className="application-connection-header-container">
            <div className="top-header"
                 tabIndex={1}
                 onBlur={() => setTimeout(() => setDropDownActive(false), 475)}>
                <h1>{application.name}</h1>
                <span className={`menu ${dropDownActive ? "drop-down" : ""}`}
                      onClick={() => setDropDownActive(!dropDownActive)}>
                    <MenuIcon/>
                    {dropDownActive && renderMenu()}
                </span>
            </div>

            <div className="application-connection-header">

                {tabNames.map(tabName => <a key={tabName}
                                            href={`/${tabName}`}
                                            className={tabName === tab ? "active" : ""}
                                            onClick={e => doNavigate(e, tabName)}>
                    {I18n.t(`connection.${tabName}`)}
                </a>)}
            </div>
        </div>
    );
}
