import React, {useEffect, useState} from "react";
import "./Users.scss";
import I18n from "../locale/I18n";
import "../components/Entities.scss";
import {Chip, ChipType} from "../components/Chip.jsx";
import {Spinner, Tooltip, TooltipContent, TooltipTrigger} from "@surfnet/curve-react";
import {Entities} from "../components/Entities";
import {searchUsers} from "../api";
import {IdentificationBadgeIcon as UserIcon} from "@phosphor-icons/react";
import {isEmpty, sanitize} from "../utils/Utils";
import {ChalkboardTeacherIcon as ImpersonateIcon} from "@phosphor-icons/react";
import {useNavigate} from "react-router";
import {useAppStore} from "../stores/AppStore";
import {dateFromEpoch} from "../utils/Date";
import {defaultPagination, pageCount} from "../utils/Pagination";
import {useDebouncedCallback} from "use-debounce";
import {useShallow} from "zustand/react/shallow";


export const Users = () => {

    const {user: currentUser, startImpersonation, setFlash} = useAppStore(useShallow(state => ({
        user: state.user,
        startImpersonation: state.startImpersonation,
        setFlash: state.setFlash
    })));

    const [searching, setSearching] = useState(false);
    const [loading, setLoading] = useState(false);
    const [sortedBy, setSortedBy] = useState("DESC");
    const [paginationQueryParams, setPaginationQueryParams] = useState(defaultPagination("createdAt", "DESC"));
    const [totalElements, setTotalElements] = useState(0);
    const [users, setUsers] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        searchUsers(paginationQueryParams)
            .then(page => {
                setUsers(page.content);
                setTotalElements(page.totalElements);
                setSearching(false);
            });
    }, [paginationQueryParams]);

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

    const columns = [
        {
            nonSortable: true,
            key: "icon",
            header: "",
            mapper: user => <div className="member-icon">
                <Tooltip>
                    <TooltipTrigger render={<UserIcon/>}/>
                    <TooltipContent><span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("tooltips.userIcon",
                        {
                            name: user.name,
                            createdAt: dateFromEpoch(user.createdAt),
                            lastActivity: dateFromEpoch(user.lastActivity)
                        }))}}/></TooltipContent>
                </Tooltip>
            </div>
        },
        {
            key: "name",
            header: I18n.t("users.name_email"),
            mapper: user => (
                <div className="user-name-email">
                    <span className="name">{user.name}</span>
                    <span className="email">{user.email}</span>
                </div>)
        },
        {
            key: "schac_home_organization",
            header: I18n.t("users.schacHomeOrganization"),
            mapper: user => <span>{user.schac_home_organization}</span>
        },
        {
            key: "createdAt",
            header: I18n.t("users.createdAt"),
            mapper: user => dateFromEpoch(user.createdAt)
        },
        {
            key: "lastActivity",
            header: I18n.t("users.lastActivity"),
            mapper: user => dateFromEpoch(user.lastActivity)
        },
    ];
    const showImpersonation = currentUser && currentUser.superUser;

    const impersonate = user => {
        setLoading(true);
        navigate("/", {replace: true});
        setFlash(I18n.t("impersonate.flash.startedImpersonation", {name: user.name}));
        setTimeout(() => startImpersonation(user), 375);
    }

    if (showImpersonation) {
        columns.push({
            nonSortable: true,
            key: "icon",
            hasLink: true,
            header: "",
            mapper: user => (currentUser.id !== user.id) ?
                <Tooltip>
                    <TooltipTrigger render={<ImpersonateIcon className="impersonate"
                                                              onClick={() => impersonate(user)}/>}/>
                    <TooltipContent><span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("users.impersonate",
                        {
                            name: user.name
                        }))}}/></TooltipContent>
                </Tooltip>
                : <Chip type={ChipType.Main_400} label={I18n.t("forms.you")}/>
        })
    }

    if (loading) {
        return <div className="loading-container"><Spinner className="size-8"/></div>
    }

    return (
        <div className="mod-users">
            <Entities entities={users}
                      modelName="users"
                      defaultSort="createdAt"
                      columns={columns}
                      showNew={false}
                      inputFocus={true}
                      hideTitle={true}
                      customSearch={search}
                      totalElements={totalElements}
                      loading={searching}/>

        </div>
    );

}
