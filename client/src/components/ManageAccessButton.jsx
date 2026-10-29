import "./ManageAccessButton.scss";
import React, {useState} from "react";
import {Link} from "react-router";
import {ArrowRightIcon} from "@phosphor-icons/react";
import {
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    Separator
} from "@surfnet/curve-react";
import I18n from "../locale/I18n";
import {isEmpty} from "../utils/Utils.js";
import {CONNECTION_STATUSES, PROTOCOLS} from "../utils/Manage.js";
import {deriveAccess, isOrganizationAdmin, isOrganizationMember} from "../utils/Permissions.js";

const detailPath = (connection, activated) =>
    `/application-detail/${connection.protocol.value}/${connection.manageIdentifier}${activated ? "/access" : ""}`;

export const ManageAccessButton = ({application, user, currentOrganization}) => {
    const [open, setOpen] = useState(false);

    // Only members and admins of an institution (IdP) can manage access, and only for published connections
    const isInstitution = !isEmpty(currentOrganization.identityProvider);
    const hasAccess = user.superUser || isOrganizationAdmin(user, currentOrganization) ||
        isOrganizationMember(user, currentOrganization);
    const connections = (application.connections || [])
        // Resource servers are not visible in the catalogue and an IdP can't connect to them
        .filter(conn => conn.protocol.value !== PROTOCOLS.OAUTH20_RS)
        .filter(conn => conn.status === CONNECTION_STATUSES.PROD_READY && !isEmpty(conn.manageIdentifier))
        .map(conn => ({
            ...conn,
            activated: deriveAccess(currentOrganization, conn.entityID).isAccessible
        }));
    if (!isInstitution || !hasAccess || isEmpty(connections)) {
        return null;
    }

    const label = <>{I18n.t("connection.manageAccess")}<ArrowRightIcon/></>;
    if (connections.length === 1) {
        const [connection] = connections;
        return (
            <Button variant="outline" size="lg" nativeButton={false}
                    render={<Link to={detailPath(connection, connection.activated)}
                                  className="manage-access-button"/>}>
                {label}
            </Button>
        );
    }
    return (
        <>
            <Button variant="outline" size="lg" className="manage-access-button" onClick={() => setOpen(true)}>
                {label}
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="manage-access-dialog">
                    <DialogHeader>
                        <DialogTitle>{I18n.t("connection.manageAccessModal.title")}</DialogTitle>
                        <DialogDescription>{I18n.t("connection.manageAccessModal.subTitle")}</DialogDescription>
                    </DialogHeader>
                    <div className="manage-access-connections">
                        <Separator/>
                        {connections.map(connection => <React.Fragment key={connection.id}>
                            <div className="manage-access-connection">
                                <div className="manage-access-connection-text">
                                    <span className="name">{connection.name}</span>
                                    <span className="state">
                                        {I18n.t(`connection.manageAccessModal.${connection.activated ? "activated" : "notActivated"}`)}
                                    </span>
                                </div>
                                <Button variant="outline" size="sm" nativeButton={false}
                                        render={<Link to={detailPath(connection, connection.activated)}/>}>
                                    {I18n.t(`connection.manageAccessModal.${connection.activated ? "toActivated" : "toCatalogue"}`)}
                                </Button>
                            </div>
                            <Separator/>
                        </React.Fragment>)}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
