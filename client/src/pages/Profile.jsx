import React, {Fragment, useEffect, useState} from "react";
import {useAppStore} from "../stores/AppStore";
import "./Profile.scss";
import I18n from "../locale/I18n";
import ConfirmationDialog from "../components/ConfirmationDialog.jsx";
import DOMPurify from "dompurify";
import {Button, ButtonType, Checkbox, Tooltip} from "@surfnet/sds";
import {dateFromEpoch} from "../utils/Date.js";
import {isEmpty, stopEvent} from "../utils/Utils.js";
import {deleteUser, logout} from "../api/index.js";
import {SESSION_STORAGE_LOCATION} from "../utils/Login.js";
import {useNavigate} from "react-router";
import {mainMenuItems} from "../utils/MenuItems.js";
import InputField from "../components/InputField.jsx";
import {providerName} from "../utils/Manage.js";

const Profile = ({setIsAuthenticated}) => {

    const user = useAppStore(state => state.user);

    const [confirmation, setConfirmation] = useState({});
    const navigate = useNavigate();

    useEffect(() => {
        useAppStore.setState({
            breadcrumbPaths: [
                {path: "/home", value: I18n.t("profile.title"), menuItemName: mainMenuItems.home},
                {value: I18n.t("breadCrumb.profile")}
            ]
        });
    }, []);

    const doDelete = (e, confirmationRequired) => {
        stopEvent(e);
        if (confirmationRequired) {
            setConfirmation({
                open: true,
                cancel: () => setConfirmation({open: false}),
                action: () => doDelete(null, false),
                question: I18n.t("profile.deleteConfirmation"),
                okButton: I18n.t("forms.delete")
            });
        } else {
            deleteUser().then(() => {
                setConfirmation({});
                logout()
                    .then(() => {
                        useAppStore.setState(() => ({
                            currentOrganization: {name: ""},
                            breadcrumbPaths: [],
                            user: {name: ""}
                        }));
                        sessionStorage.removeItem(SESSION_STORAGE_LOCATION);
                        navigate("/authentication-switch");
                        setTimeout(() => {
                            setIsAuthenticated(false);
                            navigate("/home");
                        }, 150)
                    });
            })
        }
    }

    const {open, cancel, action, question, okButton} = confirmation;
    const applicationMemberships = (user.organizationMemberships || [])
        .map(orgMembership => orgMembership.applicationMemberships)
        .flat();
    const externalUser = user.externalUser;
    return (
        <div
            className="profile-outer-container">
            {open && <ConfirmationDialog confirm={action}
                                         cancel={cancel}
                                         confirmationHeader={I18n.t("forms.delete")}
                                         confirmationTxt={okButton}
                                         isDeleteAction={true}
                                         question={question}
            />}
            <div className="profile-header-container">
                <div className="top-header">
                    <h1>{user.name}</h1>
                </div>
                <p dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(I18n.t("profile.info",
                        {createdAt: dateFromEpoch(user.createdAt)}))
                }}/>
            </div>
            <div className="profile">
                {user.superUser &&
                    <InputField value={I18n.t("profile.superUser")}
                                noInput={true}
                    />
                }
                {user.institutionAdmin &&
                    <InputField name={I18n.t("profile.institutionAdmin", {orgName: providerName(I18n.locale, user.identityProvider)})}
                                noInput={true}
                    />
                }
                <div className="user-container">
                    <h5>{I18n.t("profile.attributes")}</h5>
                    {["name", "eduPersonPrincipalName", "email", "schacHomeOrganization"]
                        .map((attr, index) =>
                            <Fragment key={index}>
                                <InputField name={I18n.t(`profile.${attr}`)}
                                            value={user[attr]}
                                            noInput={true}
                                />
                            </Fragment>
                        )}

                    {!isEmpty(user.organizationMemberships) &&
                        <div className="multi-list">
                            <p>{I18n.t(`profile.organization${user.organizationMemberships.length > 1 ? "Multiple" : ""}`)}</p>
                            <ul>
                                {user.organizationMemberships.map((orgMembership, index) =>
                                    <li key={index}>
                                        <span> {`${orgMembership.organization.name}`}
                                            <em> {" - " + I18n.t(`roles.${orgMembership.authority.toLowerCase()}`)}</em>
                                        </span>
                                    </li>
                                )}
                            </ul>
                        </div>}
                    {!isEmpty(applicationMemberships) &&
                        <div className="multi-list">
                            <p>{I18n.t(`profile.application${applicationMemberships.length > 1 ? "Multiple" : ""}`)}</p>
                            <ul>
                                {applicationMemberships.map((appMembership, index) =>
                                    <li key={index}>
                                        <span> {`${appMembership.applicationName}`}
                                            <em> {" - " + I18n.t(`roles.${appMembership.authority.toLowerCase()}`)}</em>
                                        </span>
                                    </li>
                                )}
                            </ul>
                        </div>}
                    {externalUser &&
                        <div className="multi-list">
                        <div className="external-user-container">
                            <p>{I18n.t("profile.externalUser")}</p>
                            <Tooltip tip={I18n.t("profile.externalUserTooltip")}/>
                        </div>
                        <Checkbox value={externalUser}
                                  readOnly={true}/>
                    </div>}
                    {!externalUser &&
                        <div className="multi-list">
                            <div className="external-user-container">
                                <p>{I18n.t("profile.internalUser")}</p>
                                <Tooltip tip={I18n.t("profile.internalUserTooltip")}/>
                            </div>
                            <Checkbox value={!externalUser}
                                      readOnly={true}/>
                        </div>}
                </div>
                <div className="delete-container">
                    <Button onClick={e => doDelete(e, true)}
                            type={ButtonType.DestructiveSecondary}
                            txt={I18n.t("profile.delete")}
                    />
                </div>
            </div>
        </div>

    )

};
export default Profile;