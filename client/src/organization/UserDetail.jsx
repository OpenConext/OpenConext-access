import "./UserDetail.scss";
import React, {useEffect, useState} from "react";
import {Link, useNavigate, useParams} from "react-router";
import {Button, Spinner} from "@surfnet/curve-react";
import {TrashIcon, UserCircleIcon} from "@phosphor-icons/react";
import I18n from "../locale/I18n";
import {useAppStore} from "../stores/AppStore";
import {useShallow} from "zustand/react/shallow";
import SelectField from "../components/SelectField.jsx";
import ConfirmationDialog from "../components/ConfirmationDialog.jsx";
import {
    changeOrganizationMembershipById,
    createApplicationMembership,
    deleteApplicationMembershipById,
    deleteOrganizationMembershipById,
    organizationApplicationsById,
    organizationMembershipDetail
} from "../api/index.js";
import {allAuthorities, authorities} from "../utils/Permissions.js";
import {dateFromEpoch} from "../utils/Date.js";
import {isEmpty} from "../utils/Utils.js";
import {inviteRoleHref, mainMenuItems} from "../utils/MenuItems.js";

const Property = ({label, value}) => (
    <div className="user-property">
        <span className="property-label">{label}</span>
        <span className="property-value">{isEmpty(value) ? "-" : value}</span>
    </div>
);

