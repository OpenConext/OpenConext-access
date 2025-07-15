import "./TeamManagement.scss";
import React, {useState} from "react";
import I18n from "../locale/I18n";
import {Button, ButtonType} from "@surfnet/sds";
import {Entities} from "../components/Entities.jsx";
import {dateFromEpoch} from "../utils/Date.js";
import {UserMembership} from "../components/UserMembership.jsx";
import {allAuthorities, isOrganizationAdmin} from "../utils/Permissions.js";
import {useNavigate} from "react-router-dom";
import ConfirmationDialog from "../components/ConfirmationDialog.jsx";
import {deleteOrganizationMembershipById} from "../api/index.js";
import SelectField from "../components/SelectField.jsx";

const authorityOptions = [{value: "ALL", label: I18n.t("roles.all")}]
    .concat(allAuthorities.map(authority => ({
        value: authority,
        label: I18n.t(`roles.${authority.toLowerCase()}`)})));

export const TeamManagement = ({organization, user, setRefresh}) => {

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
                setRefresh();
            })
        }
    }


    const renderOrganizationMembers = () => {
        const columns = [
            {
                key: "user__name",
                header: I18n.t("teamManagement.nameEmail"),
                mapper: membership => <UserMembership user={membership.user}/>
            },
            {
                key: "applicationMemberships",
                header: I18n.t("teamManagement.applicationMemberships"),
                mapper: membership => membership.applicationMemberships.length
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
                mapper: membership => {
                    if (!isOrganizationAdmin(user, organization) && 1 != 1) {
                        return null;
                    }
                    return <Button type={ButtonType.Delete}
                                   onClick={() => doDelete(membership, true)}

                    />
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
                defaultSort="name"
                title={I18n.t("teamManagement.maintain", {name: organization.name})}
                columns={columns}
                filters={filters()}
                showNew={true}
                displaySearch={true}
                searchAttributes={["user__name", "user__email"]}
                newEntityFunc={() => navigate(`/invitation/${organization.id}/new`)}
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
