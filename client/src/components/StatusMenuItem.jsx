import "./StatusMenuItem.scss"
import PendingIcon from "../icons/pending.svg";
import CompletedIcon from "../icons/completed.svg";
import AlertIcon from "../icons/alert-triangle.svg";

export const StatusMenuItem = ({pending, info, action, active, disabled, isAlert = false, hideIcon = false, CustomIcon = null}) => {

    const icon = isAlert ? <AlertIcon/> : pending ? <PendingIcon/> : <CompletedIcon/>;

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
