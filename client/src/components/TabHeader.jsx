import I18n from "../locale/I18n";
import "./TabHeader.scss"
import {stopEvent} from "../utils/Utils.js";
import React from "react";

export const TabHeader = ({tabNames, tab, setTab, children}) => {

    const doNavigate = (e, tabName) => {
        stopEvent(e);
        setTab(tabName);
    }

    return (
        <div className="tab-header-container">
            {children}
            <div className="tabs-menu">

                {tabNames.map(tabName => <a key={tabName}
                                            href={`/${tabName}`}
                                            className={tabName === tab ? "active" : ""}
                                            onClick={e => doNavigate(e, tabName)}>
                    {I18n.t(`tabs.${tabName}`)}
                </a>)}
            </div>
        </div>
    );
}
