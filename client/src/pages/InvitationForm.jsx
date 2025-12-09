import React, {useEffect, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {useAppStore} from "../stores/AppStore";
import I18n from "../locale/I18n";
import {createInvitation, organizationForInvitationById} from "../api";
import {Button, ButtonType, Loader} from "@surfnet/sds";
import "./InvitationForm.scss";
import InputField from "../components/InputField";
import {isEmpty} from "../utils/Utils";
import ErrorIndicator from "../components/ErrorIndicator";
import SelectField from "../components/SelectField";
import EmailField from "../components/EmailField";
import {allAuthorities, authorities, authorityWeights, currentUserMembershipAuthority} from "../utils/Permissions.js";
import {TabHeader} from "../components/TabHeader.jsx";
import {mainMenuItems} from "../utils/MenuItems.js";

export const InvitationForm = () => {
    const navigate = useNavigate();

    const {organizationId, applicationId} = useParams();

    const languageOptions = ["en", "nl"].map(lang => ({label: I18n.t(`languages.${lang}`), value: lang}))

    const user = useAppStore(state => state.user);
    const setFlash = useAppStore(state => state.setFlash);

    const [currentUserAuthority, setCurrentUserAuthority] = useState({});
    const [organization, setOrganization] = useState({});
    const [loading, setLoading] = useState(true);
    const [invitation, setInvitation] = useState({
        invites: [],
        applicationIdentifiers: [],
        intendedAuthority: authorities.GUEST
    });

    const [initial, setInitial] = useState(true);
    const [language, setLanguage] = useState(I18n.locale === "en" ? languageOptions[0] : languageOptions[1]);
    const required = ["intendedAuthority", "invites"];

    useEffect(() => {
        organizationForInvitationById(organizationId)
            .then(res => {
                setOrganization(res);
                useAppStore.setState({
                    breadcrumbPaths: [
                        {path: "/home", value: I18n.t("breadCrumb.access"), menuItemName: mainMenuItems.home},
                        {path: `/users/${organizationId}/team`, value: I18n.t("navigation.users"), menuItemName: mainMenuItems.users},
                        {value: I18n.t("breadCrumb.invitations")}
                    ]
                });
                setLoading(false);
                const membership = (user.organizationMemberships || []).find(membership => membership.organization.id === res.id);
                setCurrentUserAuthority(currentUserMembershipAuthority(user, membership));
                if (applicationId) {
                    const newInvitation = {...invitation, applicationIdentifiers: [parseInt(applicationId, 10)]};
                    setInvitation(newInvitation)
                }
            });
    }, [organizationId]);// eslint-disable-line react-hooks/exhaustive-deps

    const submit = () => {
        setInitial(false);
        if (isValid()) {
            const invitationRequest = {
                ...invitation,
                language: language.value,
                organizationId: organizationId
            };
            setLoading(true);
            createInvitation(invitationRequest)
                .then(() => {
                    setLoading(false);
                    setFlash(I18n.t("invitation.createFlash"));
                    navigate(`/users/${organizationId}/invitations`);
                });
        }
    }

    const isValid = () => {
        return required.every(attr => !isEmpty(invitation[attr]));
    }

    const addEmails = emails => {
        const newEmails = [...new Set(invitation.invites.concat(emails))]
        setInvitation({...invitation, invites: newEmails});
    }

    const removeMail = mail => {
        setInvitation({...invitation, invites: invitation.invites.filter(email => mail !== email)});
    }

    const authorityChanged = option => {
        setInvitation({
            ...invitation,
            intendedAuthority: option.value
        });
    }

    const applicationChanged = options => {
        setInvitation({
            ...invitation,
            applicationIdentifiers: isEmpty(options) ? [] : options.map(option => option.value)
        });
    }

    const applicationOption = application => {
        return {
            value: application.id,
            label: application.name
        }
    };

    const renderFormElements = authorityOptions => {
        return (
            <>
                <EmailField
                    name={I18n.t("invitation.invitees")}
                    addEmails={addEmails}
                    emails={invitation.invites}
                    isAdmin={false}
                    pinnedEmails={[]}
                    removeMail={removeMail}
                    required={true}
                    error={!initial && isEmpty(invitation.invites)}/>

                {(!initial && isEmpty(invitation.invites)) &&
                    <ErrorIndicator msg={I18n.t("invitation.requiredEmail")}/>}

                {authorityOptions.length > 0 &&
                    <SelectField
                        value={authorityOptions.find(option => option.value === invitation.intendedAuthority)
                            || authorityOptions[authorityOptions.length - 1]}
                        options={authorityOptions}
                        name={I18n.t("invitation.intendedAuthority")}
                        searchable={false}
                        disabled={authorityOptions.length === 1}
                        onChange={authorityChanged}
                        toolTip={I18n.t("invitation.intendedAuthorityTooltip")}
                        clearable={false}
                        className={"small"}
                    />}

                {organization.applications.length > 0 &&
                    <SelectField
                        value={organization.applications
                            .filter(app => invitation.applicationIdentifiers.includes(app.id))
                            .map(applicationOption)}
                        options={organization.applications
                            .filter(app => !invitation.applicationIdentifiers.includes(app.id))
                            .map(applicationOption)}
                        name={I18n.t("invitation.applications")}
                        searchable={true}
                        placeholder={I18n.t("invitation.applicationsPlaceHolder")}
                        isMulti={true}
                        onChange={applicationChanged}
                        toolTip={I18n.t("invitation.applicationsTooltip")}
                        clearable={true}
                    />}

                <InputField name={I18n.t("invitation.message")}
                            value={invitation.message}
                            onChange={e => setInvitation({...invitation, message: e.target.value})}
                            placeholder={I18n.t("invitation.messagePlaceholder")}
                            small={true}
                            cols={1}
                            multiline={true}/>

                <SelectField
                    value={language}
                    options={languageOptions}
                    name={I18n.t("languages.language")}
                    searchable={false}
                    onChange={val => setLanguage(val)}
                    toolTip={I18n.t("invitation.languageTooltip")}
                    clearable={false}
                    className={"small"}
                />
            </>
        );
    }

    const renderForm = () => {
        const disabledSubmit = !initial && !isValid();
        const authorityOptions = allAuthorities
            .filter(authority => currentUserAuthority === authorities.ADMIN ||
                authorityWeights[currentUserAuthority] > authorityWeights[authority])
            .map(authority => ({value: authority, label: I18n.t(`roles.${authority.toLowerCase()}`)}));
        return (
            <>
                {renderFormElements(authorityOptions)}

                <section className="actions">
                    <Button type={ButtonType.Secondary}
                            txt={I18n.t("forms.cancel")}
                            onClick={() => navigate(-1)}/>
                    <Button disabled={disabledSubmit}
                            txt={I18n.t("invitation.invite")}
                            onClick={submit}/>
                </section>


            </>
        );
    }

    if (loading) {
        return <Loader/>
    }
    return (
        <div className="mod-invitation-form">
            <TabHeader tab={"nope"} tabNames={[]}>
                <h3>{I18n.t("invitation.title", {name: organization.name})}</h3>
            </TabHeader>
            <div className={`invitation-form`}>
                {renderForm()}
            </div>
        </div>
    );
}