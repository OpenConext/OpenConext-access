import {Link, useNavigate} from "react-router";
import close from "../assets/close.svg";
import {stopEvent} from "../utils/Utils.js";
import "./Header.scss";
import {Navigation} from "./Navigation.jsx";
import {useEffect} from "react";
import {Logo, LogoColor, LogoType} from "@surfnet/sds";

export const HeaderLanding = ({currentLocation}) => {

    const navigate = useNavigate();

    useEffect(() => {
        //force re-render on location change
    }, [currentLocation]);

    const navigateBack = e => {
        stopEvent(e);
        navigate(-1);
    }

    const path= currentLocation.pathname;

    return (
        <div className="header-container">
            <div className="header-inner">
                <Logo label={I18n.t("header.title")}
                      position={LogoType.Bottom}
                      color={LogoColor.Black}/>

                <Navigation mobile={false} />
            </div>
        </div>
    );
}