export const UserDetail = ({refreshUser}) => {
    const {organizationId, membershipId} = useParams();
    const navigate = useNavigate();
    const {user: currentUser, config, setFlash} = useAppStore(useShallow(state => ({
        user: state.user,
        config: state.config,
        setFlash: state.setFlash
    })));

    const [loading, setLoading] = useState(true);
    const [detail, setDetail] = useState(null);
    const [applications, setApplications] = useState([]);
    const [authority, setAuthority] = useState(null);
    const [selectedApplicationIds, setSelectedApplicationIds] = useState([]);
    const [confirmation, setConfirmation] = useState({});

    const usersPath = `/users/${organizationId}`;

    useEffect(() => {
        Promise.all([organizationMembershipDetail(membershipId), organizationApplicationsById(organizationId)])
            .then(([res, organization]) => {
                setDetail(res);
                setAuthority(res.authority);
                setSelectedApplicationIds(res.applicationMemberships.map(am => am.applicationId));
                setApplications((organization.applications || [])
                    .sort((a1, a2) => a1.name.toLowerCase().localeCompare(a2.name.toLowerCase())));
                useAppStore.setState({
                    breadcrumbPaths: [
                        {path: "/home", value: I18n.t("breadCrumb.access"), menuItemName: mainMenuItems.home},
                        {path: usersPath, value: I18n.t("navigation.users"), menuItemName: mainMenuItems.users},
                        {value: res.user.name}
                    ],
                    activeMenuItem: mainMenuItems.users
                });
                setLoading(false);
            })
            .catch(() => navigate(usersPath));
    }, [membershipId, organizationId]);// eslint-disable-line react-hooks/exhaustive-deps

    if (loading) {
        return <div className="loading-container"><Spinner className="size-8"/></div>
    }

    const isSelf = detail.user.id === currentUser.id;
    const isIdPAdmin = detail.authority === authorities.ADMIN && !isEmpty(detail.manageIdentifier);
    const isLastAdmin = detail.authority === authorities.ADMIN && detail.nbrOfAdmins < 2;
    //We need to ensure that one admin remains, and institution admins of an IdP are managed in Manage
    const locked = isIdPAdmin || isLastAdmin;

    const authorityOptions = allAuthorities
        .filter(a => a !== authorities.ADMIN || detail.authority === authorities.ADMIN || isEmpty(detail.manageIdentifier))
        .map(a => ({value: a, label: I18n.t(`roles.${a.toLowerCase()}`)}));
    const applicationOptions = applications.map(application => ({value: application.id, label: application.name}));

    const finish = (flashKey, name) => {
        setConfirmation({});
        setFlash(I18n.t(flashKey, {name}));
        refreshUser(() => navigate(usersPath));
    }

    //The values are passed in, as the confirmation action is created when the dialog opens
    const doSave = (newAuthority, applicationIds) => {
        const calls = [];
        if (newAuthority !== detail.authority) {
            calls.push(changeOrganizationMembershipById({id: detail.id}, newAuthority));
        }
        detail.applicationMemberships
            .filter(am => !applicationIds.includes(am.applicationId))
            .forEach(am => calls.push(deleteApplicationMembershipById(am)));
        applicationIds
            .filter(id => !detail.applicationMemberships.some(am => am.applicationId === id))
            .forEach(id => calls.push(createApplicationMembership(detail.id, id, detail.organizationId)));
        Promise.all(calls).then(() => finish("userDetail.updated", detail.user.name));
    }

    const save = () => {
        if (isSelf && authority !== authorities.ADMIN && detail.authority === authorities.ADMIN) {
            setConfirmation({
                open: true,
                cancel: () => setConfirmation({}),
                action: () => doSave(authority, selectedApplicationIds),
                question: I18n.t("teamManagement.deleteDemotion"),
                okButton: I18n.t("forms.sure")
            });
        } else {
            doSave(authority, selectedApplicationIds);
        }
    }

    const remove = () => setConfirmation({
        open: true,
        cancel: () => setConfirmation({}),
        action: () => deleteOrganizationMembershipById({id: detail.id})
            .then(() => finish("teamManagement.flash.deleted", detail.user.name)),
        question: I18n.t("userDetail.deleteConfirmation", {name: detail.user.name}),
        okButton: I18n.t("forms.delete"),
        isDeleteAction: true
    });

    const roleLink = role => {
        const href = inviteRoleHref(config, role.id, detail.organizationId);
        const button = <Button variant="outline">{I18n.t("userDetail.viewRole")}</Button>;
        return href.startsWith("http") ?
            <a href={href}>{button}</a> :
            <Link to={href} onClick={() => useAppStore.setState({activeMenuItem: mainMenuItems.invite})}>{button}</Link>;
    }

    const {open, cancel, action, question, okButton, isDeleteAction} = confirmation;
    return (
        <div className="user-detail-container">
            {open && <ConfirmationDialog confirm={action}
                                         cancel={cancel}
                                         isDeleteAction={isDeleteAction}
                                         confirmationHeader={isDeleteAction ? I18n.t("forms.delete") : null}
                                         confirmationTxt={okButton}
                                         question={question}/>}
            <div className="user-detail">
                <div className="user-header">
                    <UserCircleIcon size={48} aria-hidden="true"/>
                    <div className="user-title">
                        <h1 className="text-[length:var(--text-2xl-font-size)]">{detail.user.name}</h1>
                        <span>{detail.user.email}</span>
                    </div>
                    {!locked && <Button variant="outline" onClick={remove}>
                        <TrashIcon aria-hidden="true"/>
                        {I18n.t("userDetail.delete")}
                    </Button>}
                </div>
                <div className="user-properties">
                    <Property label={I18n.t("userDetail.name")} value={detail.user.name}/>
                    <Property label={I18n.t("userDetail.sub")} value={detail.user.sub}/>
                    <Property label={I18n.t("userDetail.eppn")} value={detail.user.eduPersonPrincipalName}/>
                    <Property label={I18n.t("userDetail.institution")} value={detail.organizationName}/>
                    <Property label={I18n.t("userDetail.email")} value={detail.user.email}/>
                    <Property label={I18n.t("userDetail.lastActive")} value={dateFromEpoch(detail.user.lastActivity)}/>
                    <Property label={I18n.t("userDetail.guid")} value={detail.user.organizationGUID}/>
                </div>
                <SelectField name={I18n.t("userDetail.role")}
                             value={authorityOptions.find(o => o.value === authority)}
                             options={authorityOptions}
                             disabled={locked}
                             onChange={option => setAuthority(option.value)}/>
                <SelectField name={I18n.t("userDetail.appMgmt")}
                             info={I18n.t("userDetail.appMgmtInfo")}
                             infoUnderLabel={true}
                             isMulti={true}
                             searchable={true}
                             placeholder={I18n.t("userDetail.appPlaceholder")}
                             value={applicationOptions.filter(o => selectedApplicationIds.includes(o.value))}
                             options={applicationOptions}
                             onChange={options => setSelectedApplicationIds((options || []).map(o => o.value))}/>
                {!isEmpty(detail.roles) && <section className="user-roles">
                    <h2>{I18n.t("userDetail.roles")}</h2>
                    {detail.roles.map(role => (
                        <div key={role.id} className="role-card">
                            <div className="role-card-text">
                                <span className="role-name">{role.name}</span>
                                <span className="role-function">{I18n.t("userDetail.roleManager")}</span>
                            </div>
                            {roleLink(role)}
                        </div>))}
                </section>}
                <div className="user-actions">
                    <Button variant="outline" onClick={() => navigate(usersPath)}>{I18n.t("forms.cancel")}</Button>
                    <Button onClick={save}>{I18n.t("forms.save")}</Button>
                </div>
            </div>
        </div>
    );
};
