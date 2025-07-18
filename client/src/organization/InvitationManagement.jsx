import "./InvitationManagement.scss";
import React, {useState} from "react";
import I18n from "../locale/I18n";
import {Entities} from "../components/Entities.jsx";
import {dateFromEpoch} from "../utils/Date.js";
import {UserMembership} from "../components/UserMembership.jsx";
import {allAuthorities, authorities} from "../utils/Permissions.js";
import ConfirmationDialog from "../components/ConfirmationDialog.jsx";
import {deleteAllInvitations, deleteInvitation, resendInvitation} from "../api/index.js";
import SelectField from "../components/SelectField.jsx";
import {useAppStore} from "../stores/AppStore.js";
import MenuIcon from "../icons/menu.svg";
import ArrowRight from "@surfnet/sds/icons/functional-icons/arrow-right.svg";
import TrashIcon from "@surfnet/sds/icons/functional-icons/bin.svg";
import {isEmpty} from "../utils/Utils.js";

const authorityOptions = [{value: "ALL", label: I18n.t("roles.all")}]
    .concat(allAuthorities.map(authority => ({
        value: authority,
        label: I18n.t(`roles.${authority.toLowerCase()}`)
    })));

export const InvitationManagement = ({organization, currentUserAuthority, setRefresh}) => {

    const {user: currentUser, setFlash} = useAppStore(state => state);

    const [confirmation, setConfirmation] = useState({});
    const [authority, setAuthority] = useState(authorityOptions[0].value);
    const [dropDownActive, setDropDownActive] = useState(-1);

    const refreshMemberships = () => {
        setRefresh(new Date().getTime());
    }

    const doDelete = (invitation, confirmationRequired) => {
        if (confirmationRequired) {
            setConfirmation({
                open: true,
                cancel: () => setConfirmation({open: false}),
                action: () => doDelete(invitation, false),
                question: I18n.t("invitationsManagement.deleteConfirmation", {email: invitation.inviter.name}),
                okButton: I18n.t("invitationsManagement.revoke")
            });
        } else {
            deleteInvitation(invitation).then(() => {
                setConfirmation({});
                setFlash(I18n.t("invitationsManagement.flashReminderSent"));
                refreshMemberships();
            })
        }
    }

    const doDeleteAll = (confirmationRequired) => {
        if (confirmationRequired) {
            setConfirmation({
                open: true,
                cancel: () => setConfirmation({open: false}),
                action: () => doDeleteAll(false),
                question: I18n.t("invitationsManagement.deleteAllConfirmation", {name: organization.name}),
                okButton: I18n.t("forms.delete")
            });
        } else {
            deleteAllInvitations(organization).then(() => {
                setConfirmation({});
                setFlash(I18n.t("invitationsManagement.flashDeleteAll"));
                refreshMemberships();
            })
        }
    }

    const doResend = (invitation, confirmationRequired) => {
        if (confirmationRequired) {
            setConfirmation({
                open: true,
                cancel: () => setConfirmation({open: false}),
                action: () => doResend(invitation, false),
                question: I18n.t("invitationsManagement.resendConfirmation", {email: invitation.inviter.name}),
                okButton: I18n.t("invitationsManagement.resend")
            });
        } else {
            resendInvitation(invitation).then(() => {
                setConfirmation({});
                setFlash(I18n.t("invitationsManagement.flashReminderSent"));
                refreshMemberships();
            })
        }
    }

    const renderMenu = invitation => {
        return (
            <div className="sds--user-info--dropdown">
                <ul>
                    <li onClick={() => doResend(invitation, true)}>
                        <ArrowRight/>
                        <span>{I18n.t("invitationsManagement.resend")}</span>
                    </li>
                    <li onClick={() => doDelete(invitation, true)}>
                        <TrashIcon/>
                        <span>{I18n.t("invitationsManagement.revoke")}</span>
                    </li>
                </ul>
            </div>
        )
    }

    const renderOrganizationInvitations = () => {
        if (isEmpty(organization.invitations)) {
            return <h3>{I18n.t("invitationsManagement.zeroState", {name: organization.name})}</h3>
        }

        const columns = [
            {
                key: "email",
                header: I18n.t("invitationsManagement.email"),
                mapper: invitation => invitation.email
            },
            {
                key: "role",
                header: I18n.t("invitationsManagement.role"),
                mapper: invitation => I18n.t(`roles.${invitation.intendedAuthority.toLowerCase()}`)
            },
            {
                key: "inviter__name",
                header: I18n.t("invitationsManagement.inviter"),
                mapper: invitation => <UserMembership user={invitation.inviter} currentUser={currentUser}/>
            },
            {
                key: "createdAt",
                header: I18n.t("invitationsManagement.createdAt"),
                mapper: invitation => dateFromEpoch(invitation.createdAt)
            },
            {
                key: "expiryDate",
                header: I18n.t("invitationsManagement.expiryDate"),
                mapper: invitation => dateFromEpoch(invitation.expiryDate)
            },
            {
                key: "buttons",
                header: "",
                nonSortable: true,
                mapper: invitation => {
                    if (currentUserAuthority !== authorities.ADMIN ||
                        invitation.intendedAuthority === authorities.ADMIN) {
                        return null;
                    }
                    return (
                        <div className="top-header"
                             tabIndex={1}
                             onBlur={() => setTimeout(() => setDropDownActive(-1), 175)}>
                            <span className={`menu ${dropDownActive === invitation.id ? "drop-down" : ""}`}
                                  onClick={() => setDropDownActive(dropDownActive === -1 ? invitation.id : -1)}>
                                <MenuIcon/>
                                {dropDownActive === invitation.id && renderMenu(invitation)}
                            </span>
                        </div>
                    );
                }
            }
        ]

        const filters = () => {
            return (
                <SelectField
                    value={authorityOptions.find(option => option.value === authority)
                        || authorityOptions[0]}
                    options={authorityOptions}
                    searchable={false}
                    onChange={option => setAuthority(option.value)}
                    clearable={false}
                />
            )
        }

        return (
            <Entities
                entities={organization.invitations
                    .filter(invitation => authority === "ALL" || invitation.intendedAuthority === authority)}
                modelName="invitationsManagement"
                defaultSort="email"
                title={I18n.t("invitationsManagement.maintain", {name: organization.name})}
                columns={columns}
                filters={filters()}
                showNew={true}
                newLabel={I18n.t("invitationsManagement.deleteAll")}
                displaySearch={true}
                searchAttributes={["user__name", "user__email"]}
                newEntityFunc={() => doDeleteAll(true)}
                inputFocus={true}/>
        )
    };

    const renderExplanations = () => {
        return (
            <div className="explanations">
                <h2>{I18n.t("teamManagement.explanations.title")}</h2>
                {["admin", "member", "guest"].map((role, index) => <
                        div key={role}>
                        <p className="role">{index + 1}. {I18n.t(`teamManagement.explanations.${role}`)}</p>
                        <p className="paragraph">
                            {I18n.t(`teamManagement.explanations.${role}Rights`)}
                        </p>
                    </div>
                )}
            </div>
        );
    };


    const {open, cancel, action, question, okButton} = confirmation;
    return (
        <div className="organization-invitations">
            {open && <ConfirmationDialog confirm={action}
                                         cancel={cancel}
                                         confirmationHeader={I18n.t("forms.delete")}
                                         confirmationTxt={okButton}
                                         question={question}
            />}
            {renderOrganizationInvitations()}

        </div>
    )
}
