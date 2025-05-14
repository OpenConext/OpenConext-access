import "./StatusLink.scss"
import CaretRight from "../icons/caret_right.svg";
import PendingIcon from "../icons/pending.svg";

export const StatusLink = ({status, info, action}) => {

    const icon = status === "pending" ? <PendingIcon/> : <PendingIcon/>;

    return (
        <div className="status-link" onClick={action}>
            <span className="icon">{icon}</span>
            <span className="info">{info}</span>
            <span className="nav"><CaretRight/></span>
        </div>
    );
}
