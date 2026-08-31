import React from "react";
import "./Logo.scss";
import LogoIcon from "../icons/logo-surf.svg";

export const LogoType = {
    Bottom: "Bottom",
    Up: "Up",
};

export const LogoColor = {
    White: "White",
    Black: "Black",
};

export const Logo = (props) => {
    const color = props.color || LogoColor.Black;
    const colorClassName = color === LogoColor.White ? "sds--branding--negative" : "";
    const className = `sds--logo sds--branding sds--branding--name-${props.position.toLowerCase()} ${colorClassName} ${props.action ? "link" : ""}`;

    const logoClicked = () => {
        if (props.action) {
            props.action();
        }
    };

    return (
        <div className={className} onClick={logoClicked}>
            <span className="sds--branding--visual">
                {props.CustomLogo ? <props.CustomLogo/> : <LogoIcon/>}
            </span>
            <span className="sds--branding--textual">{props.label}</span>
        </div>
    );
};

export default Logo;
