import {Link} from "react-router";
import Logo from "../icons/logo-surf.svg";
import "./Header.scss";
import {Navigation} from "./Navigation.jsx";
import {useEffect} from "react";

export const Header = ({currentLocation}) => {

    useEffect(() => {
        //force re-render on location change
    }, [currentLocation]);

    return (
        <div className="header-container">
            <div className="header-inner">
                <Link className="logo" to={"/"}>
                    <Logo/>
                </Link>
                <Navigation mobile={false} path={currentLocation.pathname}/>
            </div>
        </div>
    );
}

