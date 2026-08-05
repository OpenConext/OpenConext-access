import "./UserHome.scss";
import React, {useEffect, useState} from "react";
import {useAppStore} from "../stores/AppStore";
import {Button, ButtonType} from "@surfnet/sds";
import I18n from "../locale/I18n";
import {isEmpty} from "../utils/Utils.js";
import {Navigate, useNavigate} from "react-router";
import {mainMenuItems} from "../utils/MenuItems.js";
import DOMPurify from "dompurify";
import {InfoBlock} from "../components/InfoBlock.jsx";
import {useShallow} from "zustand/react/shallow";
import {organizationAdminByOrganizationId} from "../api/index.js";

const UserHome = () => {

    const {user, currentOrganization} = useAppStore(useShallow(state => ({
        user: state.user,
        currentOrganization: state.currentOrganization
    })));

    const navigate = useNavigate();
    const [admin, setAdmin] = useState(null);

    let newLocation = null;
    if (isEmpty(user.joinRequests) && isEmpty(currentOrganization?.id)) {
        newLocation = "/landing"
    } else if (!isEmpty(user.joinRequests) && isEmpty(currentOrganization?.id)) {
        newLocation = "/relax"
    }

    useEffect(() => {
        if (newLocation === null) {
            useAppStore.setState({
                breadcrumbPaths: [
                    {path: "/home", value: I18n.t("breadCrumb.home"), menuItemName: mainMenuItems.home}
                ]
            });
            if (currentOrganization?.id) {
                organizationAdminByOrganizationId(currentOrganization.id)
                    .then(res => {
                        setAdmin(isEmpty(res) ? null : {email: res.email, name: res.name});
                    });
            }
        }
    }, [currentOrganization, newLocation]);

    if (newLocation !== null) {
        return <Navigate to={newLocation} replace/>;
    }
    const navigateInner = (menuItem, path) => {
        navigate(path);
        useAppStore.setState(() => ({
            activeMenuItem: menuItem
        }));
    }

    return (
        <div className="home-container">
            <h2>{I18n.t("welcome.greeting", {name: user.firstName || user.name})}</h2>
            <div className="info-container">
                {!user.externalUser &&
                    <InfoBlock>
                        <h3>{I18n.t("userHome.central.title")}</h3>
                        <p>{I18n.t("userHome.central.subTitle")}</p>
                        <h5>{I18n.t("userHome.central.connectedApps")}</h5>
                        <p>{I18n.t("userHome.central.connectedAppsInfo")}</p>
                        <Button onClick={() => navigateInner(mainMenuItems.accessibleApps, "/accessible-apps")}
                                txt={I18n.t("userHome.central.maintainAccess")}
                                type={ButtonType.GhostLight}/>
                        <h5>{I18n.t("userHome.central.roles")}</h5>
                        <Button onClick={() => navigateInner(mainMenuItems.invite, "/external/invite")}
                                txt={I18n.t("userHome.central.maintainRoles")}
                                type={ButtonType.GhostLight}/>
                        <div className="sds--divider largest"/>
                        <h5>{I18n.t("userHome.central.teamCentral")}</h5>
                       {!isEmpty(admin) && <p dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(I18n.t("userHome.central.responsible", {
                                email: admin.email,
                                name: admin.name,
                            }))
                        }}/>}
                        <Button onClick={() => navigateInner(mainMenuItems.users, `/users/${currentOrganization.id}`)}
                                txt={I18n.t("userHome.central.maintainTeam")}
                                type={ButtonType.GhostLight}/>
                    </InfoBlock>}
                <InfoBlock>
                    <h3>{I18n.t("userHome.catalogue.title")}</h3>
                    <p>{I18n.t("userHome.catalogue.subTitle")}</p>
                    <h5>{I18n.t("userHome.catalogue.ourApps")}</h5>
                    <p>{I18n.t("userHome.catalogue.ourAppsInfo")}</p>
                    <Button
                        onClick={() => navigateInner(mainMenuItems.yourApps, `/organization/${currentOrganization.id}`)}
                        txt={I18n.t("userHome.catalogue.maintainOurApps")}
                        type={ButtonType.GhostLight}/>
                    <h5>{I18n.t("userHome.catalogue.allApps")}</h5>
                    <Button onClick={() => navigateInner(mainMenuItems.catalogue, "/catalogue")}
                            txt={I18n.t("userHome.catalogue.openCatalogue")}
                            type={ButtonType.GhostLight}/>
                </InfoBlock>
                {!user.externalUser &&

                    <InfoBlock className="grey">
                        <h3>{I18n.t("userHome.decentral.title")}</h3>
                        <p>{I18n.t("userHome.decentral.subTitle")}</p>
                        <h5>{I18n.t("userHome.decentral.collaborations")}</h5>
                        <Button onClick={() => navigateInner(mainMenuItems.sram, "/external/sram")}
                                txt={I18n.t("userHome.decentral.maintainCollaborations")}
                                type={ButtonType.GhostLight}/>
                        <div className="sds--divider"/>
                        <h5>{I18n.t("userHome.decentral.teamDecentral")}</h5>
                        {/*<p dangerouslySetInnerHTML={{*/}
                        {/*    __html: DOMPurify.sanitize(I18n.t("userHome.decentral.responsible", {*/}
                        {/*        email: "todo@example.com",*/}
                        {/*        name: "todo-name",*/}
                        {/*    }))*/}
                        {/*}}/>*/}
                        <Button onClick={() => navigateInner(mainMenuItems.sram, "/external/sram")}
                                txt={I18n.t("userHome.decentral.maintainTeamDecentral")}
                                type={ButtonType.GhostLight}/>
                    </InfoBlock>}
                {!user.externalUser &&
                    <InfoBlock className="full-row">
                        <p className="strong">{I18n.t("userHome.tip.info")}</p>
                        {I18n.translations[I18n.locale].userHome.tip.tips.map((tip, index) =>
                            <p key={index}>{tip}</p>
                        )}
                    </InfoBlock>}
            </div>
        </div>
    )
};
export default UserHome;