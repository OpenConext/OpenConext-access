import {useEffect, useState} from "react";
import {Link} from "react-router";
import Logo from "../icons/logo2.svg";
import "./Header.scss";
import {Navigation} from "./Navigation.jsx";
import {MobileNavigation} from "./MobileNavigation.jsx";
import {OverridableComponent} from "../contexts/CustomizationContext.tsx";
import {ListIcon, XIcon} from "@phosphor-icons/react";
import {stopEvent} from "../utils/Utils.js";

export const Header = ({currentLocation}) => {

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Closing on route change avoids a stale open menu after navigating.
    useEffect(() => setMobileMenuOpen(false), [currentLocation.pathname]);

    return (
        <div className="header-container">
            <div className="header-inner">
                <Link className="logo" to={"/"}>
                    <OverridableComponent appCustomizationReactNodeKey="appLogo">
                        <Logo/>
                    </OverridableComponent>
                </Link>
                <Navigation mobile={false} path={currentLocation.pathname}/>
                <button type="button"
                        className="mobile-menu-trigger"
                        aria-expanded={mobileMenuOpen}
                        aria-label="Menu"
                        onClick={e => {
                            stopEvent(e);
                            setMobileMenuOpen(!mobileMenuOpen);
                        }}>
                    {mobileMenuOpen ? <XIcon/> : <ListIcon/>}
                </button>
            </div>
            {mobileMenuOpen &&
                <MobileNavigation path={currentLocation.pathname} onNavigate={() => setMobileMenuOpen(false)}/>}
        </div>
    );
}
