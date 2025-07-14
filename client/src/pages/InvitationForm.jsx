import React, {useEffect, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {useAppStore} from "../stores/AppStore";
import I18n from "../locale/I18n";
import {createInvitation, organizationNameById} from "../api";
import {Button, ButtonType, Loader} from "@surfnet/sds";
import "./InvitationForm.scss";
import InputField from "../components/InputField";
import {isEmpty} from "../utils/Utils";
import ErrorIndicator from "../components/ErrorIndicator";
import SelectField from "../components/SelectField";
import EmailField from "../components/EmailField";
import {allAuthorities, authorities} from "../utils/Permissions.js";
import {TabHeader} from "../components/TabHeader.jsx";

export const InvitationForm = () => {
    const navigate = useNavigate();

    const {organizationId} = useParams();

    const languageOptions = ["en", "nl"].map(lang => ({label: I18n.t(`languages.${lang}`), value: lang}))
    const {user, setFlash, config} = useAppStore(state => state);

    const [organizationName, setOrganizationName] = useState(false);
    const [loading, setLoading] = useState(false);
    const [guest, setGuest] = useState(false);
    const [roles, setRoles] = useState([]);
    const [selectedRoles, setSelectedRoles] = useState([]);
    const [invitation, setInvitation] = useState({
        invites: [],
        intendedAuthority: authorities.GUEST
    });

    const [initial, setInitial] = useState(true);
    const [language, setLanguage] = useState(I18n.locale === "en" ? languageOptions[0] : languageOptions[1]);
    const required = ["intendedAuthority", "invites"];

    useEffect(() => {
        organizationNameById(organizationId)
            .then(res => {
                setOrganizationName(res.name);
                useAppStore.setState({
                    breadcrumbPath: [
                        {path: "/home", value: I18n.t("breadCrumb.access")},
                        {path: `/organization/${organizationId}`, value: res.name},
                        {value: I18n.t("breadCrumb.invitations")}
                    ]
                })
            });
    }, [organizationId]);// eslint-disable-line react-hooks/exhaustive-deps

    const submit = () => {
        setInitial(false);
        if (isValid()) {
            const invitationRequest = {
                ...invitation,
                language: language.value
            };
            setLoading(true);
            createInvitation(invitationRequest)
                .then(() => {
                    setLoading(false);
                    setFlash(I18n.t("invitation.createFlash"));
                    if (originalRoleId) {
                        navigate(`/roles/${originalRoleId}/invitations`);
                    } else if (!isEmpty(invitationRequest.roleIdentifiers)) {
                        navigate(`/roles/${invitationRequest.roleIdentifiers[0]}/invitations`);
                    } else {
                        navigate(-1);
                    }
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
            intendedAuthority: option.value,
            roleExpiryDate: defaultRoleExpiryDate(selectedRoles)
        });
    }

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

                {authorityOptions.length > 1 && <SelectField
                    value={authorityOptions.find(option => option.value === invitation.intendedAuthority)
                        || authorityOptions[authorityOptions.length - 1]}
                    options={authorityOptions}
                    name={I18n.t("invitation.intendedAuthority")}
                    searchable={false}
                    disabled={authorityOptions.length === 1}
                    onChange={authorityChanged}
                    toolTip={I18n.t("tooltips.intendedAuthorityTooltip")}
                    clearable={false}
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
                    toolTip={I18n.t("languages.languageTooltip")}
                    clearable={false}
                />
            </>
        );
    }

    const renderForm = () => {
        const disabledSubmit = !initial && !isValid();
        const authorityOptions = allAuthorities
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
        <div className={`mod-invitation-form inviter`}>
            <TabHeader tab={"nope"} tabNames={[]}>
                <h3>{I18n.t("invitation.title", {name: organizationName})}</h3>
            </TabHeader>
            <div className={`invitation-form`}>
                {renderForm()}
            </div>
        </div>
    );
}