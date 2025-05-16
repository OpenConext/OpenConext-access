import "./StatusMenuItem.scss"
import PendingIcon from "../icons/pending.svg";
import CompletedIcon from "../icons/completed.svg";

export const StatusMenuItem = ({pending, info, action, active}) => {

    const icon = pending ? <PendingIcon/> : <CompletedIcon/>;

    return (
        <div className={`status-menu-item ${active && "active"}`}
             onClick={action}>
            <span className="info">{info}</span>
            {icon}
        </div>
    );
}
