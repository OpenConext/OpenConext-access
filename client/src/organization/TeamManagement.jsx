import "./TeamManagement.scss";
import React, {useState} from "react";
import I18n from "../locale/I18n";
import {Entities} from "../components/Entities.jsx";
import {dateFromEpoch} from "../utils/Date.js";
import {UserMembership} from "../components/UserMembership.jsx";
import {allAuthorities, authorities} from "../utils/Permissions.js";
import {useNavigate} from "react-router";
import ConfirmationDialog from "../components/ConfirmationDialog.jsx";
import {changeOrganizationMembershipById, deleteOrganizationMembershipById} from "../api/index.js";
import SelectField from "../components/SelectField.jsx";
import {useAppStore} from "../stores/AppStore.js";
import {PencilSimpleIcon as PencilIcon, TrashIcon, DotsThreeIcon as MenuIcon} from "@phosphor-icons/react";
import {useShallow} from "zustand/react/shallow";
import {isEmpty} from "../utils/Utils.js";
import {
    Button,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@surfnet/curve-react";

const authorityOptions = [{value: "ALL", label: I18n.t("roles.all")}]
    .concat(allAuthorities.map(authority => ({
        value: authority,
        label: I18n.t(`roles.${authority.toLowerCase()}`)
    })));

export const TeamManagement = ({organization, currentUserAuthority, refreshState}) => {

    const {user: currentUser, setFlash} = useAppStore(useShallow(state => ({
        user: state.user,
        setFlash: state.setFlash
    })));

    const navigate = useNavigate();

    const [confirmation, setConfirmation] = useState({});
    const [authority, setAuthority] = useState(authorityOptions[0].value);

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
                setFlash(I18n.t("teamManagement.flash.deleted", {name: membership.user.name}));
                refreshState();
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
                setFlash(I18n.t("teamManagement.flash.updated", {name: membership.user.name}));
                refreshState();
            })
        }
    }

    const changeOrganizationMembership = (membership, authority) => {
        if (membership.user.id === currentUser.id && authority !== authorities.ADMIN) {
            doDemoteCurrentUser(membership, authority, true);
            refreshState();
        } else {
            changeOrganizationMembershipById(membership, authority).then(() => {
                setConfirmation({});
                setFlash(I18n.t("teamManagement.flash.updated", {name: membership.user.name}));
                refreshState();
            })
        }
    }

    const renderMenu = membership => {

        return (
            <DropdownMenu>
                <DropdownMenuTrigger render={
                    <Button variant="ghost" size="icon">
                        <MenuIcon weight="bold" size={34} className="size-[34px]"/>
                    </Button>
                }/>
                <DropdownMenuContent align="end" className="action-menu-content">
                    <DropdownMenuGroup>
                        {(membership.authority !== authorities.ADMIN && currentUserAuthority === authorities.ADMIN) &&
                            <DropdownMenuItem onClick={() => changeOrganizationMembership(membership, authorities.ADMIN)}>
                                <PencilIcon/>
                                {I18n.t("teamManagement.makeAdmin")}
                            </DropdownMenuItem>}
                        {(membership.authority !== authorities.MEMBER && currentUserAuthority === authorities.ADMIN) &&
                            <DropdownMenuItem onClick={() => changeOrganizationMembership(membership, authorities.MEMBER)}>
                                <PencilIcon/>
                                {I18n.t("teamManagement.makeMember")}
                            </DropdownMenuItem>}
                        {(membership.authority !== authorities.GUEST && currentUserAuthority === authorities.ADMIN) &&
                            <DropdownMenuItem onClick={() => changeOrganizationMembership(membership, authorities.GUEST)}>
                                <PencilIcon/>
                                {I18n.t("teamManagement.makeGuest")}
                            </DropdownMenuItem>}
                        {currentUserAuthority === authorities.ADMIN &&
                            <DropdownMenuItem onClick={() => doDelete(membership, true)}>
                                <TrashIcon/>
                                {I18n.t("forms.delete")}
                            </DropdownMenuItem>}
                    </DropdownMenuGroup>
                </DropdownMenuContent>
            </DropdownMenu>
        )
    }

    const renderOrganizationMembers = () => {
        const oneAdminLeft = (organization.organizationMemberships || [])
            .filter(m => m.authority === authorities.ADMIN).length < 2;
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
                key: "createdAt",
                header: I18n.t("teamManagement.active"),
                mapper: membership => dateFromEpoch(membership.createdAt)
            },
            {
                key: "buttons",
                header: "",
                nonSortable: true,
                mapper: membership => {
                    if (currentUserAuthority === authorities.GUEST || currentUserAuthority === authorities.MEMBER) {
                        return null;
                    }
                    //We need to ensure that one admin remains
                    if (oneAdminLeft && membership.authority === authorities.ADMIN) {
                        return null;
                    }
                    //Also institution admins of an IdP are not allowed to be downgraded or deleted
                    if (membership.authority === authorities.ADMIN && !isEmpty(organization.manageIdentifier)) {
                        return null;
                    }
                    return renderMenu(membership);
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
                showNew={currentUserAuthority !== authorities.GUEST}
                displaySearch={true}
                searchAttributes={["user__name", "user__email"]}
                newEntityFunc={() => navigate(`/invitation/${organization.id}`)}
                inputFocus={true}/>
        )
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
        </div>
    )
}
