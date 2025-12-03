import "./Applications.scss";
import React, {useEffect, useMemo, useState} from "react";
import {publicServiceProviders} from "../api/index.js";
import I18n from "../locale/I18n.js";
import {useNavigate} from "react-router-dom";
import {Loader, Pagination} from "@surfnet/sds";
import StudentPng from "../icons/student2.png";
import SearchIcon from "@surfnet/sds/icons/functional-icons/search.svg";
import ArrowIcon from "@surfnet/sds/icons/functional-icons/arrow-right-2.svg";
import SelectField from "../components/SelectField.jsx";
import {isEmpty} from "../utils/Utils.js";
import {providerName, providerOrganizationName} from "../utils/Manage.js";
import PlaceHolderImage from "@surfnet/sds/icons/placeholder-image.svg";
import {pageNumberFromQueryParams, storePageNumber} from "../utils/Pagination.js";
import {getParameterByName} from "../utils/QueryParameters.js";

const pageCount = 10;

const Applications = () => {

        const navigate = useNavigate();
        const [query, setQuery] = useState("");
        const [loading, setLoading] = useState(true);
        const [serviceProviders, setServiceProviders] = useState([]);
        const [recentServiceProviders, setRecentServiceProviders] = useState([]);
        const [tag, setTag] = useState(null);
        const [tagOptions, setTagOptions] = useState([]);
        const [source, setSource] = useState(null);
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
                    setTag(defaultTag.value);
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
                    setSource(defaultSource.value);
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
                setPage(nbr);
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
            const p = page;
            debugger;
            return (isEmpty(query) && tag === "all" && source === "all") ? recentServiceProviders :
                serviceProviders.filter(sp => filterSP(sp));
        }, [query, recentServiceProviders, serviceProviders, source, tag]);


        if (loading) {
            return <Loader/>
        }

        const minimalPage = Math.min(page, Math.ceil(filteredServiceProviders.length / pageCount));
        const showMostRecent = (isEmpty(query) && tag === "all" && source === "all" && page === 1);
        return (
            <div className="applications-container">
                <div className="applications-header-container">
                    <div className="applications-header">
                        <div className="left">
                            <h1 className="large">{I18n.t("applications.title")}</h1>
                            <p>{I18n.t("applications.subTitle")}</p>
                        </div>
                        <img src={StudentPng} alt="student"/>
                    </div>
                </div>
                <div className="inner-applications-container">
                    <div className="applications">
                        <div className="applications-search">
                            <div className={"sds--text-field sds--text-field--has-icon"}>
                                <div className="sds--text-field--shape">
                                    <div className="sds--text-field--input-and-icon">
                                        <input className={"sds--text-field--input"}
                                               type="search"
                                               onChange={e => setQuery(e.target.value)}
                                               value={query}
                                               placeholder={I18n.t("applications.searchPlaceHolder")}/>
                                        <span className="sds--text-field--icon">
                                            <SearchIcon/>
                                        </span>
                                    </div>
                                    <SelectField
                                        value={sourceOptions.find(option => option.value === source)}
                                        options={sourceOptions}
                                        searchable={false}
                                        onChange={option => setSource(option.value)}
                                    />
                                    <SelectField
                                        value={tagOptions.find(option => option.value === tag)}
                                        options={tagOptions}
                                        searchable={false}
                                        onChange={option => setTag(option.value)}
                                    />
                                </div>
                            </div>
                        </div>
                        {showMostRecent && <div className="applications-overview-recent-container">
                            <h2>{I18n.t("applications.recent")}</h2>
                            <div className="applications-overview-recent">
                                {recentServiceProviders.map((sp, index) => {
                                    const metaData = sp.data.metaDataFields;
                                    return (
                                        <div key={index}
                                             className="application-card"
                                             onClick={() => navigate(`/application-detail/${sp.type}/${sp['_id']}`)}>
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
                        {!showMostRecent && <div className="applications-overview">
                            <ul>
                                {filteredServiceProviders
                                    .slice((minimalPage - 1) * pageCount, minimalPage * pageCount)
                                    .map((idp, index) => {
                                            return (
                                                <li key={index}
                                                    onClick={() => navigate(`/application-detail/${idp.type}/${idp['_id']}`)}>
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
                    {!showMostRecent && <Pagination currentPage={page}
                                                    onChange={nbr => {
                                                        setPage(nbr);
                                                        storePageNumber(nbr);
                                                    }}
                                                    total={filteredServiceProviders.length}
                                                    pageCount={pageCount}/>}
                </div>

            </div>
        );
    }
;
export default Applications;