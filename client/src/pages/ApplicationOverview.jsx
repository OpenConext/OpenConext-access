import "./ApplicationOverview.scss";
import React, {useEffect, useState} from "react";
import {publicServiceProviders} from "../api/index.js";
import I18n from "../locale/I18n.js";
import {useNavigate} from "react-router";
import {Badge, Card, CardContent, InputGroup, InputGroupAddon, InputGroupInput, Spinner, Tabs, TabsList, TabsTrigger} from "@surfnet/curve-react";
import {ListBulletsIcon, MagnifyingGlassIcon as SearchIcon, SquaresFourIcon} from "@phosphor-icons/react";
import {isEmpty} from "../utils/Utils.js";
import {CHANGE_REQUEST_TYPE, providerDescription, providerName, providerOrganizationName} from "../utils/Manage.js";
import {useAppStore} from "../stores/AppStore.js";
import {Entities} from "../components/Entities.jsx";
import {StretchedLink} from "../components/StretchedLink.jsx";
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

        const {currentOrganization} = useAppStore(useShallow(state => ({
            currentOrganization: state.currentOrganization
        })));

        const [loading, setLoading] = useState(true);
        const [view, setView] = useState(accessible ? views.list : views.grid);
        const [gridQuery, setGridQuery] = useState("");
        const [serviceProviders, setServiceProviders] = useState([]);

        //ApplicationOverview is reused (not remounted) when navigating between /catalogue and
        ///accessible-apps - both routes render the same component type, just a different "accessible"
        //prop - so the searchbox must be explicitly reset here rather than relying on unmount
        const [previousAccessible, setPreviousAccessible] = useState(accessible);
        if (previousAccessible !== accessible) {
            setPreviousAccessible(accessible);
            setGridQuery("");
        }

        useEffect(() => {
            useAppStore.setState({
                breadcrumbPaths: [
                    {path: "/home", value: I18n.t("breadCrumb.access"), menuItemName: mainMenuItems.home},
                    {value: I18n.t(`navigation.${accessible ? "accessibleApps" : "catalogue"}`)}
                ],
                activeMenuItem: accessible ? mainMenuItems.accessibleApps : mainMenuItems.catalogue
            });

            publicServiceProviders(currentOrganization?.manageIdentifier)
                .then(res => {
                    //Scope the services on the allowed-entities of the IdP of the user
                    const openConnectionRequests = (currentOrganization?.changeRequests || [])
                        .filter(changeRequest => changeRequest.requestType === CHANGE_REQUEST_TYPE.LINK_REQUEST &&
                            changeRequest.pathUpdateType === "ADDITION")
                        .map(changeRequest => changeRequest.pathUpdates?.allowedEntities?.name)
                        .filter(Boolean);
                    if (accessible) {
                        const allowedAll = currentOrganization?.identityProvider?.data?.allowedall || false;
                        const allowedEntities = (currentOrganization?.identityProvider?.data?.allowedEntities || []).map(entity => entity.name);
                        res = res.filter(entity => allowedAll || allowedEntities.includes(entity.data.entityid) || openConnectionRequests.includes(entity.data.entityid))
                    } else {
                        //In the case of eduID / external user, we don't have an identityProvider
                        const allowedEntities = (currentOrganization?.identityProvider?.data?.allowedEntities || []).map(entity => entity.name);
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
                    setView(accessible ? views.list : views.grid);
                    setLoading(false);
                })
                .catch(() => {
                    navigate("/404");
                });
        }, [accessible]);// eslint-disable-line react-hooks/exhaustive-deps

        if (loading) {
            return <div className="loading-container"><Spinner className="size-8"/></div>
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

            accessible ?
                {
                    key: "connectionRequest",
                    header: I18n.t("accessibleApps.status"),
                    mapper: entity => entity.connectionRequest ?
                        <Badge variant="danger">{I18n.t("accessibleApps.connectRequested")}</Badge> :
                        <Badge variant="success">{I18n.t("accessibleApps.connectActive")}</Badge>
                } : null,
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
        ].filter(column => !isEmpty(column));

        const filteredServiceProviders = serviceProviders;

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

                    </div>
                    <div className="accessible-apps-grid-cards">
                        {gridServiceProviders.map(entity => {
                            const logoUrl = entity.data.metaDataFields["logo:0:url"];
                            const description = providerDescription(I18n.locale, entity);
                            return (
                                <Card key={entity["_id"]} className="accessible-app-card">
                                    <StretchedLink to={`/application-detail/${entity.type}/${entity["_id"]}`}/>
                                    {entity.connectionRequest &&
                                        <Badge variant="danger"
                                               className="accessible-app-card-badge">{I18n.t("accessibleApps.connectRequested")}</Badge>}
                                    <CardContent>
                                        <div className="accessible-app-card-icon">
                                            {logoUrl ? <img src={logoUrl} alt=""/> : <PlaceHolderImage/>}
                                        </div>
                                        <h4 className="font-bold mb-1">{entity.name}</h4>
                                        <span className="accessible-app-card-vendor">{entity.vendor}</span>
                                        {!isEmpty(description) &&
                                            <p className="accessible-app-card-description">{description}</p>}
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
                            <p>{I18n.t("accessibleApps.subTitle", {name: providerName(I18n.locale, currentOrganization?.identityProvider)})}</p>
                        </div>}
                        {!accessible && <div className="accessible-apps-header">
                            <h1 className="large text-[length:var(--text-2xl-font-size)] mb-[18px]">{I18n.t("userHome.catalogue.title")}</h1>
                            <p>{I18n.t("userHome.catalogue.subTitle")}</p>
                        </div>}
                        {!isEmpty(serviceProviders) &&
                            <Tabs value={view} onValueChange={setView} className="view-switcher-tabs">
                                <TabsList>
                                    <TabsTrigger value={views.grid}>
                                        <SquaresFourIcon/>
                                        <span>{I18n.t("accessibleApps.grid")}</span>
                                    </TabsTrigger>
                                    <TabsTrigger value={views.list}>
                                        <ListBulletsIcon/>
                                        <span>{I18n.t("accessibleApps.list")}</span>
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
                            hideTitle={true}
                            showNew={false}
                            displaySearch={true}
                            searchAlignLeft={true}
                            query={gridQuery}
                            onQueryChange={setGridQuery}
                            searchAttributes={["name", "vendor"]}
                            rowLinkMapper={(e, entity) => navigate(`/application-detail/${entity.type}/${entity["_id"]}`)}
                            rowHrefMapper={entity => `/application-detail/${entity.type}/${entity["_id"]}`}
                            newEntityFunc={() => navigate("/application/new")}
                            inputFocus={true}/>}
                </div>
            </div>
        );
    }
;
export default ApplicationOverview;
