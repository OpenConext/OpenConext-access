import {Link} from "react-router";
import Logo from "../icons/logo2.svg";
import "./Header.scss";
import {Navigation} from "./Navigation.jsx";
import {OverridableComponent} from "../contexts/CustomizationContext.tsx";

export const Header = ({currentLocation}) =>
    (
        <div className="header-container">
            <div className="header-inner">
                <Link className="logo" to={"/"}>
                    <OverridableComponent appCustomizationReactNodeKey="appLogo">
                        <Logo/>
                    </OverridableComponent>
                </Link>
                <Navigation mobile={false} path={currentLocation.pathname}/>
            </div>
        </div>
    )
