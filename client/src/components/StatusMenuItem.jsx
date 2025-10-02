import "./StatusMenuItem.scss"
import PendingIcon from "../icons/pending.svg";
import CompletedIcon from "../icons/completed.svg";
import AlertIcon from "../icons/alert-triangle.svg";

export const StatusMenuItem = ({pending, info, action, active, disabled, isAlert = false, hideIcon = false}) => {

    const icon = isAlert ? <AlertIcon/> : pending ? <PendingIcon/> : <CompletedIcon/>;

    return (
        <div className={`status-menu-item ${active && "active"} ${disabled && "disabled"}`}
             onClick={() => !disabled && action()}>
            <span className="info">{info}</span>
            {!hideIcon && icon}
        </div>
    );
}
