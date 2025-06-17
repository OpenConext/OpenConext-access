import "./StatusLink.scss"
import CaretRight from "../icons/caret_right.svg";
import PendingIcon from "../icons/pending.svg";
import TeamIcon from "../icons/teams.svg";
import CompletedIcon from "../icons/completed.svg";

export const StatusLink = ({status, info, action, disabled}) => {

    const icon = status === "team" ? <TeamIcon/> : status ? <CompletedIcon/> : <PendingIcon/>;

    return (
        <div className={`status-link ${disabled && "disabled"}`}
             onClick={action}>
            {icon}
            <span className="info">{info}</span>
            <CaretRight/>
        </div>
    );
}
