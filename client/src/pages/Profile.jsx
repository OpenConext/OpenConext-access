import React, {useEffect, useState} from "react";
import {Link} from "react-router";
import {useShallow} from "zustand/react/shallow";
import {Button} from "@surfnet/curve-react";
import {UserCircleIcon} from "@phosphor-icons/react";
import {useAppStore} from "../stores/AppStore";
import "./Profile.scss";
import I18n from "../locale/I18n";
import {dateFromEpoch} from "../utils/Date.js";
import {isEmpty} from "../utils/Utils.js";
import {inviteRoleHref, mainMenuItems} from "../utils/MenuItems.js";
import {AppLogo} from "../components/AppLogo.jsx";
import {myRoles, organizationApplicationsById} from "../api/index.js";
import {hasApplicationWriteAccess} from "../utils/Permissions.js";
import {convertServerApplicationToClient} from "../utils/Application.js";
import {providerName} from "../utils/Manage.js";

const AppTile = ({logo, name, organization}) => (
    <div className="app-tile">
        <AppLogo className="app-tile-logo" src={logo}/>
        <div className="app-tile-text">
            <p className="app-tile-name">{name}</p>
            <p className="app-tile-organization">{organization}</p>
        </div>
    </div>
);

const Attribute = ({label, children}) => (
    <div className="attribute">
        <span className="attribute-label">{label}</span>
        <div className="attribute-value">{children}</div>
    </div>
);

//The applications of a role are enriched by Invite with the (flattened) Manage metadata of the application
const roleApplication = (application, locale) => ({
    name: application[`name:${locale}`] || application["name:en"] || application["name:nl"] || application.landingPage,
    logo: application["logo:0:url"] || application.logo,
    organization: application[`OrganizationName:${locale}`] || application["OrganizationName:en"] || application["OrganizationName:nl"]
});

