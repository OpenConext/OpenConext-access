import "./AppTeamManagement.scss";
import React, {useEffect, useState} from "react";
import I18n from "../locale/I18n";
import {Entities} from "../components/Entities.jsx";
import {dateFromEpoch} from "../utils/Date.js";
import {UserMembership} from "../components/UserMembership.jsx";
import {authorities, currentUserMembershipAuthority, hasApplicationMembershipDeleteAccess} from "../utils/Permissions.js";
import {Link, useNavigate} from "react-router";
import ConfirmationDialog from "../components/ConfirmationDialog.jsx";
import {Button, Spinner} from "@surfnet/curve-react";
import {createApplicationMembership, deleteApplicationMembershipById, organizationUsersById} from "../api/index.js";
import {useAppStore} from "../stores/AppStore.js";
import {TrashIcon} from "@phosphor-icons/react";
import {AddApplicationMemberMenu} from "./AddApplicationMemberMenu.jsx";
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
                                membership.authority = organizationMembership.authority;
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

    const organizationMemberOption = organizationMember => {
        return {
            value: organizationMember.id,
            label: organizationMember.user.name
        }
    }

    const addApplicationMember = option => {
        return createApplicationMembership(option.value, application.id, organization.id)
            .then(() => {
                refresh();
                setFlash(I18n.t("appTeamManagement.flashCreated", {name: option.label}));
            });
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
                key: "role",
                header: I18n.t("appTeamManagement.role"),
                mapper: membership => membership.authority ? I18n.t(`roles.${membership.authority.toLowerCase()}`) : ""
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
                    //Issue #992: a plain MEMBER may only remove a GUEST if they are the creator of this
                    //application (the server additionally requires ownership of every application the guest
                    //has access to within the organization)
                    if (currentUserAuthority === authorities.MEMBER &&
                        !hasApplicationMembershipDeleteAccess(currentUser, application, membership)) {
                        return null;
                    }
                    return (
                        <Button variant="ghost" size="icon" onClick={() => doDelete(membership, true)}>
                            <TrashIcon/>
                        </Button>
                    );
                }
            }
        ]

        const options = organization.organizationMemberships
            .filter(member => !applicationMemberships.some(appMember => appMember.organizationMembershipIdentifier === member.id))
            .filter(member => member.authority !== authorities.ADMIN)
            .map(organizationMemberOption);

        return (
            <Entities
                entities={applicationMemberships}
                modelName="appTeamManagement"
                defaultSort="user__name"
                hideTitle={true}
                columns={columns}
                displaySearch={true}
                searchAttributes={["user__name", "user__email"]}
                inputFocus={true}>
                {currentUserAuthority !== authorities.GUEST &&
                    <AddApplicationMemberMenu options={options}
                                               organizationId={organization.id}
                                               applicationId={application.id}
                                               onAdd={addApplicationMember}/>}
            </Entities>
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
            <h2 className="text-[length:var(--text-xl-font-size)]">{I18n.t("appTeamManagement.maintain")}</h2>

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
