import React from "react";
import {Badge} from "@surfnet/curve-react";
import I18n from "../locale/I18n";
import {isEmpty} from "../utils/Utils.js";
import {CONNECTION_STATUS_BADGE_VARIANTS, CONNECTION_STATUSES} from "../utils/Manage.js";

export const ApplicationStatusBadge = ({application}) => {
    const connections = application.connections || [];
    // eslint-disable-next-line no-useless-assignment
    let status = "";
    if (connections.length === 0) {
        status = "in_progress";
    } else if (connections.length > 1) {
        status = "multiple_connections"
    } else {
        const connection = connections[0];
        if (connection.status === CONNECTION_STATUSES.COMPLETE) {
            status = "ready_for_prod"
        } else if (!isEmpty(connection.changeRequests)) {
            status = "open_change_requests";
        } else {
            status = connection.status.toLowerCase();
        }
    }
    return (
        <Badge variant={CONNECTION_STATUS_BADGE_VARIANTS[status] || "secondary"}
               className={status === "ready_for_prod" ? "badge-black" : undefined}>
            {I18n.t(`connection.connections.${status}`)}
        </Badge>
    );
}
