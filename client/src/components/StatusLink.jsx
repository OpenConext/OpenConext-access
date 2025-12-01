import "./StatusLink.scss"
import CaretRight from "../icons/caret_right.svg";
import PendingIcon from "../icons/pending.svg";
import TeamIcon from "../icons/teams.svg";
import CompletedIcon from "../icons/completed.svg";
import AlertIcon from "../icons/alert-triangle.svg";
import React from "react";
import DOMPurify from "dompurify";


export const STATUS_LINK_TYPE = {
    ACTIVE: "ACTIVE",
    PENDING: "PENDING",
    ALERT: "ALERT",
    TEAM: "TEAM"
}

export const StatusLink = ({status, info, action, disabled, CustomIcon}) => {

    const getIcon = () => {
        if (CustomIcon) {
            return <CustomIcon/>
        }
        switch (status) {
            case STATUS_LINK_TYPE.ACTIVE:
                return <CompletedIcon/>
            case STATUS_LINK_TYPE.PENDING:
                return <PendingIcon/>
            case STATUS_LINK_TYPE.ALERT:
                return <AlertIcon/>
            case STATUS_LINK_TYPE.TEAM:
                return <TeamIcon/>
        }
    }

    return (
        <div className={`status-link ${disabled ? "disabled" : "enabled"}`}
             onClick={() => !disabled && action()}>
            {getIcon()}
            <span className="info"
                dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(info)}}/>
            <CaretRight/>
        </div>
    );
}
