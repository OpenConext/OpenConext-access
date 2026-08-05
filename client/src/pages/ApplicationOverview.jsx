import "./ApplicationOverview.scss";
import React, {useEffect, useState} from "react";
import {publicServiceProviders} from "../api/index.js";
import I18n from "../locale/I18n.js";
import {useNavigate} from "react-router";
import {Chip, ChipType, Loader} from "@surfnet/sds";
import SelectField from "../components/SelectField.jsx";
import {isEmpty} from "../utils/Utils.js";
import {CHANGE_REQUEST_TYPE, providerName, providerOrganizationName} from "../utils/Manage.js";
import {useAppStore} from "../stores/AppStore.js";
import {Entities} from "../components/Entities.jsx";
import {formatLongDate} from "../utils/Date.js";
import PlaceHolderImage from "@surfnet/sds/icons/placeholder-image.svg";
import {mainMenuItems} from "../utils/MenuItems.js";
import {useShallow} from "zustand/react/shallow";

const ApplicationOverview = ({accessible}) => {

        const navigate = useNavigate();

        const {currentOrganization, config} = useAppStore(useShallow(state => ({
            currentOrganization: state.currentOrganization,
            config: state.config
        })));

        const [loading, setLoading] = useState(true);
        const [serviceProviders, setServiceProviders] = useState([]);
        const [tag, setTag] = useState(null);
        const [tagOptions, setTagOptions] = useState([]);
        const [source, setSource] = useState(null);
        const [sourceOptions, setSourceOptions] = useState([]);
        const [consent, setConsent] = useState(null);
        const [consentOptions, setConsentOptions] = useState([]);
        const [loa, setLoa] = useState(null);
        const [loaOptions, setLoaOptions] = useState([]);

        useEffect(() => {
            useAppStore.setState({
                breadcrumbPaths: [
                    {path: "/home", value: I18n.t("breadCrumb.access"), menuItemName: mainMenuItems.home},
                    {value: I18n.t(`navigation.${accessible ? "accessibleApps" : "catalogue"}`)}
                ],
                activeMenuItem: accessible ? mainMenuItems.accessibleApps : mainMenuItems.catalogue
            });

            publicServiceProviders(currentOrganization.manageIdentifier)
                .then(res => {
                    //Scope the services on the allowed-entities of the IdP of the user
                    const openConnectionRequests = (currentOrganization.changeRequests || [])
                        .filter(changeRequest => changeRequest.requestType === CHANGE_REQUEST_TYPE.LINK_REQUEST &&
                            changeRequest.pathUpdateType === "ADDITION")
                        .map(changeRequest => changeRequest.pathUpdates?.allowedEntities?.name)
                        .filter(Boolean);
                    if (accessible) {
                        const allowedAll = currentOrganization.identityProvider?.data?.allowedall;
                        const allowedEntities = (currentOrganization.identityProvider?.data?.allowedEntities || []).map(entity => entity.name);
                        res = res.filter(entity => allowedAll || allowedEntities.includes(entity.data.entityid) || openConnectionRequests.includes(entity.data.entityid))
                    } else {
                        //In the case of eduID / external user, we don't have an identityProvider
                        const allowedEntities = (currentOrganization.identityProvider?.data?.allowedEntities || []).map(entity => entity.name);
                        res = res.filter(entity => !allowedEntities.includes(entity.data.entityid) && !openConnectionRequests.includes(entity.data.entityid))
                    }
                    res.forEach(entity => {
                        entity.name = providerName(I18n.locale, entity);
                        entity.vendor = providerOrganizationName(I18n.locale, entity);
                        entity.created = entity.revision.created
                        entity.connectionRequest = openConnectionRequests.includes(entity.data.entityid);
                    });
                    res = res
                        .sort((sp1, sp2) => sp1.name.toLowerCase()
                            .localeCompare(sp2.name.toLowerCase()));
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
                        label: `${I18n.t("accessibleApps.all")} (${res.length})`
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
                        label: `${I18n.t("accessibleApps.allSources")} (${res.length})`
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
                    const isVendor = isEmpty(currentOrganization.manageIdentifier);
                    if (isVendor || !accessible) {
                        setLoading(false);
                    } else {
                        // LoA options from config.acrValues
                        const stepupEntities = currentOrganization.identityProvider?.data?.stepupEntities || [];
                        const defaultLoa = {value: "all", label: `${I18n.t("accessibleApps.allLoa")} (${res.length})`};
                        const newLoaOptions = [defaultLoa].concat(
                            (config.acrValues || []).map(uri => {
                                const key = uri.substring(uri.lastIndexOf("/") + 1).replace(".", "_");
                                const count = stepupEntities.filter(e => e.level === uri).length;
                                return {value: uri, label: `${I18n.t(`accessibleApps.loa.${key}`)} (${count})`};
                            })
                        );
                        setLoa(defaultLoa.value);
                        setLoaOptions(newLoaOptions);

                        // Consent options from disableConsent types (deduplicated)
                        const disableConsent = currentOrganization.identityProvider?.data?.disableConsent || [];
                        const consentTypes = [...new Set(disableConsent.map(e => e.type))];
                        const defaultConsent = {
                            value: "all",
                            label: `${I18n.t("accessibleApps.allConsent")} (${res.length})`
                        };
                        const newConsentOptions = [defaultConsent].concat(
                            consentTypes.map(type => {
                                const count = disableConsent.filter(e => e.type === type).length;
                                return {value: type, label: `${I18n.t(`accessibleApps.consent.${type}`)} (${count})`};
                            })
                        );
                        setConsent(defaultConsent.value);
                        setConsentOptions(newConsentOptions);
                        setLoading(false);
                    }

                })
                .catch(() => {
                    navigate("/404");
                });
        }, [accessible]);// eslint-disable-line react-hooks/exhaustive-deps

        const filterSP = sp => {
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
            const isVendor = isEmpty(currentOrganization.manageIdentifier);
            if (isVendor || !accessible) {
                return tagHit && sourceHit;
            }
            let loaHit = true;
            if (loa !== "all") {
                const stepupEntities = currentOrganization.identityProvider?.data?.stepupEntities || [];
                loaHit = stepupEntities.some(e => e.name === sp.data.entityid && e.level === loa);
            }
            let consentHit = true;
            if (consent !== "all") {
                const disableConsent = currentOrganization.identityProvider?.data?.disableConsent || [];
                consentHit = disableConsent.some(e => e.name === sp.data.entityid && e.type === consent);
            }
            return tagHit && sourceHit && loaHit && consentHit;
        }

        if (loading) {
            return <Loader/>
        }

        const filters = () => {
            return (
                <>
                    <SelectField className="select-sources"
                                 value={sourceOptions.find(option => option.value === source)}
                                 options={sourceOptions}
                                 searchable={false}
                                 onChange={option => setSource(option.value)}
                    />
                    <SelectField className="select-tags"
                                 value={tagOptions.find(option => option.value === tag)}
                                 options={tagOptions}
                                 searchable={false}
                                 onChange={option => setTag(option.value)}
                    />
                    {accessible && !isEmpty(currentOrganization.manageIdentifier) &&
                        <>
                            <SelectField className="select-loas"
                                         value={loaOptions.find(option => option.value === loa)}
                                         options={loaOptions}
                                         searchable={false}
                                         onChange={option => setLoa(option.value)}
                            />
                            <SelectField className="select-consent"
                                         value={consentOptions.find(option => option.value === consent)}
                                         options={consentOptions}
                                         searchable={false}
                                         onChange={option => setConsent(option.value)}
                            />

                        </>}
                </>
            );
        }

        const columns = [
            {
                nonSortable: true,
                key: "icon",
                header: "",
                mapper: entity => {
                    const logoUrl = entity.data.metaDataFields["logo:0:url"];
                    return logoUrl ? <img src={logoUrl} alt=""/> : <PlaceHolderImage/>
                }
            },
            {
                key: "name",
                header: I18n.t("accessibleApps.name"),
                mapper: entity => entity.name
            },
            {
                key: "connectionRequest",
                header: "",
                mapper: entity => entity.connectionRequest && <Chip type={ChipType.Status_error}
                                                                    label={I18n.t("accessibleApps.connectRequested")}/>
            },
            {
                key: "vendor",
                header: I18n.t("accessibleApps.vendor"),
                mapper: entity => entity.vendor
            },
            {
                key: "created",
                header: I18n.t("accessibleApps.created"),
                mapper: entity => formatLongDate(entity.created, true, false)
            },
            {
                key: "space",
                nonSortable: true,
                header: "",
                mapper: () => null
            }
        ];

        return (
            <div className="accessible-apps-container">
                <div className="accessible-apps-header-container">
                    {accessible && <div className="accessible-apps-header">
                        <h2 className="large">{I18n.t("accessibleApps.title")}</h2>
                        <p>{I18n.t("accessibleApps.subTitle", {name: providerName(I18n.locale, currentOrganization.identityProvider)})}</p>
                    </div>}
                    {!accessible && <div className="accessible-apps-header">
                        <h2 className="large">{I18n.t("userHome.catalogue.title")}</h2>
                        <p>{I18n.t("userHome.catalogue.subTitle")}</p>
                    </div>}
                </div>
                <div className="accessible-apps">
                    <Entities
                        entities={(tag === "all" && source === "all" && loa === "all" && consent === "all") ? serviceProviders : serviceProviders.filter(filterSP)}
                        modelName="accessibleApps"
                        defaultSort="name"
                        columns={columns}
                        filters={filters()}
                        hideTitle={true}
                        showNew={false}
                        displaySearch={true}
                        searchAttributes={["name", "vendor"]}
                        rowLinkMapper={(e, entity) => navigate(`/application-detail/${entity.type}/${entity["_id"]}`)}
                        newEntityFunc={() => navigate("/application/new")}
                        inputFocus={true}/>
                </div>
            </div>
        );
    }
;
export default ApplicationOverview;
