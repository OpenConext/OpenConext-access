import "./UserHomeMember.scss";
import React, {useEffect, useState} from "react";
import {Link} from "react-router";
import {useShallow} from "zustand/react/shallow";
import {Badge, Button, Spinner} from "@surfnet/curve-react";
import {ArrowRightIcon, CaretRightIcon} from "@phosphor-icons/react";
import I18n from "../locale/I18n";
import {useAppStore} from "../stores/AppStore";
import {isEmpty} from "../utils/Utils.js";
import {hasApplicationWriteAccess} from "../utils/Permissions.js";
import {applicationPath, convertServerApplicationToClient} from "../utils/Application.js";
import {inviteRoleHref, inviteRolesHref, mainMenuItems} from "../utils/MenuItems.js";
import {myRoles, organizationApplicationsById} from "../api/index.js";
import {ApplicationStatusBadge} from "../components/ApplicationStatusBadge.jsx";
import ImageNotFound from "../icons/image-not-found.svg";
import UserHome from "./UserHome.jsx";

const MAX_ROLE_APPLICATIONS = 2;

const roleApplicationNames = role => (role.applicationMaps || [])
    .map(application => application[`name:${I18n.locale}`] || application["name:en"] || application["name:nl"])
    .filter(name => !isEmpty(name));

const SectionHeader = ({title, buttonLabel, buttonLink, onClick}) => (
    <div className="section-header">
        <h2>{title}</h2>
        <Button size="sm" nativeButton={false} render={
            <Link to={buttonLink} onClick={onClick}>
                {buttonLabel}
                <ArrowRightIcon/>
            </Link>
        }/>
    </div>
);

const UserHomeMember = () => {

    const {user, currentOrganization, config} = useAppStore(useShallow(state => ({
        user: state.user,
        currentOrganization: state.currentOrganization,
        config: state.config
    })));

    const [apps, setApps] = useState(null);
    const [roles, setRoles] = useState(null);

    useEffect(() => {
        useAppStore.setState({
            breadcrumbPaths: [
                {path: "/home", value: I18n.t("breadCrumb.home"), menuItemName: mainMenuItems.home}
            ]
        });
        //Only the applications the member is allowed to edit are managed by the member
        organizationApplicationsById(currentOrganization.id)
            .then(res => setApps(res.applications
                .map(application => convertServerApplicationToClient(application))
                .filter(application => hasApplicationWriteAccess(user, application))
                .sort((a1, a2) => a1.name.toLowerCase().localeCompare(a2.name.toLowerCase()))))
            .catch(() => setApps([]));
        //Invite can be unavailable, the home page must not depend on it
        myRoles()
            .then(res => setRoles(res || []))
            .catch(() => setRoles([]));
    }, [currentOrganization.id, user]);

    if (apps === null || roles === null) {
        return <div className="loading-container"><Spinner className="size-8"/></div>
    }

    //Nothing to manage, so the same tiles as for the administrators
    if (isEmpty(apps) && isEmpty(roles)) {
        return <UserHome/>;
    }

    const rolesHref = inviteRolesHref(config);
    const setActiveMenuItem = menuItem => useAppStore.setState({activeMenuItem: menuItem});

    const roleRow = role => {
        const names = roleApplicationNames(role);
        const rest = names.length - MAX_ROLE_APPLICATIONS;
        const content = (
            <>
                <div className="item-content">
                    <span className="item-title">{role.name}</span>
                    <span className="item-description">{I18n.t("userHome.usersCount", {count: role.userRoleCount || 0})}</span>
                </div>
                <div className="role-applications">
                    {names.slice(0, MAX_ROLE_APPLICATIONS).map(name => <Badge key={name} variant="outline">{name}</Badge>)}
                    {rest > 0 && <span>{`+${rest}`}</span>}
                </div>
                <CaretRightIcon size={24}/>
            </>
        );
        const roleHref = inviteRoleHref(config, role.id);
        return roleHref.startsWith("http") ?
            <a key={role.id} className="item role-item" href={roleHref}>{content}</a> :
            <Link key={role.id} className="item role-item" to={roleHref}
                  onClick={() => setActiveMenuItem(mainMenuItems.invite)}>{content}</Link>;
    }

    return (
        <div className="home-container user-home-member">
            <div className="home-welcome">
                <h1 className="text-[length:var(--text-2xl-font-size)] m-0">{I18n.t("userHome.title")}</h1>
                <p>{I18n.t("userHome.subTitle")}</p>
            </div>
            <section>
                <SectionHeader title={I18n.t("userHome.appsYouManage")}
                               buttonLabel={I18n.t("userHome.toMyApps")}
                               buttonLink={`/organization/${currentOrganization.id}`}
                               onClick={() => setActiveMenuItem(mainMenuItems.yourApps)}/>
                <div className="items">
                    {apps.map(application =>
                        <Link key={application.id} className="item app-item" to={applicationPath(application)}>
                            {isEmpty(application.logoUrl) ? <ImageNotFound className="app-logo"/> :
                                <img className="app-logo" src={application.logoUrl} alt=""/>}
                            <span className="item-title">{application.name}</span>
                            <ApplicationStatusBadge application={application}/>
                            <CaretRightIcon size={24}/>
                        </Link>)}
                </div>
            </section>
            <section>
                <SectionHeader title={I18n.t("userHome.rolesYouManage")}
                               buttonLabel={I18n.t("userHome.toRoles")}
                               buttonLink={rolesHref}
                               onClick={() => setActiveMenuItem(mainMenuItems.invite)}/>
                <div className="items">
                    {roles.map(roleRow)}
                </div>
            </section>
        </div>
    );
};
export default UserHomeMember;
