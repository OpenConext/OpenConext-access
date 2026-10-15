import {useEffect, useRef, useState} from "react";
import {Link} from "react-router";
import Logo from "../icons/logo2.svg";
import "./Header.scss";
import {Navigation} from "./Navigation.jsx";
import {MobileNavigation} from "./MobileNavigation.jsx";
import {OverridableComponent} from "../contexts/CustomizationContext.tsx";
import {ListIcon, XIcon} from "@phosphor-icons/react";
import {stopEvent} from "../utils/Utils.js";

const HIDE_OFFSET = 72;
const SCROLL_THRESHOLD = 5;

export const Header = ({currentLocation}) => {

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [hidden, setHidden] = useState(false);
    const lastScrollY = useRef(0);

    // Closing on route change avoids a stale open menu after navigating.
    useEffect(() => {
        setMobileMenuOpen(false); // eslint-disable-line react-hooks/set-state-in-effect
    }, [currentLocation.pathname]);

    // Hide the header when scrolling down, show it again immediately when scrolling up.
    useEffect(() => {
        const onScroll = () => {
            const y = Math.max(window.scrollY, 0);
            const delta = y - lastScrollY.current;
            if (y <= HIDE_OFFSET) {
                setHidden(false);
            } else if (Math.abs(delta) > SCROLL_THRESHOLD) {
                setHidden(delta > 0);
            }
            if (Math.abs(delta) > SCROLL_THRESHOLD) {
                lastScrollY.current = y;
            }
        };
        lastScrollY.current = Math.max(window.scrollY, 0);
        window.addEventListener("scroll", onScroll, {passive: true});
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <div className={`header-container${hidden && !mobileMenuOpen ? " hidden" : ""}`}>
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
