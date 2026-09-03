import "./AppTeamManagement.scss";
import React, {useEffect, useState} from "react";
import I18n from "../locale/I18n";
import {Entities} from "../components/Entities.jsx";
import {dateFromEpoch} from "../utils/Date.js";
import {UserMembership} from "../components/UserMembership.jsx";
import {authorities, currentUserMembershipAuthority} from "../utils/Permissions.js";
import {Link, useNavigate} from "react-router";
import ConfirmationDialog from "../components/ConfirmationDialog.jsx";
import {Chip, ChipType} from "../components/Chip.jsx";
import {Spinner} from "@surfnet/curve-react";
import {createApplicationMembership, deleteApplicationMembershipById, organizationUsersById} from "../api/index.js";
import {useAppStore} from "../stores/AppStore.js";
import MenuIcon from "../icons/menu.svg";
import {TrashIcon} from "@phosphor-icons/react";
import SelectField from "../components/SelectField.jsx";
import {useShallow} from "zustand/react/shallow";

export const AppTeamManagement = ({
                                      application,
                                      refresh
                                  }) => {

    const {user: currentUser, setFlash} = useAppStore(useShallow(state => ({
            user: state.user,
            setFlash: state.setFlash
        })));

    const navigate = useNavigate();

    const [confirmation, setConfirmation] = useState({});
    const [dropDownActive, setDropDownActive] = useState(-1);
    const [currentUserAuthority, setCurrentUserAuthority] = useState({});
    const [loading, setLoading] = useState(true);
    const [organization, setOrganization] = useState({});
    const [applicationMemberships, setApplicationMemberships] = useState([]);

    useEffect(() => {
        organizationUsersById(application.organization.id)
            .then(res => {
                setOrganization(res);
                setApplicationMemberships((application.applicationMemberships || [])
                    .map(membership => {
                            const organizationMembership = res.organizationMemberships
                                .find(m => m.id === membership.organizationMembershipIdentifier);
                            if (organizationMembership) {
                                membership.user = organizationMembership.user;
                            }
                            return membership;
                        }
                    ))
                const membership = (currentUser.organizationMemberships || []).find(membership => membership.organization.id === res.id);
                setCurrentUserAuthority(currentUserMembershipAuthority(currentUser, membership));
                setLoading(false);
            }).catch(() => {
            navigate("/404")
        });
    }, [application, currentUser, navigate]);

    const doDelete = (membership, confirmationRequired) => {
        if (confirmationRequired) {
            setConfirmation({
                open: true,
                cancel: () => setConfirmation({open: false}),
                action: () => doDelete(membership, false),
                question: I18n.t("appTeamManagement.deleteConfirmation", {name: membership.user.name}),
                okButton: I18n.t("forms.delete")
            });
        } else {
            deleteApplicationMembershipById(membership).then(() => {
                setConfirmation({});
                refresh();
            })
        }
    }

    const renderMenu = membership => {
        return (
            <div className="sds--user-info--dropdown">
                <ul>
                    <li onClick={() => doDelete(membership, true)}>
                        <TrashIcon/>
                        <span>{I18n.t("forms.delete")}</span>
                    </li>
                </ul>
            </div>
        )
    }

    const organizationMemberOption = organizationMember => {
        return {
            value: organizationMember.id,
            label: organizationMember.user.name
        }
    }

    const organizationMemberChanged = option => {
        createApplicationMembership(option.value, application.id, organization.id)
            .then(() => {
                refresh();
                setFlash(I18n.t("appTeamManagement.flashCreated", {name: option.label}));
            })
    }

    const filters = () => {
        return (
            <SelectField
                value={null}
                options={organization.organizationMemberships
                    .filter(member => !applicationMemberships.some(appMember => appMember.organizationMembershipIdentifier === member.id))
                    .filter(member => member.authority !== authorities.ADMIN)
                    .map(organizationMemberOption)}
                placeholder={I18n.t("appTeamManagement.addPlaceHolder")}
                searchable={true}
                onChange={organizationMemberChanged}
                clearable={false}
            />
        )
    }

    const renderApplicationMembers = () => {
        const columns = [
            {
                key: "user__name",
                header: I18n.t("appTeamManagement.name"),
                mapper: membership => {
                    return <UserMembership user={membership.user} currentUser={currentUser}/>
                }
            },
            {
                key: "createdAt",
                header: I18n.t("appTeamManagement.createdAt"),
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

        return (
            <Entities
                entities={applicationMemberships}
                modelName="appTeamManagement"
                defaultSort="user__name"
                hideTitle={true}
                columns={columns}
                filters={filters()}
                showNew={true}
                displaySearch={true}
                searchAttributes={["user__name", "user__email"]}
                newEntityFunc={() => navigate(`/invitation/${organization.id}/${application.id}`)}
                inputFocus={true}/>
        )
    };

    if (loading) {
        return <div className="loading-container"><Spinner className="size-8"/></div>
    }

    const {open, cancel, action, question, okButton} = confirmation;
    return (
        <div className="application-memberships">
            {open && <ConfirmationDialog confirm={action}
                                         cancel={cancel}
                                         confirmationHeader={I18n.t("forms.delete")}
                                         confirmationTxt={okButton}
                                         question={question}
            />}
            <div className="application-header">
                <h3 className="text-[length:var(--text-lg-font-size)]">{I18n.t("appTeamManagement.maintain", {name: application.name})}</h3>
                <Chip type={ChipType.Status_success} label={I18n.t("appTeamManagement.createdBy",
                    {
                        name: application.createdBy,
                        date: dateFromEpoch(application.createdAt)
                    })}/>
            </div>

            <p className="info">
                {I18n.t("appTeamManagement.organizationMembersPre")}
                <Link to={`/users/${organization.id}/team`} onClick={() => useAppStore.setState(() => ({
                    activeMenuItem: "users"
                }))}>
                    {I18n.t("appTeamManagement.organizationMembersLink")}
                </Link>
                {I18n.t("appTeamManagement.organizationMembersPost")}
            </p>
            {renderApplicationMembers()}
        </div>
    )
}
