import "./JoinRequestManagement.scss";
import React, {useState} from "react";
import I18n from "../locale/I18n";
import {Entities} from "../components/Entities.jsx";
import {dateFromEpoch} from "../utils/Date.js";
import {UserMembership} from "../components/UserMembership.jsx";
import {authorities} from "../utils/Permissions.js";
import ConfirmationDialog from "../components/ConfirmationDialog.jsx";
import {approvalJoinRequest} from "../api/index.js";
import {useAppStore} from "../stores/AppStore.js";
import MenuIcon from "../icons/menu.svg";
import {MoreLessToggle} from "@surfnet/sds";
import {isEmpty} from "../utils/Utils.js";

export const JoinRequestManagement = ({organization, currentUserAuthority, setRefresh}) => {

    const {user: currentUser, setFlash} = useAppStore(state => state);

    const [confirmation, setConfirmation] = useState({});
    const [dropDownActive, setDropDownActive] = useState(-1);

    const refreshJoinRequest = () => {
        setRefresh(new Date().getTime())
    }

    const doApprove = (joinRequest, approved, confirmationRequired) => {
        if (confirmationRequired) {
            setConfirmation({
                open: true,
                cancel: () => setConfirmation({open: false}),
                action: () => doApprove(joinRequest, approved, false),
                question: I18n.t(`joinRequestManagement.${approved ? "approveConfirmation" : "denialConfirmation"}`, {name: joinRequest.user.name}),
                okButton: I18n.t(`joinRequestManagement.${approved ? "approve" : "deny"}`)
            });
        } else {
            approvalJoinRequest(joinRequest.id, approved, authorities.GUEST).then(() => {
                setConfirmation({});
                setFlash(I18n.t(`joinRequestManagement.flash${approved ? "Approved":"Denied"}`, {name: option.label}));

                refreshJoinRequest();
            })
        }
    }

    const renderMenu = joinRequest => {
        return (
            <div className="sds--user-info--dropdown">
                <ul>
                    <li onClick={() => doApprove(joinRequest, true, true)}>
                        <span className="svg">✅</span>
                        <span>{I18n.t("joinRequestManagement.approve")}</span>
                    </li>
                    <li onClick={() => doApprove(joinRequest, false, true)}>
                        <span className="svg">⛔️</span>
                        <span>{I18n.t("joinRequestManagement.deny")}</span>
                    </li>
                </ul>
            </div>
        )
    }

    const renderJoinRequest = () => {
        if (isEmpty(organization.joinRequests)) {
            return <h3>{I18n.t("joinRequestManagement.zeroState", {name: organization.name})}</h3>
        }

        const columns = [
            {
                key: "user__name",
                header: I18n.t("joinRequestManagement.nameEmail"),
                mapper: joinRequest => <UserMembership user={joinRequest.user} currentUser={currentUser}/>
            },
            {
                key: "message",
                header: I18n.t("joinRequestManagement.message"),
                mapper: joinRequest => <MoreLessToggle txt={joinRequest.message}
                                                       moreLabel={I18n.t("forms.moreLabel")}
                                                       lessLabel={I18n.t("forms.lessLabel")}
                                                       cutoffNumber={90}/>
            },
            {
                key: "created",
                header: I18n.t("joinRequestManagement.createdAt"),
                mapper: joinRequest => dateFromEpoch(joinRequest.createdAt)
            },
            {
                key: "buttons",
                header: "",
                nonSortable: true,
                mapper: joinRequest => {
                    if (currentUserAuthority !== authorities.ADMIN) {
                        return null;
                    }
                    return (
                        <div className="top-header"
                             tabIndex={1}
                             onBlur={() => setTimeout(() => setDropDownActive(-1), 175)}>
                            <span className={`menu ${dropDownActive === joinRequest.id ? "drop-down" : ""}`}
                                  onClick={() => setDropDownActive(dropDownActive === -1 ? joinRequest.id : -1)}>
                                <MenuIcon/>
                                {dropDownActive === joinRequest.id && renderMenu(joinRequest)}
                            </span>
                        </div>
                    );
                }
            }
        ]
        return (
            <Entities
                entities={organization.joinRequests}
                modelName="joinRequestManagement"
                defaultSort="user__name"
                title={I18n.t("joinRequestManagement.maintain", {name: organization.name})}
                columns={columns}
                showNew={false}
                displaySearch={true}
                searchAttributes={["user__name", "user__email"]}
                inputFocus={true}/>
        )
    };
    const {open, cancel, action, question, okButton} = confirmation;
    return (
        <div className="organization-join-requests">
            {open && <ConfirmationDialog confirm={action}
                                         cancel={cancel}
                                         confirmationHeader={I18n.t("forms.delete")}
                                         confirmationTxt={okButton}
                                         question={question}
            />}
            {renderJoinRequest()}
        </div>
    )
}
