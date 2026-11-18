import "./Institutions.scss";
import React, {useEffect, useMemo, useState} from "react";
import {publicIdentityProviders} from "../api/index.js";
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
    InputGroup,
    InputGroupAddon,
    InputGroupInput
} from "@surfnet/curve-react";
import {Spinner} from "@surfnet/curve-react";
import {MagnifyingGlassIcon as SearchIcon} from "@phosphor-icons/react";
import SelectField from "../components/SelectField.jsx";
import {isEmpty} from "../utils/Utils.js";
import {providerOrganizationName} from "../utils/Manage.js";
import PlaceHolderImage from "../icons/placeholder-image.svg";
import {pageHref, pageNumberFromQueryParams, pageRangeWithDots, storePageNumber} from "../utils/Pagination.js";

const pageCount = 10;

const Institutions = () => {

        const navigate = useNavigate();
        const [query, setQuery] = useState("");
        const [loading, setLoading] = useState(true);
        const [identityProviders, setIdentityProviders] = useState([]);
        const [category, setCategory] = useState(null);
        const [page, setPage] = useState(pageNumberFromQueryParams());

        useEffect(() => {
            publicIdentityProviders()
                .then(res => {
                    res = res
                        .sort((idp1, idp2) => providerOrganizationName(I18n.locale, idp1).toLowerCase()
                            .localeCompare(providerOrganizationName(I18n.locale, idp2).toLowerCase()))
                    setIdentityProviders(res);
                    setCategory("all");
                    setLoading(false);
                })
                .catch(() => {
                    navigate("/404");
                });
        }, []);// eslint-disable-line react-hooks/exhaustive-deps

        const matchesQuery = idp => isEmpty(query) ||
            providerOrganizationName(I18n.locale, idp).toLowerCase().includes(query.toLowerCase());

        const filteredIdentityProviders = useMemo(() => {
            return identityProviders.filter(idp => matchesQuery(idp) &&
                (category === "all" || idp.data.metaDataFields["coin:institution_type"] === category));
        }, [query, category, identityProviders]);// eslint-disable-line react-hooks/exhaustive-deps

        // The counts in the drop-down reflect the institutions matching the search term
        const candidates = identityProviders.filter(matchesQuery);
        const categoryLabel = type => I18n.t(`institutionTypes.${type}`, {defaultValue: type});
        const categories = [...new Set(identityProviders.map(idp => idp.data.metaDataFields["coin:institution_type"])
            .filter(type => !isEmpty(type)))];
        const categoryOptions = [{value: "all", label: I18n.t("institutions.all")}].concat(categories
            .map(type => ({
                value: type,
                label: `${categoryLabel(type)} (${candidates.filter(idp => idp.data.metaDataFields["coin:institution_type"] === type).length})`
            }))
            .sort((o1, o2) => o1.label.toLowerCase().localeCompare(o2.label.toLowerCase())));
        const selectWidth = `calc(${Math.max(...[I18n.t("institutions.all"), ...categories.map(categoryLabel)]
            .map(label => label.length)) + 6}ch + 64px)`;


        if (loading) {
            return <div className="loading-container"><Spinner className="size-8"/></div>
        }

        const minimalPage = Math.min(page, Math.ceil(filteredIdentityProviders.length / pageCount));

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
            <div className="institutions-container">
                <div className="institutions-title">
                    <h1>{I18n.t("institutions.title")}</h1>
                    <p>{I18n.t("institutions.subTitle")}</p>
                </div>
                <div className="institutions-body">
                    <div className="institutions-search">
                        <InputGroup className="institutions-search-input-group">
                            <InputGroupAddon align="inline-start">
                                <SearchIcon/>
                            </InputGroupAddon>
                            <InputGroupInput type="search"
                                             onChange={e => {
                                                 setQuery(e.target.value);
                                                 setPage(1);
                                             }}
                                             value={query}
                                             placeholder={I18n.t("institutions.searchPlaceHolder")}/>
                        </InputGroup>
                        <div className="institutions-category-select" style={{width: selectWidth}}>
                        <SelectField
                            value={categoryOptions.find(option => option.value === category)}
                            options={categoryOptions}
                            searchable={false}
                            onChange={option => {
                                setCategory(option.value);
                                setPage(1);
                            }}
                        />
                        </div>
                    </div>
                    <ul className="institutions-list">
                        {filteredIdentityProviders
                            .slice((minimalPage - 1) * pageCount, minimalPage * pageCount)
                            .map((idp, index) => {
                                    const metaData = idp.data.metaDataFields;
                                    const type = I18n.t(`institutionTypes.${metaData["coin:institution_type"]}`,
                                        {defaultValue: I18n.t("institutions.other")});
                                    return (
                                        <li key={index}>
                                            <div className="institution-logo">
                                                {metaData["logo:0:url"] ? <img src={metaData["logo:0:url"]} alt=""/> :
                                                    <PlaceHolderImage/>}
                                            </div>
                                            <div className="institution-info">
                                                <span className="institution-type">
                                                    {type}
                                                </span>
                                                <span className="institution-name">
                                                    {providerOrganizationName(I18n.locale, idp)}
                                                </span>
                                            </div>
                                        </li>)
                                }
                            )}
                    </ul>
                </div>
                {renderPagination(filteredIdentityProviders.length, nbr => {
                    setPage(nbr);
                    storePageNumber(nbr);
                })}
            </div>
        );
    }
;
export default Institutions;
