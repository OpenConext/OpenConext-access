import I18n from "../locale/I18n";
import "./TabHeader.scss"
import {stopEvent} from "../utils/Utils.js";
import React from "react";

export const TabHeader = ({tabNames, tab, setTab, hrefFor, children, fullWidth = false}) => {

    const doNavigate = (e, tabName) => {
        stopEvent(e);
        setTab(tabName);
    }

    return (
        <div className={`tab-header-container ${fullWidth ? "full-width" : ""}`}>
            {children}
            <div className="tabs-menu">
                {tabNames.map(tabName => <a key={tabName}
                                            href={hrefFor ? hrefFor(tabName) : `/${tabName}`}
                                            className={tabName === tab ? "active" : ""}
                                            onClick={e => doNavigate(e, tabName)}>
                    {I18n.t(`tabs.${tabName}`)}
                </a>)}
            </div>
        </div>
    );
}
