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
import {getParameterByName} from "../utils/QueryParameters.js";

const pageCount = 10;

const Applications = () => {

        const navigate = useNavigate();
        const [query, setQuery] = useState(valueFromQueryParams("query", ""));
        const [loading, setLoading] = useState(true);
        const [serviceProviders, setServiceProviders] = useState([]);
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
                        label: I18n.t("applications.all")
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
                        label: I18n.t("applications.allSources")
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
            return (isEmpty(query) && tag === "all" && source === "all") ? serviceProviders :
                serviceProviders.filter(sp => filterSP(sp));
        }, [query, serviceProviders, source, tag]);


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
                                             }}
                                             value={query}
                                             placeholder={I18n.t("applications.searchPlaceHolder")}/>
                        </InputGroup>
                        <SelectField
                            className="applications-filter-select"
                            value={sourceOptions.find(option => option.value === source)}
                            options={sourceOptions}
                            searchable={false}
                            onChange={option => {
                                setSource(option.value);
                                storeQueryParameter("source", option.value);
                            }}
                        />
                        <SelectField
                            className="applications-filter-select"
                            value={tagOptions.find(option => option.value === tag)}
                            options={tagOptions}
                            searchable={false}
                            onChange={option => {
                                setTag(option.value)
                                storeQueryParameter("tag", option.value);
                            }}
                        />
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