const Profile = () => {

    const {user, currentOrganization, config} = useAppStore(useShallow(state => ({
        user: state.user,
        currentOrganization: state.currentOrganization,
        config: state.config
    })));

    const [apps, setApps] = useState([]);
    const [roles, setRoles] = useState([]);

    useEffect(() => {
        useAppStore.setState({
            breadcrumbPaths: [
                {path: "/home", value: I18n.t("breadCrumb.home"), menuItemName: mainMenuItems.home},
                {value: I18n.t("breadCrumb.profile")}
            ]
        });
    }, []);

    useEffect(() => {
        //Both sources are optional for the profile, Invite can be unavailable
        myRoles()
            .then(res => setRoles(res || []))
            .catch(() => setRoles([]));
        if (currentOrganization?.id) {
            organizationApplicationsById(currentOrganization.id)
                .then(res => setApps(res.applications
                    .map(application => convertServerApplicationToClient(application))
                    .filter(application => hasApplicationWriteAccess(user, application))
                    .sort((a1, a2) => a1.name.toLowerCase().localeCompare(a2.name.toLowerCase()))))
                .catch(() => setApps([]));
        }
    }, [currentOrganization?.id, user]);

    const organizationName = isEmpty(currentOrganization?.identityProvider) ? currentOrganization?.name :
        providerName(I18n.locale, currentOrganization.identityProvider);
    const memberships = user.organizationMemberships || [];

    const attributes = [
        {label: I18n.t("profile.name"), value: user.name},
        {label: I18n.t("profile.sub"), value: user.sub},
        {label: I18n.t("profile.eduPersonPrincipalName"), value: user.eduPersonPrincipalName},
        {label: I18n.t("profile.institution"), value: user.schacHomeOrganization},
        {label: I18n.t("profile.email"), value: user.email},
        {label: I18n.t("profile.authenticatingAuthority"), value: user.authenticatingAuthority},
        {label: I18n.t("profile.lastActivity"), value: dateFromEpoch(user.lastActivity)},
        {label: I18n.t("profile.organizationGuid"), value: user.organizationGUID},
        {label: I18n.t("profile.createdAt"), value: dateFromEpoch(user.createdAt)},
        {label: I18n.t(`profile.${user.externalUser ? "externalUser" : "internalUser"}`), value: I18n.t("profile.yes")},
    ].filter(attribute => !isEmpty(attribute.value));

    return (
        <div className="profile-container">
            <div className="profile-header">
                <UserCircleIcon size={64} weight="light"/>
                <div className="profile-header-text">
                    <h1 className="text-[length:var(--text-2xl-font-size)]">{user.name}</h1>
                    <p className="profile-email">{user.email}</p>
                    {user.superUser && <p className="profile-badge">{I18n.t("profile.superUser")}</p>}
                    {(!user.superUser && user.institutionAdmin) &&
                        <p className="profile-badge">{I18n.t("profile.institutionAdmin", {orgName: organizationName})}</p>}
                </div>
            </div>

            <div className="profile-attributes">
                {attributes.map(attribute =>
                    <Attribute key={attribute.label} label={attribute.label}>
                        <p>{attribute.value}</p>
                    </Attribute>)}
                {!isEmpty(memberships) &&
                    <Attribute label={I18n.t(`profile.organization${memberships.length > 1 ? "Multiple" : ""}`)}>
                        {memberships.map((membership, index) =>
                            <p key={index}>{`${membership.organization.name} – ${I18n.t(`roles.${membership.authority.toLowerCase()}`)}`}</p>)}
                    </Attribute>}
            </div>

            {!isEmpty(apps) &&
                <section className="profile-section">
                    <h2>{I18n.t("profile.appTeams")}</h2>
                    <div className="profile-card">
                        <div className="profile-card-header">
                            <div className="profile-card-title">
                                <h3>{I18n.t("profile.appsYouManage")}</h3>
                                <p>{I18n.t("profile.appTeamsInfo")}</p>
                            </div>
                            <Button variant="outline" nativeButton={false} render={
                                <Link to={`/organization/${currentOrganization.id}`}
                                      onClick={() => useAppStore.setState({activeMenuItem: mainMenuItems.yourApps})}>
                                    {I18n.t("profile.toMyApps")}
                                </Link>
                            }/>
                        </div>
                        <div className="profile-card-footer">
                            <div className="app-tiles">
                                {apps.map(application =>
                                    <AppTile key={application.id}
                                             logo={application.logoUrl}
                                             name={application.name}
                                             organization={organizationName}/>)}
                            </div>
                        </div>
                    </div>
                </section>}

            {!isEmpty(roles) &&
                <section className="profile-section">
                    <h2>{I18n.t("profile.rolesTitle")}</h2>
                    {roles.map(role => {
                        const roleApplications = (role.applicationMaps || [])
                            .map(application => roleApplication(application, I18n.locale))
                            .filter(application => !isEmpty(application.name));
                        return (
                            <div className="profile-card" key={role.id}>
                                <div className="profile-card-header">
                                    <div className="profile-card-title">
                                        <h3>{role.name}</h3>
                                        {!isEmpty(role.description) && <p>{role.description}</p>}
                                    </div>
                                    <Button variant="outline" nativeButton={false} render={
                                        <a href={inviteRoleHref(config, role.id, currentOrganization?.id)}>
                                            {I18n.t("profile.viewRole")}
                                        </a>
                                    }/>
                                </div>
                                {!isEmpty(roleApplications) &&
                                    <div className="profile-card-footer">
                                        <p className="profile-card-info">{I18n.t("profile.roleAccess")}</p>
                                        <div className="app-tiles">
                                            {roleApplications.map((application, index) =>
                                                <AppTile key={index}
                                                         logo={application.logo}
                                                         name={application.name}
                                                         organization={application.organization}/>)}
                                        </div>
                                    </div>}
                            </div>
                        );
                    })}
                </section>}
        </div>
    );

};
export default Profile;
