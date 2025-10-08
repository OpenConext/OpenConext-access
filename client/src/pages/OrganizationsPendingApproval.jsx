import React, {useEffect, useState} from "react";
import "./Organizations.scss";
import I18n from "../locale/I18n";
import "../components/Entities.scss";
import {Loader, Tooltip} from "@surfnet/sds";
import {Entities} from "../components/Entities";
import {deleteOrganizationById, pendingApprovalOrganizations, updateOrganizationStatus} from "../api";
import {dateFromEpoch} from "../utils/Date";
import TeamIcon from "@surfnet/sds/icons/illustrative-icons/team.svg";
import {ORGANIZATION_STATUSES} from "../utils/Manage.js";
import PencilIcon from "@surfnet/sds/icons/functional-icons/pencil.svg";
import TrashIcon from "@surfnet/sds/icons/functional-icons/bin.svg";
import MenuIcon from "../icons/menu.svg";
import ConfirmationDialog from "../components/ConfirmationDialog.jsx";
import {useAppStore} from "../stores/AppStore.js";

export const OrganizationsPendingApproval = () => {

    const {setFlash} = useAppStore(state => state);
    const [refresh, setRefresh] = useState(new Date());
    const [organizations, setOrganizations] = useState([]);
    const [confirmation, setConfirmation] = useState({});
    const [dropDownActive, setDropDownActive] = useState(-1);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
            pendingApprovalOrganizations().then(res => {
                setOrganizations(res);
                setLoading(false);
            })
        },
        [refresh]);// eslint-disable-line react-hooks/exhaustive-deps

    const doUpdateOrganizationStatus = (organization, status, confirmationRequired) => {
        if (confirmationRequired) {
            setConfirmation({
                open: true,
                cancel: () => setConfirmation({open: false}),
                action: () => doUpdateOrganizationStatus(organization, status, false),
                question: I18n.t("organizations.confirmation", {
                    status: I18n.t(`organizations.${status.toLowerCase()}`).toLowerCase(),
                    name: organization.name
                }),
                okButton: I18n.t("forms.submit")
            });
        } else {
            updateOrganizationStatus(organization.id, status).then(() => {
                setConfirmation({});
                setFlash(I18n.t("organizations.flash.updated", {
                    name: organization.name,
                    status: I18n.t(`organizations.${status.toLowerCase()}`).toLowerCase()
                }));
                setRefresh(new Date())
            })
        }
    }

    const doDelete = (confirmationRequired, organization) => {
        if (confirmationRequired) {
            setConfirmation({
                open: true,
                cancel: () => setConfirmation({open: false}),
                action: () => doDelete(false, organization),
                question: I18n.t("organization.deleteConfirmation", {name: organization.name}),
                okButton: I18n.t("forms.delete")
            });
        } else {
            deleteOrganizationById(organization.id).then(() => {
                setConfirmation({});
                setFlash(I18n.t("organizations.flash.deleted", {
                    name: organization.name
                }));
                setRefresh(new Date());
            })
        }
    }

    const renderMenu = organization => {
        const availableStatuses = Object.keys(ORGANIZATION_STATUSES)
            .filter(status => status !== organization.status)
            .sort();
        return (
            <div className="sds--user-info--dropdown">
                <ul>
                    {availableStatuses.map((status, index) =>
                        <li key={index}
                            onClick={() => doUpdateOrganizationStatus(organization, status, true)}>
                            <PencilIcon/>
                            <span>{I18n.t(`organizations.${status.toLowerCase()}_action`)}</span>
                        </li>
                    )}
                    {<li onClick={() => doDelete(true, organization)}>
                        <TrashIcon/>
                        <span>{I18n.t("forms.delete")}</span>
                    </li>}
                </ul>
            </div>
        )
    }

    const columns = [
        {
            nonSortable: true,
            key: "icon",
            header: "",
            mapper: org => <div className="member-icon">
                <Tooltip standalone={true}
                         children={<TeamIcon/>}
                         tip={I18n.t("tooltips.organizationsIcon",
                             {
                                 name: org.name,
                                 createdAt: dateFromEpoch(org.createdAt),
                                 status: I18n.t(`organizations.${org.status.toLowerCase()}`)
                             })}/>
            </div>
        },
        {
            key: "name",
            header: I18n.t("organizations.name"),
            mapper: org => <span>{org.name}</span>
        },
        {
            key: "schacHomeOrganization",
            header: I18n.t("organizations.schacHomeOrganization"),
            mapper: org => <span>{org.schacHomeOrganization}</span>
        },
        {
            key: "applicationCount",
            header: I18n.t("organizations.applicationCount"),
            mapper: org => org.applicationCount
        },
        {
            key: "memberCount",
            header: I18n.t("organizations.memberCount"),
            mapper: org => org.memberCount
        },
        {
            key: "status",
            header: I18n.t("organizations.status"),
            mapper: org => I18n.t(`organizations.${org.status.toLowerCase()}`)
        },
        {
            key: "createdAt",
            header: I18n.t("organizations.createdAt"),
            mapper: org => dateFromEpoch(org.createdAt, true)
        },
        {
            key: "buttons",
            header: "",
            nonSortable: true,
            mapper: org =>
                <div className="top-header"
                     tabIndex={1}
                     onBlur={() => setTimeout(() => setDropDownActive(-1), 175)}>
                            <span className={`menu ${dropDownActive === org.id ? "drop-down" : ""}`}
                                  onClick={() => setDropDownActive(dropDownActive === -1 ? org.id : -1)}>
                                <MenuIcon/>
                                {dropDownActive === org.id && renderMenu(org)}
                            </span>
                </div>
        }
    ];

    if (loading) {
        return <Loader/>
    }
    const {open, cancel, action, question, okButton} = confirmation;

    return (
        <div className="mod-organizations">
            {open && <ConfirmationDialog confirm={action}
                                         cancel={cancel}
                                         confirmationHeader={I18n.t("confirmationDialog.confirm")}
                                         confirmationTxt={okButton}
                                         question={question}
            />}

            <Entities entities={organizations}
                      modelName="organizations"
                      defaultSort="name"
                      columns={columns}
                      showNew={false}
                      inputFocus={true}
                      hideTitle={true}
                      // title={I18n.t("organizations.pendingApprovalTitle")}
                      searchAttributes={["name", "schacHomeOrganization"]}
                      totalElements={organizations.length}/>

        </div>
    );

}
