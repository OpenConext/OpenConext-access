import "./Applications.scss";
import React, {useEffect, useMemo, useState} from "react";
import {publicServiceProviders} from "../api/index.js";
import I18n from "../locale/I18n.js";
import {useNavigate} from "react-router";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
    Spinner,
    InputGroup,
    InputGroupAddon,
    InputGroupInput
} from "@surfnet/curve-react";
import {MagnifyingGlassIcon as SearchIcon, CaretRightIcon as ArrowIcon} from "@phosphor-icons/react";
import SelectField from "../components/SelectField.jsx";
import {isEmpty} from "../utils/Utils.js";
import {providerName, providerOrganizationName} from "../utils/Manage.js";
import PlaceHolderImage from "../icons/placeholder-image.svg";
import {StretchedLink} from "../components/StretchedLink.jsx";
import {
    pageHref,
    pageNumberFromQueryParams,
    pageRangeWithDots,
    storePageNumber,
    storeQueryParameter,
    valueFromQueryParams
} from "../utils/Pagination.js";

const pageCount = 10;

const Applications = () => {

        const navigate = useNavigate();
        const [query, setQuery] = useState(valueFromQueryParams("query", ""));
        const [loading, setLoading] = useState(true);
        const [serviceProviders, setServiceProviders] = useState([]);
        const [tag, setTag] = useState(valueFromQueryParams("tag", "all"));
        const [source, setSource] = useState(valueFromQueryParams("source", "all"));
        const [page, setPage] = useState(pageNumberFromQueryParams());

        useEffect(() => {
            publicServiceProviders()
                .then(res => {
                    res = res
                        .sort((sp1, sp2) => providerName(I18n.locale, sp1).toLowerCase()
                            .localeCompare(providerName(I18n.locale, sp2).toLowerCase()))
                    setServiceProviders(res);
                    setLoading(false);
                })
                .catch(() => {
                    navigate("/404");
                });
        }, []);// eslint-disable-line react-hooks/exhaustive-deps


        // A changed filter always starts at the first page
        const resetPage = () => {
            setPage(1);
            storePageNumber(1);
        };

        const matchesQuery = sp => {
            if (isEmpty(query)) {
                return true;
            }
            const queryLower = query.toLowerCase();
            return providerName(I18n.locale, sp).toLowerCase().includes(queryLower) ||
                providerOrganizationName(I18n.locale, sp).toLowerCase().includes(queryLower);
        };
        const matchesTag = (sp, value) => {
            const tags = sp.data.metaDataFields.application_tags;
            return value === "all" || (!isEmpty(tags) && tags.includes(value));
        };
        const matchesSource = (sp, value) => {
            const fed = sp.data.metaDataFields["coin:interfed_source"];
            return value === "all" || (!isEmpty(fed) && fed === value);
        };

        const filteredServiceProviders = useMemo(() => {
            return serviceProviders.filter(sp => matchesQuery(sp) && matchesTag(sp, tag) && matchesSource(sp, source));
        }, [query, serviceProviders, source, tag]);// eslint-disable-line react-hooks/exhaustive-deps

        // The counts in a drop-down reflect the applications matching the search term and the other drop-down
        const buildOptions = (allLabel, values, matchesValue, otherFilter) => {
            const candidates = serviceProviders.filter(sp => matchesQuery(sp) && otherFilter(sp));
            return [{value: "all", label: allLabel}].concat(values.map(value => ({
                value: value,
                label: `${value} (${candidates.filter(sp => matchesValue(sp, value)).length})`
            })));
        };
        const allTags = [...new Set(serviceProviders.flatMap(sp => sp.data.metaDataFields.application_tags || []))]
            .sort((t1, t2) => t1.toLowerCase().localeCompare(t2.toLowerCase()));
        const allSources = [...new Set(serviceProviders.map(sp => sp.data.metaDataFields["coin:interfed_source"])
            .filter(fed => !isEmpty(fed)))]
            .sort((f1, f2) => f1.toLowerCase().localeCompare(f2.toLowerCase()));
        const tagOptions = buildOptions(I18n.t("applications.all"), allTags, matchesTag, sp => matchesSource(sp, source));
        const sourceOptions = buildOptions(I18n.t("applications.allSources"), allSources, matchesSource, sp => matchesTag(sp, tag));
        // Wide enough for the longest label, also with the largest counts
        const selectWidth = values => `calc(${Math.max(...values.map(v => v.length)) + 6}ch + 64px)`;


        if (loading) {
            return <div className="loading-container"><Spinner className="size-8"/></div>
        }

        const minimalPage = Math.min(page, Math.ceil(filteredServiceProviders.length / pageCount));

        const renderPagination = (total, onChange) => {
            const nbrPages = Math.ceil(total / pageCount);
            if (total <= pageCount) {
                return null;
            }
            return (
                <Pagination>
                    <PaginationContent>
                        {page !== 1 && <PaginationItem>
                            <PaginationPrevious href={pageHref(page - 1)} text={I18n.t("pagination.previous")}
                                                onClick={e => {
                                                    e.preventDefault();
                                                    onChange(page - 1);
                                                }}/>
                        </PaginationItem>}
                        {pageRangeWithDots(page, nbrPages).map((nbr, index) =>
                            <PaginationItem key={`${nbr}_${index}`}>
                                {typeof nbr === "string" ?
                                    <PaginationEllipsis/> :
                                    <PaginationLink href={pageHref(nbr)} isActive={nbr === page}
                                                    onClick={e => {
                                                        e.preventDefault();
                                                        onChange(nbr);
                                                    }}>{nbr}</PaginationLink>}
                            </PaginationItem>
                        )}
                        {page !== nbrPages && <PaginationItem>
                            <PaginationNext href={pageHref(page + 1)} text={I18n.t("pagination.next")}
                                            onClick={e => {
                                                e.preventDefault();
                                                onChange(page + 1);
                                            }}/>
                        </PaginationItem>}
                    </PaginationContent>
                </Pagination>
            );
        };

        return (
            <div className="applications-container">
                <div className="applications-title">
                    <h1>{I18n.t("applications.title")}</h1>
                    <p>{I18n.t("applications.subTitle")}</p>
                </div>
                <div className="applications-body">
                    <div className="applications-search">
                        <InputGroup className="applications-search-input-group">
                            <InputGroupAddon align="inline-start">
                                <SearchIcon/>
                            </InputGroupAddon>
                            <InputGroupInput type="search"
                                             onChange={e => {
                                                 setQuery(e.target.value);
                                                 storeQueryParameter("query", e.target.value);
                                                 resetPage();
                                             }}
                                             value={query}
                                             placeholder={I18n.t("applications.searchPlaceHolder")}/>
                        </InputGroup>
                        <div className="applications-filter-select"
                             style={{width: selectWidth([...allSources, I18n.t("applications.allSources")])}}>
                        <SelectField
                            value={sourceOptions.find(option => option.value === source)}
                            options={sourceOptions}
                            searchable={false}
                            onChange={option => {
                                setSource(option.value);
                                storeQueryParameter("source", option.value);
                                resetPage();
                            }}
                        />
                        </div>
                        <div className="applications-filter-select"
                             style={{width: selectWidth([...allTags, I18n.t("applications.all")])}}>
                        <SelectField
                            value={tagOptions.find(option => option.value === tag)}
                            options={tagOptions}
                            searchable={false}
                            onChange={option => {
                                setTag(option.value)
                                storeQueryParameter("tag", option.value);
                                resetPage();
                            }}
                        />
                        </div>
                    </div>
                    <ul className="applications-list">
                        {filteredServiceProviders
                            .slice((minimalPage - 1) * pageCount, minimalPage * pageCount)
                            .map((sp, index) => {
                                    const metaData = sp.data.metaDataFields;
                                    return (
                                        <li key={index}>
                                            <StretchedLink to={`/application-detail/${sp.type}/${sp['_id']}`}/>
                                            <div className="application-logo">
                                                {metaData["logo:0:url"] ? <img src={metaData["logo:0:url"]} alt=""/> :
                                                    <PlaceHolderImage/>}
                                            </div>
                                            <div className="application-info">
                                                <span className="application-org">
                                                    {providerOrganizationName(I18n.locale, sp)}
                                                </span>
                                                <span className="application-name">
                                                    {providerName(I18n.locale, sp)}
                                                </span>
                                            </div>
                                            <span className="application-arrow"><ArrowIcon/></span>
                                        </li>)
                                }
                            )}
                    </ul>
                </div>
                {renderPagination(filteredServiceProviders.length, nbr => {
                    setPage(nbr);
                    storePageNumber(nbr);
                })}
            </div>
        );
    }
;
export default Applications;
