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
import StudentPng from "../icons/student.png";
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
        const [categoryOptions, setCategoryOptions] = useState([]);
        const [page, setPage] = useState(pageNumberFromQueryParams());

        useEffect(() => {
            publicIdentityProviders()
                .then(res => {
                    res = res
                        .sort((idp1, idp2) => providerOrganizationName(I18n.locale, idp1).toLowerCase()
                            .localeCompare(providerOrganizationName(I18n.locale, idp2).toLowerCase()))
                    setIdentityProviders(res);
                    const categoryCounts = res.reduce((acc, idp) => {
                        const type = idp.data.metaDataFields["coin:institution_type"];
                        if (!isEmpty(type)) {
                            if (acc[type]) {
                                acc[type] = acc[type] + 1
                            } else {
                                acc[type] = 1;
                            }
                        }
                        return acc;
                    }, {});
                    const defaultCategory = {
                        value: "all",
                        label: `${I18n.t("institutions.all")} (${res.length})`
                    };
                    let newCategoryOptions = [defaultCategory];
                    newCategoryOptions = newCategoryOptions.concat(Object.entries(categoryCounts)
                        .sort((e1, e2) => e1[0].toLowerCase().localeCompare(e2[0].toLowerCase()))
                        .map(entry => ({
                            value: entry[0],
                            label: `${entry[0]} (${entry[1]})`
                        })));
                    setCategory(defaultCategory.value);
                    setCategoryOptions(newCategoryOptions);
                    setLoading(false);
                })
                .catch(() => {
                    navigate("/404");
                });
        }, []);// eslint-disable-line react-hooks/exhaustive-deps

        const filteredIdentityProviders = useMemo(() => {
            const filterIdP = idp => {
                setPage(1);
                let categoryHit = true;
                const type = idp.data.metaDataFields["coin:institution_type"];
                if (category !== "all") {
                    categoryHit = type === category;
                }
                let queryHit = true;
                if (!isEmpty(query)) {
                    const orgName = providerOrganizationName(I18n.locale, idp).toLowerCase();
                    const queryLower = query.toLowerCase();
                    queryHit = orgName.includes(queryLower);
                }
                return categoryHit && queryHit;
            }
            return (isEmpty(query) && category === "all") ? identityProviders :
                identityProviders.filter(filterIdP);
        }, [query, category, identityProviders]);


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
            <div className="institutions-container">
                <div className="institutions-header-container">
                    <div className="institutions-header">
                        <div className="left">
                            <h1 className="large text-[56px] mb-5">{I18n.t("institutions.title")}</h1>
                            <p>{I18n.t("institutions.subTitle")}</p>
                        </div>
                        <img src={StudentPng} alt="student"/>
                    </div>
                </div>
                <div className="inner-institutions-container">
                    <div className="institutions">
                        <div className="institutions-search">
                            <InputGroup className="institutions-search-input-group">
                                <InputGroupInput type="search"
                                                 onChange={e => setQuery(e.target.value)}
                                                 value={query}
                                                 placeholder={I18n.t("institutions.searchPlaceHolder")}/>
                                <InputGroupAddon align="inline-end">
                                    <SearchIcon/>
                                </InputGroupAddon>
                            </InputGroup>
                            <SelectField
                                value={categoryOptions.find(option => option.value === category)}
                                placeholder={I18n.t("institutions.categoryPlaceHolder")}
                                options={categoryOptions}
                                searchable={false}
                                onChange={option => setCategory(option.value)}
                            />
                        </div>
                        <div className="institutions-overview">
                            <ul>
                                {filteredIdentityProviders
                                    .slice((minimalPage - 1) * pageCount, minimalPage * pageCount)
                                    .map((idp, index) => {
                                            const metaData = idp.data.metaDataFields;
                                            const type = metaData["coin:institution_type"] || I18n.t("institutions.other");
                                            return (
                                                <li key={index}>
                                                    <div className="identity-provider">
                                                        {metaData["logo:0:url"] && <img src={metaData["logo:0:url"]} alt=""/>}
                                                        {!metaData["logo:0:url"] && <PlaceHolderImage/>}
                                                        <div className="idp-info">
                                                            <span className="idp-type">
                                                                {type}
                                                            </span>
                                                            <span className="idp-name">
                                                                {providerOrganizationName(I18n.locale, idp)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </li>)
                                        }
                                    )}
                            </ul>
                        </div>
                    </div>
                    {renderPagination(filteredIdentityProviders.length, nbr => {
                        setPage(nbr);
                        storePageNumber(nbr);
                    })}
                </div>
            </div>
        );
    }
;
export default Institutions;