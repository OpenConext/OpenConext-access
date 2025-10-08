import React, {useEffect, useState} from "react";
import "./Organizations.scss";
import I18n from "../locale/I18n";
import "../components/Entities.scss";
import {Button, ButtonType, Tooltip} from "@surfnet/sds";
import {Entities} from "../components/Entities";
import {deleteOrganizationById, searchOrganizations, updateOrganizationStatus} from "../api";
import {isEmpty, stopEvent} from "../utils/Utils";
import {useAppStore} from "../stores/AppStore";
import {dateFromEpoch} from "../utils/Date";
import {defaultPagination, pageCount} from "../utils/Pagination";
import {useDebouncedCallback} from "use-debounce";
import TeamIcon from "@surfnet/sds/icons/illustrative-icons/team.svg";
import {authorities} from "../utils/Permissions.js";
import {ORGANIZATION_STATUSES} from "../utils/Manage.js";
import PencilIcon from "@surfnet/sds/icons/functional-icons/pencil.svg";
import TrashIcon from "@surfnet/sds/icons/functional-icons/bin.svg";
import MenuIcon from "../icons/menu.svg";
import ConfirmationDialog from "../components/ConfirmationDialog.jsx";

export const Organizations = () => {

    const {setFlash} = useAppStore(state => state);

    const [searching, setSearching] = useState(false);
    const [paginationQueryParams, setPaginationQueryParams] = useState(defaultPagination());
    const [totalElements, setTotalElements] = useState(0);
    const [organizations, setOrganizations] = useState([]);
    const [confirmation, setConfirmation] = useState({});
    const [dropDownActive, setDropDownActive] = useState(-1);

    useEffect(() => {
            if (!isEmpty(paginationQueryParams.query)) {
                searchOrganizations(paginationQueryParams)
                    .then(page => {
                        setOrganizations(page.content);
                        setTotalElements(page.totalElements);
                        setSearching(false);
                    });
            } else {
                setSearching(false);
            }
        },
        [paginationQueryParams]);// eslint-disable-line react-hooks/exhaustive-deps

    const search = (query, sorted, reverse, page) => {
        if (!isEmpty(query) || query.trim().length > 2) {
            delayedAutocomplete(query, sorted, reverse, page);
        } else {
            setOrganizations([]);
            setTotalElements(0);
        }
    };

    const delayedAutocomplete = useDebouncedCallback((query, sorted, reverse, page) => {
        setSearching(true);
        //this will trigger a new search
        setPaginationQueryParams({
            query: query,
            pageNumber: page,
            pageSize: pageCount,
            sort: sorted,
            sortDirection: reverse ? "DESC" : "ASC"
        })
    }, 375);

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
                setPaginationQueryParams({...paginationQueryParams});
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
                setPaginationQueryParams({...paginationQueryParams, query: ""});
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
                                 createdAt: dateFromEpoch(org.created_at, false),
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
            key: "schac_home_organization",
            header: I18n.t("organizations.schacHomeOrganization"),
            mapper: org => <span>{org.schac_home_organization}</span>
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
            key: "createdAt",
            header: I18n.t("organizations.createdAt"),
            mapper: org => dateFromEpoch(org.created_at, false)
        },
        {
            key: "status",
            header: I18n.t("organizations.status"),
            mapper: org => I18n.t(`organizations.${org.status.toLowerCase()}`)
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
                      searchAttributes={["name", "schac_home_organization"]}
                      customSearch={search}
                      totalElements={totalElements}
                      loading={searching}/>

        </div>
    );

}
