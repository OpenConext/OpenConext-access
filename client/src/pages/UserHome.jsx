import "./UserHome.scss";
import React, {useEffect} from "react";
import {useAppStore} from "../stores/AppStore";
import {Button, Card, CardContent, CardDescription, CardTitle} from "@surfnet/curve-react";
import {ArrowRightIcon} from "@phosphor-icons/react";
import I18n from "../locale/I18n";
import {isEmpty, sanitize} from "../utils/Utils.js";
import {Link, Navigate} from "react-router";
import {mainMenuItems} from "../utils/MenuItems.js";
import {useShallow} from "zustand/react/shallow";
import WelcomeAddApps from "../icons/figma/welcome-add-apps.svg";
import WelcomeDiscoverApps from "../icons/figma/welcome-discover-apps.svg";
import WelcomeSetupAccess from "../icons/figma/welcome-setup-access.svg";

const UserHome = () => {

    const {user, currentOrganization} = useAppStore(useShallow(state => ({
        user: state.user,
        currentOrganization: state.currentOrganization
    })));

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
        }
    }, [newLocation]);

    if (newLocation !== null) {
        return <Navigate to={newLocation} replace/>;
    }

    const setActiveMenuItemState = menuItem => {
        useAppStore.setState(() => ({
            activeMenuItem: menuItem
        }));
    }

    const welcomeCard = (key, Illustration, menuItem, path, linkColorClass) => (
        <Card key={key}>
            <CardContent>
                <CardTitle>{I18n.t(`userHome.${key}.title`)}</CardTitle>
                {Illustration &&
                    <div className="illustration">
                        <Illustration/>
                    </div>}
                <CardDescription>{I18n.t(`userHome.${key}.description`)}</CardDescription>
                <Button variant="link" className={linkColorClass} nativeButton={false} render={
                    <Link to={path} onClick={() => setActiveMenuItemState(menuItem)}>
                        <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t(`userHome.${key}.action`))}}/>
                        <ArrowRightIcon/>
                    </Link>
                }/>
            </CardContent>
        </Card>
    );

    return (
        <div className="home-container">
            <div className="home-welcome">
                <h1 className="text-[length:var(--text-2xl-font-size)] m-0">{I18n.t("userHome.title")}</h1>
                <p>{I18n.t("userHome.subTitle")}</p>
            </div>
            <div className="info-container">
                {welcomeCard("addApps", WelcomeAddApps, mainMenuItems.yourApps, `/organization/${currentOrganization.id}`, "link-green")}
                {welcomeCard("discoverApps", WelcomeDiscoverApps, mainMenuItems.catalogue, "/catalogue", "link-blue")}
                {welcomeCard("setupAccess", WelcomeSetupAccess, mainMenuItems.accessibleApps, "/accessible-apps", "link-purple")}
            </div>
        </div>
    )
};
export default UserHome;
