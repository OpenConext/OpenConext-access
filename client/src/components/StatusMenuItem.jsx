import "./StatusMenuItem.scss"
import {CircleDashedIcon as PendingIcon, CheckIcon as CompletedIcon, WarningIcon as AlertIcon} from "@phosphor-icons/react";
import React from "react";

export const StatusMenuItem = ({pending, info, action, active, disabled, isAlert = false, hideIcon = false, CustomIcon = null}) => {

    const icon = isAlert ? <AlertIcon weight="fill" size={20} className="alert-triangle"/> :
        pending ? <PendingIcon className="pending" size={20} weight="regular"/> : <CompletedIcon weight="bold" color={"var(--primary-strong)"} className="completed" size={20}/>;

    const isActive = active ? "active" : "";
    const isDisabled = disabled ? "disabled" : "";

    return (
        <div className={`status-menu-item ${isActive} ${isDisabled}`}
             onClick={() => !disabled && action()}>
            {(!hideIcon && !CustomIcon) && icon}
            {CustomIcon && <CustomIcon/>}
            <span className="info">{info}</span>
        </div>
    );
}
