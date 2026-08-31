import React, {useEffect, useRef, useState} from "react";
import "./Organizations.scss";
import I18n from "../locale/I18n";
import "../components/Entities.scss";
import {Checkbox, Spinner, Tooltip, TooltipContent, TooltipTrigger} from "@surfnet/curve-react";
import {Entities} from "../components/Entities";
import {isEmpty, sanitize} from "../utils/Utils";
import {useAppStore} from "../stores/AppStore";
import {dateFromEpoch} from "../utils/Date";
import {defaultPagination, pageCount} from "../utils/Pagination";
import {useDebouncedCallback} from "use-debounce";
import {InfoIcon, UsersThreeIcon as TeamIcon} from "@phosphor-icons/react";
import {ORGANIZATION_STATUSES} from "../utils/Manage.js";
import {
    CheckCircleIcon as ApproveIcon,
    BellSlashIcon as DisapproveIcon,
    PencilSimpleIcon as PencilIcon,
    TrashIcon
} from "@phosphor-icons/react";
import MenuIcon from "../icons/menu.svg";
import ConfirmationDialog from "../components/ConfirmationDialog.jsx";
import InputField from "../components/InputField.jsx";
import {
    deleteOrganizationById,
    pendingApprovalOrganizations,
    searchOrganizations,
    updateOrganizationName,
    updateOrganizationStatus
} from "../api";

export const Organizations = ({pendingApproval}) => {

    const setFlash = useAppStore(state => state.setFlash);

    const [refresh, setRefresh] = useState(new Date());
    const [searching, setSearching] = useState(false);
    const [sortedBy, setSortedBy] = useState("DESC");
    const [paginationQueryParams, setPaginationQueryParams] = useState(defaultPagination("createdAt", "DESC"));
    const [totalElements, setTotalElements] = useState(0);
    const [organizations, setOrganizations] = useState([]);
    const [confirmation, setConfirmation] = useState({});
    const [dropDownActive, setDropDownActive] = useState(-1);

    const [openOrganizationId, setOpenOrganizationId] = useState(null);
    const [newOrganizationName, setNewOrganizationName] = useState(null);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
            if (pendingApproval) {
                pendingApprovalOrganizations().then(res => {
                    setOrganizations(res);
                })
            } else {
                searchOrganizations(paginationQueryParams)
                    .then(page => {
                        setOrganizations(page.content);
                        setTotalElements(page.totalElements);
                        setSearching(false);
                    });
            }
        },
        [refresh, paginationQueryParams]);// eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, [openOrganizationId]);

    const search = (query, sorted, reverse, page) => {
        const newSorted = reverse ? "ASC" : "DESC";
        const isReverseChanged = sortedBy !== newSorted;
        const paginationQueryParamsChanged = sorted !== paginationQueryParams.sort || isReverseChanged ||
            page !== paginationQueryParams.pageNumber;
        setSortedBy(newSorted);
        if ((!isEmpty(query) && query.trim().length > 2) || paginationQueryParamsChanged) {
            delayedAutocomplete(query, sorted, reverse, page);
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
            setLoading(true);
            updateOrganizationStatus(organization.id, status).then(() => {
                setLoading(false);
                setConfirmation({});
                setFlash(I18n.t("organizations.flash.updated", {
                    name: organization.name,
                    status: I18n.t(`organizations.${status.toLowerCase()}`).toLowerCase()
                }));
                if (pendingApproval) {
                    setRefresh(new Date());
                } else {
                    setPaginationQueryParams({...paginationQueryParams});
                }
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
            setLoading(true);
            deleteOrganizationById(organization.id).then(() => {
                setLoading(false);
                setConfirmation({});
                setFlash(I18n.t("organizations.flash.deleted", {
                    name: organization.name
                }));
                if (pendingApproval) {
                    setRefresh(new Date());
                } else {
                    setPaginationQueryParams({...paginationQueryParams});
                }
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
            setLoading(false);
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
                    <Tooltip>
                        <TooltipTrigger render={<span onClick={() => setOpenOrganizationId(null)}>❌</span>}/>
                        <TooltipContent><span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("forms.cancel"))}}/></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger render={<span onClick={() => saveNewOrganizationName()}>🔁</span>}/>
                        <TooltipContent><span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("forms.save"))}}/></TooltipContent>
                    </Tooltip>
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
                <Tooltip>
                    <TooltipTrigger render={<TeamIcon/>}/>
                    <TooltipContent><span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("tooltips.organizationsIcon",
                        {
                            name: org.name,
                            createdAt: dateFromEpoch(org.created_at || org.createdAt),
                            status: I18n.t(`organizations.${org.status.toLowerCase()}`)
                        }))}}/></TooltipContent>
                </Tooltip>
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
            key: "manageIdentifier",
            header: I18n.t("organizations.isInternal"),
            mapper: org => <div className="wrapper"><Checkbox checked={!isEmpty(org.manageIdentifier)} readOnly={true}/></div>
        },
        {
            key: "adminEmail",
            header: I18n.t("organizations.adminEmail"),
            mapper: org => org.adminEmail
        },
        {
            key: "createdAt",
            header: I18n.t("organizations.createdAt"),
            mapper: org => dateFromEpoch(org.createdAt)
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
            mapper: org => isEmpty(org.manageIdentifier) ?
                <div className="top-header"
                     tabIndex={1}
                     onBlur={() => setTimeout(() => setDropDownActive(-1), 175)}>
                            <span className={`menu ${dropDownActive === org.id ? "drop-down" : ""}`}
                                  onClick={() => setDropDownActive(dropDownActive === -1 ? org.id : -1)}>
                                <MenuIcon/>
                                {dropDownActive === org.id && renderMenu(org)}
                            </span>
                </div> : <Tooltip>
                    <TooltipTrigger render={<InfoIcon/>}/>
                    <TooltipContent><span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("organizations.manageOrganizationInMutable"))}}/></TooltipContent>
                </Tooltip>
        }
    ];

    if (loading) {
        return <div className="loading-container"><Spinner className="size-8"/></div>
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
                      defaultSort="createdAt"
                      columns={columns}
                      showNew={false}
                      inputFocus={true}
                      hideTitle={true}
                      searchAttributes={pendingApproval ? ["name", "schacHomeOrganization"] : null}
                      customSearch={pendingApproval ? null : search}
                      totalElements={pendingApproval ? organizations.length : totalElements}
                      loading={pendingApproval ? loading : searching}/>

        </div>
    );

}
