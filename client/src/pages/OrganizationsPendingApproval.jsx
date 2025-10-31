import React, {useEffect, useRef, useState} from "react";
import "./Organizations.scss";
import I18n from "../locale/I18n";
import "../components/Entities.scss";
import {Loader, Tooltip} from "@surfnet/sds";
import {Entities} from "../components/Entities";
import {
    deleteOrganizationById,
    pendingApprovalOrganizations,
    updateOrganizationName,
    updateOrganizationStatus
} from "../api";
import {dateFromEpoch} from "../utils/Date";
import TeamIcon from "@surfnet/sds/icons/illustrative-icons/team.svg";
import {ORGANIZATION_STATUSES} from "../utils/Manage.js";
import PencilIcon from "@surfnet/sds/icons/functional-icons/pencil.svg";
import ApproveIcon from "@surfnet/sds/icons/functional-icons/success.svg";
import DisapproveIcon from "@surfnet/sds/icons/functional-icons/alarm-bell-off.svg";
import TrashIcon from "@surfnet/sds/icons/functional-icons/bin.svg";
import MenuIcon from "../icons/menu.svg";
import ConfirmationDialog from "../components/ConfirmationDialog.jsx";
import {useAppStore} from "../stores/AppStore.js";
import InputField from "../components/InputField.jsx";

export const OrganizationsPendingApproval = () => {

    const {setFlash} = useAppStore(state => state);
    const [refresh, setRefresh] = useState(new Date());
    const [organizations, setOrganizations] = useState([]);
    const [confirmation, setConfirmation] = useState({});
    const [dropDownActive, setDropDownActive] = useState(-1);
    const [openOrganizationId, setOpenOrganizationId] = useState(null);
    const [newOrganizationName, setNewOrganizationName] = useState(null);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
            pendingApprovalOrganizations().then(res => {
                setOrganizations(res);
                setLoading(false);
            })
        },
        [refresh]);// eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, [openOrganizationId]);

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

    const iconFromStatus = status => {
        switch (status) {
            case ORGANIZATION_STATUSES.APPROVED:
                return <ApproveIcon/>;
            case ORGANIZATION_STATUSES.PENDING_APPROVAL:
                return <ApproveIcon/>;
            case ORGANIZATION_STATUSES.DISAPPROVED:
                return <DisapproveIcon/>;
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
                            {iconFromStatus(status)}
                            <span>{I18n.t(`organizations.${status.toLowerCase()}_action`)}</span>
                        </li>
                    )}
                    {<li onClick={() => {
                        setOpenOrganizationId(organization.id);
                        setNewOrganizationName(organization.name);
                    }
                    }>
                        <PencilIcon/>
                        <span>{I18n.t("forms.edit")}</span>
                    </li>}
                    {<li onClick={() => doDelete(true, organization)}>
                        <TrashIcon/>
                        <span>{I18n.t("forms.delete")}</span>
                    </li>}
                </ul>
            </div>
        )
    }

    const saveNewOrganizationName = () => {
        setLoading(true);
        setOpenOrganizationId(null);
        updateOrganizationName(openOrganizationId, newOrganizationName).then(() => {
            setFlash(I18n.t("organizations.flash.nameChange", {name: newOrganizationName}));
            setRefresh(new Date());
        })
    }

    const organizationNameRow = organization => {
        if (openOrganizationId === null || openOrganizationId !== organization.id) {
            return (
                <span>{organization.name}</span>
            );
        }
        return (
            <div className="name-container">
                <InputField value={newOrganizationName}
                            onChange={e => setNewOrganizationName(e.target.value)}
                            onEnter={() => saveNewOrganizationName()}
                            onEscape={() => setOpenOrganizationId(null)}
                            onRef={el => inputRef.current = el}
                />
                <span className="action-icons">
                    <Tooltip standalone={true}
                             children={<span onClick={() => setOpenOrganizationId(null)}>❌</span>}
                             tip={I18n.t("forms.cancel")}/>
                    <Tooltip standalone={true}
                             children={<span onClick={() => saveNewOrganizationName()}>🔁</span>}
                             tip={I18n.t("forms.save")}/>
                </span>
            </div>
        );
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
            mapper: organizationNameRow
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
                     onBlur={() => setTimeout(() => setDropDownActive(-1), 175)}
                >
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
