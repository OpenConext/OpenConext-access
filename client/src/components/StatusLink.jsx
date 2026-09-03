import "./StatusLink.scss"
import {
    CaretRightIcon as CaretRight,
    CircleDashedIcon as PendingIcon,
    UsersThreeIcon as TeamIcon,
    CheckCircleIcon as CompletedIcon,
    WarningIcon as AlertIcon
} from "@phosphor-icons/react";
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
                return <CompletedIcon weight="fill" className="completed"/>
            case STATUS_LINK_TYPE.PENDING:
                return <PendingIcon className="pending"/>
            case STATUS_LINK_TYPE.ALERT:
                return <AlertIcon weight="fill" className="alert-triangle"/>
            case STATUS_LINK_TYPE.TEAM:
                return <TeamIcon className="team"/>
        }
    }

    return (
        <div className={`status-link ${disabled ? "disabled" : "enabled"}`}
             onClick={() => !disabled && action()}>
            {getIcon()}
            <span className="info"
                dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(info)}}/>
            <CaretRight className="caret_right"/>
        </div>
    );
}
