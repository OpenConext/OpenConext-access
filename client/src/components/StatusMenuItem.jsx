import "./StatusMenuItem.scss"
import {CircleDashedIcon as PendingIcon, CheckCircleIcon as CompletedIcon, WarningIcon as AlertIcon} from "@phosphor-icons/react";

export const StatusMenuItem = ({pending, info, action, active, disabled, isAlert = false, hideIcon = false, CustomIcon = null}) => {

    const icon = isAlert ? <AlertIcon weight="fill" className="alert-triangle"/> :
        pending ? <PendingIcon className="pending"/> : <CompletedIcon weight="fill" className="completed"/>;

    const isActive = active ? "active" : "";
    const isDisabled = disabled ? "disabled" : "";

    return (
        <div className={`status-menu-item ${isActive} ${isDisabled}`}
             onClick={() => !disabled && action()}>
            <span className="info">{info}</span>
            {(!hideIcon && !CustomIcon) && icon}
            {CustomIcon && <CustomIcon/>}
        </div>
    );
}
