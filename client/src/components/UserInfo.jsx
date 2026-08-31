import React from "react";
import "./UserInfo.scss";
import {CaretDownIcon} from "@phosphor-icons/react";

export const UserInfo = (props) => {

    return (
        <nav className={`sds--user-info ${props.isOpen ? "is-open" : ""}`}>
            <div className="sds--user-info--textual">
                <p className="name">{props.userName}</p>
                <p className="role sds--text--body--small">{props.organisationName}</p>
            </div>
            <button type="button" className="sds--user-info--button" onClick={props.toggle}>
                <CaretDownIcon/>
            </button>
            <div className="sds--user-info--dropdown">
                {props.children && props.children}
            </div>
        </nav>
    );
};

export default UserInfo;
