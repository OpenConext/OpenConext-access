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
import StudentPng from "../icons/student2.png";
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
import {getParameterByName} from "../utils/QueryParameters.js";

const pageCount = 10;

const Applications = () => {

        const navigate = useNavigate();
        const [query, setQuery] = useState(valueFromQueryParams("query", ""));
        const [loading, setLoading] = useState(true);
        const [serviceProviders, setServiceProviders] = useState([]);
        const [recentServiceProviders, setRecentServiceProviders] = useState([]);
        const [tag, setTag] = useState(valueFromQueryParams("tag", "all"));
        const [tagOptions, setTagOptions] = useState([]);
        const [source, setSource] = useState(valueFromQueryParams("source", "all"));
        const [sourceOptions, setSourceOptions] = useState([]);
        const [page, setPage] = useState(pageNumberFromQueryParams());

        useEffect(() => {
            publicServiceProviders()
                .then(res => {
                    res = res
                        .sort((sp1, sp2) => providerName(I18n.locale, sp1).toLowerCase()
                            .localeCompare(providerName(I18n.locale, sp2).toLowerCase()))
                    setServiceProviders(res);
                    const recent = res
                        .sort((sp1, sp2) => sp2.revision.created.localeCompare(sp1.revision.created))
                        .slice(0, 8);
                    setRecentServiceProviders(recent);
                    const tagCounts = res.reduce((acc, sp) => {
                        const tags = sp.data.metaDataFields.application_tags;
                        if (!isEmpty(tags)) {
                            tags.forEach(tag => {
                                if (acc[tag]) {
                                    acc[tag] = acc[tag] + 1
                                } else {
                                    acc[tag] = 1;
                                }
                            })
                        }
                        return acc;
                    }, {});
                    const defaultTag = {
                        value: "all",
                        label: `${I18n.t("applications.all")} (${res.length})`
                    };
                    let newTagOptions = [defaultTag];
                    newTagOptions = newTagOptions.concat(Object.entries(tagCounts)
                        .sort((e1, e2) => e1[0].toLowerCase().localeCompare(e2[0].toLowerCase()))
                        .map(entry => ({
                            value: entry[0],
                            label: `${entry[0]} (${entry[1]})`
                        })));
                    setTagOptions(newTagOptions);
                    //Sources
                    const sourceCounts = res.reduce((acc, sp) => {
                        const fed = sp.data.metaDataFields["coin:interfed_source"];
                        if (!isEmpty(fed)) {
                            if (acc[fed]) {
                                acc[fed] = acc[fed] + 1
                            } else {
                                acc[fed] = 1;
                            }
                        }
                        return acc;
                    }, {});
                    const defaultSource = {
                        value: "all",
                        label: `${I18n.t("applications.allSources")} (${res.length})`
                    };
                    let newSourceOptions = [defaultSource];
                    newSourceOptions = newSourceOptions.concat(Object.entries(sourceCounts)
                        .sort((e1, e2) => e1[0].toLowerCase().localeCompare(e2[0].toLowerCase()))
                        .map(entry => ({
                            value: entry[0],
                            label: `${entry[0]} (${entry[1]})`
                        })));
                    setSourceOptions(newSourceOptions);
                    setLoading(false);
                })
                .catch(() => {
                    navigate("/404");
                });
        }, []);// eslint-disable-line react-hooks/exhaustive-deps


        const filteredServiceProviders = useMemo(() => {
            const filterSP = sp => {
                const nbr = getParameterByName("page", window.location.search) || 1;
                setPage(parseInt(nbr, 10));
                let tagHit = true;
                const tags = sp.data.metaDataFields.application_tags;
                if (tag !== "all") {
                    tagHit = !isEmpty(tags) && tags.includes(tag);
                }
                let sourceHit = true;
                const fed = sp.data.metaDataFields["coin:interfed_source"];
                if (source !== "all") {
                    sourceHit = !isEmpty(fed) && fed === source;
                }
                let queryHit = true;
                if (!isEmpty(query)) {
                    const name = providerName(I18n.locale, sp).toLowerCase();
                    const orgName = providerOrganizationName(I18n.locale, sp).toLowerCase();
                    const queryLower = query.toLowerCase();
                    queryHit = name.includes(queryLower) || orgName.includes(queryLower);
                }
                return tagHit && queryHit && sourceHit;
            }
            return (isEmpty(query) && tag === "all" && source === "all" && page === 1) ? recentServiceProviders :
                serviceProviders.filter(sp => filterSP(sp));
        }, [query, recentServiceProviders, serviceProviders, source, tag, page]);


        if (loading) {
            return <div className="loading-container"><Spinner className="size-8"/></div>
        }

        const minimalPage = Math.min(page, Math.ceil(filteredServiceProviders.length / pageCount));
        const showMostRecent = isEmpty(query) && tag === "all" && source === "all" && page === 1;

        const renderPagination = (total, onChange) => {
            const nbrPages = Math.ceil(total / pageCount);
            if (total <= pageCount) {
                return null;
            }
            return (
                <Pagination>
                    <PaginationContent>
                        {page !== 1 && <PaginationItem>
                            <PaginationPrevious href={pageHref(page - 1)} iconOnly={true}
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
                            <PaginationNext href={pageHref(page + 1)} iconOnly={true}
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
                <div className="applications-header-container">
                    <div className="applications-header">
                        <div className="left">
                            <h1 className="large text-[56px] mb-5">{I18n.t("applications.title")}</h1>
                            <p>{I18n.t("applications.subTitle")}</p>
                        </div>
                        <img src={StudentPng} alt="student"/>
                    </div>
                </div>
                <div className="inner-applications-container">
                    <div className="applications">
                        <div className="applications-search">
                            <InputGroup className="applications-search-input-group">
                                <InputGroupInput type="search"
                                                 onChange={e => {
                                                     setQuery(e.target.value);
                                                     storeQueryParameter("query", e.target.value);
                                                 }}
                                                 value={query}
                                                 placeholder={I18n.t("applications.searchPlaceHolder")}/>
                                <InputGroupAddon align="inline-end">
                                    <SearchIcon/>
                                </InputGroupAddon>
                            </InputGroup>
                            <SelectField
                                value={sourceOptions.find(option => option.value === source)}
                                options={sourceOptions}
                                searchable={false}
                                onChange={option => {
                                    setSource(option.value);
                                    storeQueryParameter("source", option.value);
                                }}
                            />
                            <SelectField
                                value={tagOptions.find(option => option.value === tag)}
                                options={tagOptions}
                                searchable={false}
                                onChange={option => {
                                    setTag(option.value)
                                    storeQueryParameter("tag", option.value);
                                }}
                            />
                        </div>
                        {showMostRecent &&
                            <div className="applications-overview-recent-container">
                                <h2 className="text-[length:var(--text-xl-font-size)] mb-[25px]">{I18n.t("applications.recent")}</h2>
                                <div className="applications-overview-recent">
                                    {recentServiceProviders.map((sp, index) => {
                                        const metaData = sp.data.metaDataFields;
                                        return (
                                            <div key={index}
                                                 className="application-card">
                                                <StretchedLink to={`/application-detail/${sp.type}/${sp['_id']}`}/>
                                                {metaData["logo:0:url"] && <img src={metaData["logo:0:url"]} alt=""/>}
                                                {!metaData["logo:0:url"] && <PlaceHolderImage/>}
                                                <div className="sp-info">
                                                            <span className="sp-name">
                                                                {providerName(I18n.locale, sp)}
                                                            </span>
                                                    <span className="sp-org">
                                                                {providerOrganizationName(I18n.locale, sp)}
                                                            </span>
                                                </div>
                                                <span className="right"><ArrowIcon/></span>
                                            </div>)
                                    })}
                                </div>
                            </div>}
                        {!showMostRecent &&
                            <div className="applications-overview">
                                <ul>
                                    {filteredServiceProviders
                                        .slice((minimalPage - 1) * pageCount, minimalPage * pageCount)
                                        .map((idp, index) => {
                                                return (
                                                    <li key={index}>
                                                        <StretchedLink to={`/application-detail/${idp.type}/${idp['_id']}`}/>
                                                        <div className="service-provider">
                                                            <div className="sp-info">
                                                            <span className="sp-name">
                                                                {providerName(I18n.locale, idp)}
                                                            </span>
                                                                <span className="sp-org">
                                                                {providerOrganizationName(I18n.locale, idp)}
                                                            </span>
                                                            </div>
                                                        </div>
                                                    </li>)
                                            }
                                        )}
                                </ul>
                            </div>}
                    </div>
                    {!showMostRecent && renderPagination(filteredServiceProviders.length, nbr => {
                        setPage(nbr);
                        storePageNumber(nbr);
                    })}
                </div>

            </div>
        );
    }
;
export default Applications;