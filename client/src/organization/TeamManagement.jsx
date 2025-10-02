import "./TeamManagement.scss";
import React, {useState} from "react";
import I18n from "../locale/I18n";
import {Entities} from "../components/Entities.jsx";
import {dateFromEpoch} from "../utils/Date.js";
import {UserMembership} from "../components/UserMembership.jsx";
import {allAuthorities, authorities} from "../utils/Permissions.js";
import {useNavigate} from "react-router-dom";
import ConfirmationDialog from "../components/ConfirmationDialog.jsx";
import {changeOrganizationMembershipById, deleteOrganizationMembershipById} from "../api/index.js";
import SelectField from "../components/SelectField.jsx";
import {useAppStore} from "../stores/AppStore.js";
import MenuIcon from "../icons/menu.svg";
import PencilIcon from "@surfnet/sds/icons/functional-icons/pencil.svg";
import TrashIcon from "@surfnet/sds/icons/functional-icons/bin.svg";

const authorityOptions = [{value: "ALL", label: I18n.t("roles.all")}]
    .concat(allAuthorities.map(authority => ({
        value: authority,
        label: I18n.t(`roles.${authority.toLowerCase()}`)
    })));

export const TeamManagement = ({organization, currentUserAuthority, setRefresh}) => {

    const navigate = useNavigate();
    const {user: currentUser, setFlash} = useAppStore(state => state);

    const [confirmation, setConfirmation] = useState({});
    const [authority, setAuthority] = useState(authorityOptions[0].value);
    const [dropDownActive, setDropDownActive] = useState(-1);

    const refreshMemberships = () => {
        setRefresh(new Date().getTime());
    }

    const doDelete = (membership, confirmationRequired) => {
        if (confirmationRequired) {
            setConfirmation({
                open: true,
                cancel: () => setConfirmation({open: false}),
                action: () => doDelete(membership, false),
                question: I18n.t("teamManagement.deleteConfirmation", {name: membership.user.name}),
                okButton: I18n.t("forms.delete")
            });
        } else {
            deleteOrganizationMembershipById(membership).then(() => {
                setConfirmation({});
                setFlash(I18n.t("teamManagement.flash.deleted",{name: membership.user.name}));
                refreshMemberships();
            })
        }
    }

    const doDemoteCurrentUser = (membership, authority, confirmationRequired) => {
        if (confirmationRequired) {
            setConfirmation({
                open: true,
                cancel: () => setConfirmation({open: false}),
                action: () => doDemoteCurrentUser(membership, authority, false),
                question: I18n.t("teamManagement.deleteDemotion", {name: membership.user.name}),
                okButton: I18n.t("forms.sure")
            });
        } else {
            changeOrganizationMembershipById(membership, authority).then(() => {
                setConfirmation({});
                setFlash(I18n.t("teamManagement.flash.updated",{name: membership.user.name}));
                refreshMemberships();
            })
        }
    }

    const changeOrganizationMembership = (membership, authority) => {
        if (membership.user.id === currentUser.id && authority !== authorities.ADMIN) {
            doDemoteCurrentUser(membership, authority, true);
            refreshMemberships();
        } else {
            changeOrganizationMembershipById(membership, authority).then(() => {
                setConfirmation({});
                setFlash(I18n.t("teamManagement.flash.updated",{name: membership.user.name}));
                refreshMemberships();
            })
        }
    }

    const renderMenu = membership => {
        return (
            <div className="sds--user-info--dropdown">
                <ul>
                    {(membership.authority !== authorities.ADMIN && currentUserAuthority === authorities.ADMIN) &&
                        <li onClick={() => changeOrganizationMembership(membership, authorities.ADMIN)}>
                            <PencilIcon/>
                            <span>{I18n.t("teamManagement.makeAdmin")}</span>
                        </li>}
                    {(membership.authority !== authorities.MEMBER && currentUserAuthority === authorities.ADMIN) &&
                        <li onClick={() => changeOrganizationMembership(membership, authorities.MEMBER)}>
                            <PencilIcon/>
                            <span>{I18n.t("teamManagement.makeMember")}</span>
                        </li>}
                    {(membership.authority !== authorities.GUEST && currentUserAuthority === authorities.ADMIN) &&
                        <li onClick={() => changeOrganizationMembership(membership, authorities.GUEST)}>
                            <PencilIcon/>
                            <span>{I18n.t("teamManagement.makeGuest")}</span>
                        </li>}
                    {currentUserAuthority === authorities.ADMIN && <li onClick={() => doDelete(membership, true)}>
                        <TrashIcon/>
                        <span>{I18n.t("forms.delete")}</span>
                    </li>}
                </ul>
            </div>
        )
    }

    const renderOrganizationMembers = () => {
        const columns = [
            {
                key: "user__name",
                header: I18n.t("teamManagement.nameEmail"),
                mapper: membership => <UserMembership user={membership.user} currentUser={currentUser}/>
            },
            {
                key: "role",
                header: I18n.t("teamManagement.role"),
                mapper: membership => I18n.t(`roles.${membership.authority.toLowerCase()}`)
            },
            {
                key: "created",
                header: I18n.t("teamManagement.active"),
                mapper: membership => dateFromEpoch(membership.createdAt)
            },
            {
                key: "buttons",
                header: "",
                nonSortable: true,
                mapper: membership => {
                    if (currentUserAuthority === authorities.GUEST) {
                        return null;
                    }
                    return (
                        <div className="top-header"
                             tabIndex={1}
                             onBlur={() => setTimeout(() => setDropDownActive(-1), 175)}>
                            <span className={`menu ${dropDownActive === membership.id ? "drop-down" : ""}`}
                                  onClick={() => setDropDownActive(dropDownActive === -1 ? membership.id : -1)}>
                                <MenuIcon/>
                                {dropDownActive === membership.id && renderMenu(membership)}
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
                entities={organization.organizationMemberships.filter(m => authority === "ALL" || m.authority === authority)}
                modelName="teamManagement"
                defaultSort="user__name"
                title={I18n.t("teamManagement.maintain", {name: organization.name})}
                columns={columns}
                filters={filters()}
                showNew={true}
                displaySearch={true}
                searchAttributes={["user__name", "user__email"]}
                newEntityFunc={() => navigate(`/invitation/${organization.id}`)}
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
        <div className="organization-memberships">
            {open && <ConfirmationDialog confirm={action}
                                         cancel={cancel}
                                         confirmationHeader={I18n.t("forms.delete")}
                                         confirmationTxt={okButton}
                                         question={question}
            />}
            {renderOrganizationMembers()}
            {renderExplanations()}
        </div>
    )
}
