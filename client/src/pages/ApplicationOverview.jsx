import "./ApplicationOverview.scss";
import React, {useEffect, useState} from "react";
import {publicServiceProviders} from "../api/index.js";
import I18n from "../locale/I18n.js";
import {useNavigate} from "react-router";
import {Chip, ChipType} from "../components/Chip.jsx";
import {Card, CardContent, InputGroup, InputGroupAddon, InputGroupInput, Spinner, Tabs, TabsList, TabsTrigger} from "@surfnet/curve-react";
import {SquaresFourIcon, ListBulletsIcon, MagnifyingGlassIcon as SearchIcon} from "@phosphor-icons/react";
import SelectField from "../components/SelectField.jsx";
import {isEmpty} from "../utils/Utils.js";
import {CHANGE_REQUEST_TYPE, providerDescription, providerName, providerOrganizationName} from "../utils/Manage.js";
import {useAppStore} from "../stores/AppStore.js";
import {Entities} from "../components/Entities.jsx";
import {formatLongDate} from "../utils/Date.js";
import PlaceHolderImage from "../icons/placeholder-image.svg";
import {mainMenuItems} from "../utils/MenuItems.js";
import {useShallow} from "zustand/react/shallow";

const views = {
    grid: "grid",
    list: "list"
}

const ApplicationOverview = ({accessible}) => {

        const navigate = useNavigate();

        const {currentOrganization, config} = useAppStore(useShallow(state => ({
            currentOrganization: state.currentOrganization,
            config: state.config
        })));

        const [loading, setLoading] = useState(true);
        const [view, setView] = useState(views.list);
        const [gridQuery, setGridQuery] = useState("");
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
                        entity.created = entity.revision?.created
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
            return <div className="loading-container"><Spinner className="size-8"/></div>
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

        const filteredServiceProviders = (tag === "all" && source === "all" && loa === "all" && consent === "all") ?
            serviceProviders : serviceProviders.filter(filterSP);

        const renderGridViewApplications = () => {
            const queryLower = gridQuery.trim().toLowerCase();
            const gridServiceProviders = isEmpty(queryLower) ? filteredServiceProviders :
                filteredServiceProviders.filter(entity =>
                    (entity.name || "").toLowerCase().includes(queryLower) ||
                    (entity.vendor || "").toLowerCase().includes(queryLower));
            return (
                <div className="accessible-apps-grid">
                    <div className="accessible-apps-grid-filters">
                        <InputGroup className="accessible-apps-grid-search">
                            <InputGroupInput type="search"
                                             value={gridQuery}
                                             onChange={e => setGridQuery(e.target.value)}
                                             placeholder={I18n.t("accessibleApps.searchPlaceHolder")}/>
                            <InputGroupAddon align="inline-end">
                                <SearchIcon/>
                            </InputGroupAddon>
                        </InputGroup>
                        {filters()}
                    </div>
                    <div className="accessible-apps-grid-cards">
                        {gridServiceProviders.map(entity => {
                            const logoUrl = entity.data.metaDataFields["logo:0:url"];
                            return (
                                <Card key={entity["_id"]} className="accessible-app-card"
                                      onClick={() => navigate(`/application-detail/${entity.type}/${entity["_id"]}`)}>
                                    <CardContent>
                                        <div className="accessible-app-card-icon">
                                            {logoUrl ? <img src={logoUrl} alt=""/> : <PlaceHolderImage/>}
                                        </div>
                                        <h4 className="mb-1">{entity.name}</h4>
                                        <div className="accessible-app-card-meta">
                                            <span>{entity.vendor}</span>
                                            <span>{formatLongDate(entity.created, true, false)}</span>
                                        </div>
                                        <p className="accessible-app-card-description">{providerDescription(I18n.locale, entity)}</p>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            );
        }

        return (
            <div className="accessible-apps-container">
                <div className="accessible-apps-header-container">
                    <div className="accessible-apps-header-row">
                        {accessible && <div className="accessible-apps-header">
                            <h1 className="large text-[length:var(--text-2xl-font-size)] mb-[18px]">{I18n.t("accessibleApps.title")}</h1>
                            <p>{I18n.t("accessibleApps.subTitle", {name: providerName(I18n.locale, currentOrganization.identityProvider)})}</p>
                        </div>}
                        {!accessible && <div className="accessible-apps-header">
                            <h1 className="large text-[length:var(--text-2xl-font-size)] mb-[18px]">{I18n.t("userHome.catalogue.title")}</h1>
                            <p>{I18n.t("userHome.catalogue.subTitle")}</p>
                        </div>}
                        {!isEmpty(serviceProviders) &&
                            <Tabs value={view} onValueChange={setView} className="view-switcher-tabs">
                                <TabsList>
                                    <TabsTrigger value={views.list}>
                                        <ListBulletsIcon/>
                                        <span>{I18n.t("accessibleApps.list")}</span>
                                    </TabsTrigger>
                                    <TabsTrigger value={views.grid}>
                                        <SquaresFourIcon/>
                                        <span>{I18n.t("accessibleApps.grid")}</span>
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>}
                    </div>
                </div>
                <div className="accessible-apps">
                    {view === views.grid ? renderGridViewApplications() :
                        <Entities
                            entities={filteredServiceProviders}
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
                            inputFocus={true}/>}
                </div>
            </div>
        );
    }
;
export default ApplicationOverview;
