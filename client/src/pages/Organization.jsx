import "./Organization.scss";
import React, {useEffect, useState} from "react";
import {useAppStore} from "../stores/AppStore";
import I18n from "../locale/I18n";
import {Alert, AlertType, Button, Loader, MoreLessToggle} from "@surfnet/sds";
import Logo from "../icons/logo.svg";
import {useNavigate, useParams} from "react-router-dom";
import {organizationById} from "../api/index.js";
import {isEmpty} from "../utils/Utils.js";
import ImageNotFound from "../icons/image-not-found.svg";
import ArrowRight from "@surfnet/sds/icons/functional-icons/arrow-right-2.svg";
import {OrganizationHeader} from "../components/OrganizationHeader.jsx";
import {convertServerApplicationToClient} from "../utils/Application.js";
import {TeamManagement} from "../organization/TeamManagement.jsx";

const tabNames = ["applications", "team", "joins"]

const Organization = () => {
    const {user} = useAppStore(state => state);
    const {tab = "applications"} = useParams();
    const {organizationId} = useParams();
    const [loading, setLoading] = useState(true);
    const [organization, setOrganization] = useState({});
    const [alertClosed, setAlertClosed] = useState(false);
    const [refresh, setRefresh] = useState(false);
    const [currentTab, setCurrentTab] = useState(tab);
    const navigate = useNavigate();

    useEffect(() => {
        organizationById(organizationId)
            .then(res => {
                res.applications = res.applications.map(application => convertServerApplicationToClient(application))
                setOrganization(res);
                useAppStore.setState({
                    currentOrganization: res,
                    breadcrumbPath: [
                        {path: "/home", value: I18n.t("breadCrumb.access")},
                        {path: `/organization/${res.id}`, value: res.name},
                        {value: I18n.t("breadCrumb.applications")}
                    ]
                });
                tabChanged(currentTab);
                setLoading(false);
            }).catch(() => {
            navigate("/404")
        });
    }, [organizationId, refresh]);

    const alertInfo = () => {
        if (alertClosed || organization.applicationCount > 0) {
            return null;
        }
        return (
            <Alert close={() => setAlertClosed(true)}
                   alertType={AlertType.Info}
                   asChild={true}
                   message={I18n.t("organization.alertInfo")}/>
        )
    }

    const renderApplications = () => {
        return (
            <>
                <div className="organization-container">
                    {isEmpty(organization.applications) &&
                        <div className="organization">
                            <h2 className="one-row">{I18n.t("organization.applications")}</h2>
                            <div className="left">
                                <Logo/>
                                <Button onClick={() => navigate("/application/new")}
                                        txt={I18n.t("organization.addFirstApplication")}/>
                            </div>
                            <div className="right">
                                <p className="terms">{I18n.t("organization.catalog.terms")}</p>
                                <ul>
                                    <li><p dangerouslySetInnerHTML={{__html: I18n.t("organization.catalog.fairUse")}}/>
                                    </li>
                                    <li><p
                                        dangerouslySetInnerHTML={{__html: I18n.t("organization.catalog.agreement")}}/>
                                    </li>
                                </ul>
                                <p dangerouslySetInnerHTML={{__html: I18n.t("organization.catalog.disclaimer")}}/>
                            </div>
                        </div>}
                    {!isEmpty(organization.applications) &&
                        <div className="applications">
                            <h2>{I18n.t("organization.applications")}</h2>
                            {organization.applications
                                .sort((a1, a2) => a1.name.toLowerCase().localeCompare(a2.name.toLowerCase()))
                                .map((application, index) =>
                                    <div key={index} className="first-application">
                                        <div
                                            className="application"
                                            onClick={() => navigate(`/connection/${application.id}`)}>
                                            {isEmpty(application.logoUrl) ? <ImageNotFound/> :
                                                <img src={application.logoUrl} alt={application.name}/>}
                                            <div className="application-info">
                                                <h4>{application.name}</h4>
                                                {application.information.descriptionEN &&
                                                    <MoreLessToggle
                                                        txt={application.information[`description${I18n.locale.toUpperCase()}`]}
                                                        cutoffNumber={300}
                                                        moreLabel={I18n.t("forms.moreLabel")}
                                                        lessLabel={I18n.t("forms.lessLabel")}/>
                                                }
                                                {application.information.webSite &&
                                                    <a href={application.information.webSite}
                                                       className="web-site"
                                                       target="_blank">{application.information.webSite}</a>}
                                            </div>
                                            <span className="navigation"><ArrowRight/></span>
                                        </div>
                                        {index === 0 && <Button onClick={() => navigate("/application/new")}
                                                                txt={I18n.t("organization.addApplication")}/>}
                                    </div>
                                )}
                        </div>
                    }
                </div>
            </>
        );
    }

    const tabChanged = (name) => {
        setCurrentTab(name);
        useAppStore.setState({
            breadcrumbPath: [
                {path: "/home", value: I18n.t("breadCrumb.access")},
                {path: `/organization/${organizationId}`, value: organization.name},
                {value: I18n.t(`breadCrumb.${name}`)}
            ]
        });
        navigate(`/organization/${organizationId}/${name}`);
    }

    const renderTeamManagement = () => {
        return (
            <>
                <div className="organization-container">
                    <TeamManagement organization={organization} user={user} setRefresh={setRefresh}/>
                </div>
            </>
        );
    };

    const renderJoinRequests = () => {
        return (
            <>
                <div className="organization-container">
                    <code>{JSON.stringify(organization.joinRequests)}</code>
                </div>
            </>
        );
    };

    const renderCurrentTab = () => {
        switch (currentTab) {
            case "applications": {
                return renderApplications();
            }
            case  "team": {
                return renderTeamManagement();
            }
            case  "joins": {
                return renderJoinRequests();
            }
            default:
                throw new Error(`Unknown tab; ${currentTab}`)
        }
    }


    if (loading) {
        return <Loader/>
    }

    return (
        <div
            className={`organization-outer-container ${isEmpty(organization.applications) ? "" : "with-applications"}`}>
            {alertInfo()}
            <OrganizationHeader organization={organization}
                                tab={currentTab}
                                setTab={tabChanged}
                                tabNames={tabNames}
                                setLoading={setLoading}/>
            {renderCurrentTab()}
        </div>

    )
};
export default Organization;