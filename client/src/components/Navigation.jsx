import I18n from "../locale/I18n";
import "./Navigation.scss"
import {stopEvent} from "../utils/Utils.js";
import {useNavigate} from "react-router";
import {LanguageToggle} from "./LanguageToggle.jsx";
import {LoginButtons} from "./LoginButtons.jsx";
import {tabNames, disabledTabNames, hiddenTabNames} from "../utils/NavigationTabs.js";

export const Navigation = ({mobile, path}) => {

    // Derived directly from the path prop (rather than mirrored into state) so the
    // active tab stays correct after navigation that doesn't go through doNavigate -
    // e.g. the "/" -> "/home" redirect, the mobile menu's own links, or browser
    // back/forward.
    const activeTab = path.substring(1);

    const navigate = useNavigate();

    const doNavigate = (e, tabName) => {
        stopEvent(e);
        navigate(`/${tabName}`)
    }

    return (
        <div className={`desktop-navigation ${mobile ? "mobile" : ""}`}>
            {tabNames.filter(tabName => !hiddenTabNames.has(tabName)).map(tabName => disabledTabNames.has(tabName) ?
                <span key={tabName} className="disabled" aria-disabled="true">
                    {I18n.t(`landing.tabs.${tabName}`)}
                </span> :
                <a key={tabName}
                   href={`/${tabName}`}
                   className={tabName === activeTab ? "active" : ""}
                   onClick={e => doNavigate(e, tabName)}>
                    {I18n.t(`landing.tabs.${tabName}`)}
                </a>)}
            <div className="links">
                <LanguageToggle/>
                {path !== "/login-info" && <LoginButtons/>}
            </div>
        </div>
    );
}
