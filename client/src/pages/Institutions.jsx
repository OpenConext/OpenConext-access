import "./Institutions.scss";
import React, {useEffect, useMemo, useState} from "react";
import {publicIdentityProviders} from "../api/index.js";
import I18n from "../locale/I18n.js";
import {useNavigate} from "react-router";
import {Loader, Pagination} from "@surfnet/sds";
import StudentPng from "../icons/student.png";
import SearchIcon from "@surfnet/sds/icons/functional-icons/search.svg";
import SelectField from "../components/SelectField.jsx";
import {isEmpty} from "../utils/Utils.js";
import {providerOrganizationName} from "../utils/Manage.js";
import PlaceHolderImage from "@surfnet/sds/icons/placeholder-image.svg";
import {pageNumberFromQueryParams, storePageNumber} from "../utils/Pagination.js";

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
            return <Loader/>
        }

        const minimalPage = Math.min(page, Math.ceil(filteredIdentityProviders.length / pageCount));

        return (
            <div className="institutions-container">
                <div className="institutions-header-container">
                    <div className="institutions-header">
                        <div className="left">
                            <h1 className="large">{I18n.t("institutions.title")}</h1>
                            <p>{I18n.t("institutions.subTitle")}</p>
                        </div>
                        <img src={StudentPng} alt="student"/>
                    </div>
                </div>
                <div className="inner-institutions-container">
                    <div className="institutions">
                        <div className="institutions-search">
                            <div className={"sds--text-field sds--text-field--has-icon"}>
                                <div className="sds--text-field--shape">
                                    <div className="sds--text-field--input-and-icon">
                                        <input className={"sds--text-field--input"}
                                               type="search"
                                               onChange={e => setQuery(e.target.value)}
                                               value={query}
                                               placeholder={I18n.t("institutions.searchPlaceHolder")}/>
                                        <span className="sds--text-field--icon">
                                            <SearchIcon/>
                                        </span>
                                    </div>
                                    <SelectField
                                        value={categoryOptions.find(option => option.value === category)}
                                        placeholder={I18n.t("institutions.categoryPlaceHolder")}
                                        options={categoryOptions}
                                        searchable={false}
                                        onChange={option => setCategory(option.value)}
                                    />
                                </div>
                            </div>
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
                    <Pagination currentPage={page}
                                onChange={nbr => {
                                    setPage(nbr);
                                    storePageNumber(nbr);
                                }}
                                total={filteredIdentityProviders.length}
                                pageCount={pageCount}/>
                </div>
            </div>
        );
    }
;
export default Institutions;