import I18n from "../locale/I18n";
import "./Navigation.scss"
import {Link} from "react-router";
import {NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList} from "@surfnet/curve-react";
import {LanguageToggle} from "./LanguageToggle.jsx";
import {LoginButtons} from "./LoginButtons.jsx";
import {disabledTabNames, hiddenTabNames, tabNames} from "../utils/NavigationTabs.js";

export const Navigation = ({mobile, path}) => {

    // Derived directly from the path prop (rather than mirrored into state) so the
    // active tab stays correct after navigation that doesn't go through the links -
    // e.g. the "/" -> "/home" redirect, the mobile menu's own links, or browser
    // back/forward.
    const activeTab = path.substring(1);

    return (
        <div className={`desktop-navigation ${mobile ? "mobile" : ""}`}>
            <NavigationMenu>
                <NavigationMenuList>
                    {tabNames.filter(tabName => !hiddenTabNames.has(tabName)).map(tabName =>
                        <NavigationMenuItem key={tabName}
                                            className={tabName === activeTab ? "active" : ""}>
                            {disabledTabNames.has(tabName) ?
                                <span className="disabled" aria-disabled="true">
                                    {I18n.t(`landing.tabs.${tabName}`)}
                                </span> :
                                <NavigationMenuLink render={<Link to={`/${tabName}`}/>}
                                                    active={tabName === activeTab}>
                                    {I18n.t(`landing.tabs.${tabName}`)}
                                </NavigationMenuLink>}
                        </NavigationMenuItem>)}
                </NavigationMenuList>
            </NavigationMenu>
            <div className="links">
                <LanguageToggle/>
                {path !== "/login-info" && <LoginButtons/>}
            </div>
        </div>
    );
}
