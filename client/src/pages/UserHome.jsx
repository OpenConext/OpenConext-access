import "./UserHome.scss";
import React, {useEffect, useState} from "react";
import {useAppStore} from "../stores/AppStore";
import {Alert, AlertDescription, AlertTitle, Badge, Button, Card, CardContent, CardDescription, CardTitle, Spinner} from "@surfnet/curve-react";
import {ArrowRightIcon, HourglassIcon} from "@phosphor-icons/react";
import I18n from "../locale/I18n";
import {isEmpty, sanitize} from "../utils/Utils.js";
import {Link, Navigate} from "react-router";
import {mainMenuItems} from "../utils/MenuItems.js";
import {useShallow} from "zustand/react/shallow";
import WelcomeAddApps from "../icons/figma/welcome-add-apps.svg";
import WelcomeDiscoverApps from "../icons/figma/welcome-discover-apps.svg";
import WelcomeSetupAccess from "../icons/figma/welcome-setup-access.svg";
import {getParameterByName} from "../utils/QueryParameters.js";
import {hasCreateApplicationAccess} from "../utils/Permissions.js";
import {applicationsCountByOrganization, connectedAppsByIdentityProvider} from "../api/index.js";

const UserHome = () => {

    const {user, currentOrganization, config} = useAppStore(useShallow(state => ({
        user: state.user,
        currentOrganization: state.currentOrganization,
        config: state.config
    })));

    const [appsCount, setAppsCount] = useState(null);
    const [connectedAppsCount, setConnectedAppsCount] = useState(null);

    let newLocation = null;
    if (isEmpty(user.joinRequests) && isEmpty(currentOrganization?.id)) {
        newLocation = "/landing"
    }

    const isVendor = isEmpty(currentOrganization?.manageIdentifier);
    const maySeeAccessibleApps = hasCreateApplicationAccess(user, currentOrganization);

    useEffect(() => {
        if (newLocation === null) {
            useAppStore.setState({
                breadcrumbPaths: [
                    {path: "/home", value: I18n.t("breadCrumb.home"), menuItemName: mainMenuItems.home}
                ]
            });
        }
    }, [newLocation]);

    //Fetched asynchronously - the page renders immediately and each badge shows a
    //Spinner in the meantime, so this must not block the initial render.
    useEffect(() => {
        if (newLocation === null && currentOrganization?.id ) {
            applicationsCountByOrganization(currentOrganization.id).then(setAppsCount);
            if (!isVendor && maySeeAccessibleApps) {
                connectedAppsByIdentityProvider(currentOrganization.id).then(setConnectedAppsCount);
            }
        }
    }, [newLocation]);// eslint-disable-line react-hooks/exhaustive-deps

    if (newLocation !== null) {
        return <Navigate to={newLocation} replace/>;
    }

    const setActiveMenuItemState = menuItem => {
        useAppStore.setState(() => ({
            activeMenuItem: menuItem
        }));
    }

    const alertInfo = () => {
        const isNew = getParameterByName("new");
        if (isNew) {
            return (
                <Alert variant={"info"} className="w-[520px]">
                    <HourglassIcon/>
                    <AlertTitle dangerouslySetInnerHTML={{__html: sanitize(I18n.t("userHome.newOrganizationTitle", {name: currentOrganization?.name}))}}/>
                    <AlertDescription dangerouslySetInnerHTML={{__html: sanitize(I18n.t("userHome.newOrganizationDescription"))}}/>
                </Alert>
            )
        }
        if (!currentOrganization?.id && !isEmpty(user.joinRequests)) {
            return (
                <Alert variant={"info"} className="w-[520px]">
                    <HourglassIcon/>
                    <AlertDescription dangerouslySetInnerHTML={{__html: sanitize(I18n.t("userHome.newJoinRequestDescription", {name: user.joinRequests[0].organization.name}))}}/>
                </Alert>
            )
        }
    }

    const welcomeCard = (key, Illustration, menuItem, path, linkColorClass, badgeColorClass, count) => (
        <Card key={key}>
            <CardContent>
                <CardTitle>{I18n.t(`userHome.${key}.title`)}</CardTitle>
                {Illustration &&
                    <div className="illustration">
                        <Illustration/>
                    </div>}
                <CardDescription>{I18n.t(`userHome.${key}.description`)}</CardDescription>
                <div className="action-row">
                    <Button variant="link" className={linkColorClass} nativeButton={false} render={
                        <Link to={path} onClick={() => setActiveMenuItemState(menuItem)}>
                            <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t(`userHome.${key}.action`))}}/>
                            <ArrowRightIcon/>
                        </Link>
                    }/>
                    <Badge className={`apps-count-badge ${badgeColorClass}`}>
                        {count === null ? <Spinner/> : I18n.t("userHome.appsCount", {count})}
                    </Badge>
                </div>
            </CardContent>
        </Card>
    );
    const discoverAppsCount = (config.stats.saml20_sp || 0) + (config.stats.oidc10_rp || 0);
    return (
        <div className="home-container">
            <div className="home-welcome">
                <h1 className="text-[length:var(--text-2xl-font-size)] m-0">{I18n.t("userHome.title")}</h1>
                <p>{I18n.t("userHome.subTitle")}</p>
            </div>
            {alertInfo()}
            <div className="info-container">
                {currentOrganization?.id && welcomeCard("addApps", WelcomeAddApps, mainMenuItems.yourApps, `/organization/${currentOrganization.id}`, "link-green", "badge-green", appsCount)}
                {!isVendor && welcomeCard("discoverApps", WelcomeDiscoverApps, mainMenuItems.catalogue, "/catalogue", "link-blue", "badge-blue", discoverAppsCount)}
                {(!isVendor && maySeeAccessibleApps) && welcomeCard("setupAccess", WelcomeSetupAccess, mainMenuItems.accessibleApps, "/accessible-apps", "link-purple", "badge-purple", connectedAppsCount)}
            </div>
        </div>
    )
};
export default UserHome;
