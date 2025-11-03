import "./UserHome.scss";
import React, {useEffect} from "react";
import {useAppStore} from "../stores/AppStore";
import I18n from "../locale/I18n";
import {isEmpty} from "../utils/Utils.js";
import {useNavigate} from "react-router-dom";
import {mainMenuItems} from "../utils/MenuItems.js";
import {Button, ButtonType} from "@surfnet/sds";
import DOMPurify from "dompurify";

const UserHome = () => {

    const {user, currentOrganization} = useAppStore(state => state);
    const navigate = useNavigate();

    useEffect(() => {
        let newLocation = null;
        if (isEmpty(user.joinRequests) && isEmpty(currentOrganization?.id)) {
            newLocation = "/landing"

        } else if (!isEmpty(user.joinRequests) && isEmpty(currentOrganization?.id)) {
            newLocation = "/relax"
        }
        if (newLocation !== null) {
            navigate(newLocation, {replace: true});
        } else {
            useAppStore.setState({
                breadcrumbPaths: [
                    {path: "/home", value: I18n.t("breadCrumb.home"), menuItemName: mainMenuItems.home}
                ]
            });
        }
    }, []);

    const navigateInner = menuItem => {
        navigate(menuItem);
        useAppStore.setState(() => ({
            activeMenuItem: menuItem
        }));
    }

    return (
        <div className="home-container">
            <h2>{I18n.t("welcome.greeting", {name: user.firstName || user.name})}</h2>
            <div className="info-container">
                <section className="info-block">
                    <h3>{I18n.t("userHome.central.title")}</h3>
                    <p>{I18n.t("userHome.central.subTitle")}</p>
                    <h5>{I18n.t("userHome.central.connectedApps")}</h5>
                    <p>{I18n.t("userHome.central.connectedAppsInfo")}</p>
                    <Button onClick={() => navigateInner(mainMenuItems.yourApps)}
                            txt={I18n.t("userHome.central.maintainAccess")}
                            type={ButtonType.GhostLight}/>
                    <h5>{I18n.t("userHome.central.roles")}</h5>
                    <Button onClick={() => navigateInner(mainMenuItems.yourApps)}
                            txt={I18n.t("userHome.central.maintainRoles")}
                            type={ButtonType.GhostLight}/>
                    <div className="sds--divider largest"/>
                    <h5>{I18n.t("userHome.central.teamCentral")}</h5>
                    <p dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(I18n.t("userHome.central.responsible", {
                            email: "todo@example.com",
                            name: "todo-name",
                        }))
                    }}/>
                    <Button onClick={() => navigateInner(mainMenuItems.users)}
                            txt={I18n.t("userHome.central.maintainTeam")}
                            type={ButtonType.GhostLight}/>
                </section>
                <section className="info-block">
                    <h3>{I18n.t("userHome.catalogue.title")}</h3>
                    <p>{I18n.t("userHome.catalogue.subTitle")}</p>
                    <h5>{I18n.t("userHome.catalogue.ourApps")}</h5>
                    <p>{I18n.t("userHome.catalogue.ourAppsInfo")}</p>
                    <Button onClick={() => navigateInner()}
                            txt={I18n.t("userHome.catalogue.maintainOurApps")}
                            type={ButtonType.GhostLight}/>
                    <h5>{I18n.t("userHome.catalogue.allApps")}</h5>
                    <Button onClick={() => navigateInner()}
                            txt={I18n.t("userHome.catalogue.openCatalogue")}
                            type={ButtonType.GhostLight}/>
                </section>
                <section className="info-block grey">
                    <h3>{I18n.t("userHome.decentral.title")}</h3>
                    <p>{I18n.t("userHome.decentral.subTitle")}</p>
                    <h5>{I18n.t("userHome.decentral.collaborations")}</h5>
                    <Button onClick={() => navigateInner(mainMenuItems.collaborations)}
                            txt={I18n.t("userHome.decentral.maintainCollaborations")}
                            type={ButtonType.GhostLight}/>
                    <div className="sds--divider"/>
                    <h5>{I18n.t("userHome.decentral.teamDecentral")}</h5>
                    <p dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(I18n.t("userHome.decentral.responsible", {
                            email: "todo@example.com",
                            name: "todo-name",
                        }))
                    }}/>
                    <Button onClick={() => navigateInner(mainMenuItems.collaborations)}
                            txt={I18n.t("userHome.decentral.maintainTeamDecentral")}
                            type={ButtonType.GhostLight}/>
                </section>
                <section className="info-block full-row">
                    <p className="strong">{I18n.t("userHome.tip.info")}</p>
                    {I18n.translations[I18n.locale].userHome.tip.tips.map((tip, index) =>
                        <p key={index}>{tip}</p>
                    )}
                </section>
            </div>
        </div>
    )
};
export default UserHome;