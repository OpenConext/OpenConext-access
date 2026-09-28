import React from "react";
import I18n from "../locale/I18n";
import {Link} from "react-router";
import "./MobileNavigation.scss";
import {tabNames, disabledTabNames, hiddenTabNames} from "../utils/NavigationTabs.js";
import {LanguageToggle} from "./LanguageToggle.jsx";
import {LoginButtons} from "./LoginButtons.jsx";

export const MobileNavigation = ({path, onNavigate}) => {

    return (
        <>
            <div className="mobile-nav-backdrop" onClick={onNavigate}/>
            <div className="mobile-navigation">
                <div className="mobile-nav-links">
                    {tabNames.filter(tabName => !hiddenTabNames.has(tabName)).map(tabName =>
                        disabledTabNames.has(tabName) ?
                            <span key={tabName} className="mobile-nav-item disabled" aria-disabled="true">
                                {I18n.t(`landing.tabs.${tabName}`)}
                            </span> :
                            <Link key={tabName}
                                  to={`/${tabName}`}
                                  className={`mobile-nav-item ${path === `/${tabName}` ? "active" : ""}`}
                                  onClick={onNavigate}>
                                {I18n.t(`landing.tabs.${tabName}`)}
                            </Link>)}
                    <LanguageToggle/>
                </div>
                <LoginButtons className="mobile-login-buttons" onClick={onNavigate}/>
            </div>
        </>
    );
}
