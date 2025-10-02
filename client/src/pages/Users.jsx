import React, {useEffect, useState} from "react";
import "./Users.scss";
import I18n from "../locale/I18n";
import "../components/Entities.scss";
import {Chip, ChipType, Tooltip} from "@surfnet/sds";
import {Entities} from "../components/Entities";
import {searchUsers} from "../api";
import UserIcon from "@surfnet/sds/icons/functional-icons/id-2.svg";
import {isEmpty} from "../utils/Utils";
import ImpersonateIcon from "@surfnet/sds/icons/illustrative-icons/presentation-amphitheater.svg";
import {useNavigate} from "react-router-dom";
import {useAppStore} from "../stores/AppStore";
import {dateFromEpoch} from "../utils/Date";
import {defaultPagination, pageCount} from "../utils/Pagination";
import {useDebouncedCallback} from "use-debounce";


export const Users = () => {

    const {user: currentUser, startImpersonation, setFlash} = useAppStore(state => state);

    const [searching, setSearching] = useState(false);
    const [paginationQueryParams, setPaginationQueryParams] = useState(defaultPagination());
    const [totalElements, setTotalElements] = useState(0);
    const [users, setUsers] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
            if (!isEmpty(paginationQueryParams.query)) {
                searchUsers(paginationQueryParams)
                    .then(page => {
                        setUsers(page.content);
                        setTotalElements(page.totalElements);
                        setSearching(false);
                    });
            }
        },
        [paginationQueryParams]);// eslint-disable-line react-hooks/exhaustive-deps

    const search = (query, sorted, reverse, page) => {
        if (isEmpty(query) || query.trim().length > 2) {
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
                <Tooltip standalone={true}
                         children={<UserIcon/>}
                         tip={I18n.t("tooltips.userIcon",
                             {
                                 name: user.name,
                                 createdAt: dateFromEpoch(user.createdAt),
                                 lastActivity: dateFromEpoch(user.lastActivity)
                             })}/>
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
            mapper: user => dateFromEpoch(user.createdAt, false)
        },
        {
            key: "lastActivity",
            header: I18n.t("users.lastActivity"),
            mapper: user => dateFromEpoch(user.lastActivity, false)
        },
    ];
    const showImpersonation = currentUser && currentUser.superUser;

    const impersonate = user => {
        startImpersonation(user);
        setFlash(I18n.t("impersonate.flash.startedImpersonation", {name: user.name}));
        navigate("/", {replace: true});
    }

    if (showImpersonation) {
        columns.push({
            nonSortable: true,
            key: "icon",
            hasLink: true,
            header: "",
            mapper: user => (currentUser.id !== user.id) ?
                <Tooltip standalone={true}
                         children={<ImpersonateIcon className="impersonate"
                                                    onClick={() => impersonate(user)}/>}
                         tip={I18n.t("users.impersonate",
                             {
                                 name: user.name
                             })}/>
                : <Chip type={ChipType.Main_400} label={I18n.t("forms.you")}/>
        })
    }
    return (
        <div className="mod-users">
            <Entities entities={users}
                      modelName="users"
                      defaultSort="name"
                      columns={columns}
                      showNew={false}
                      inputFocus={true}
                      hideTitle={true}
                      customNoEntities={I18n.t(`users.noResults`)}
                      searchAttributes={["name", "email", "schacHomeOrganization"]}
                      customSearch={search}
                      totalElements={totalElements}
                      loading={searching}/>
        </div>
    );

}
