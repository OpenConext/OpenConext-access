import "./Organization.scss";
import React, {useEffect, useState} from "react";
import {useAppStore} from "../stores/AppStore";
import I18n from "../locale/I18n";
import {Alert, AlertType, Button, Loader} from "@surfnet/sds";
import Logo from "../icons/logo.svg";
import {useNavigate, useParams} from "react-router-dom";
import {organizationById} from "../api/index.js";
import {isEmpty} from "../utils/Utils.js";
import ImageNotFound from "../icons/image-not-found.svg";
import ArrowRight from "@surfnet/sds/icons/functional-icons/arrow-right-2.svg";

const Organization = () => {

    const {organisationId} = useParams();
    const [loading, setLoading] = useState(true);
    const [organization, setOrganization] = useState({});
    const [alertClosed, setAlertClosed] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        organizationById(organisationId)
            .then(res => {
                setOrganization(res);
                useAppStore.setState({
                    currentOrganization: res,
                    breadcrumbPath: [
                        {path: "/home", value: I18n.t("breadCrumb.access")},
                        {path: `/organization/${res.id}`, value: res.name},
                        {value: I18n.t("breadCrumb.applications")}
                    ]
                });
                setLoading(false);
            }).catch(() => {
            navigate("/404")
        });
    }, [organisationId]);

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
    if (loading) {
        return <Loader/>
    }

    return (
        <div
            className={`organization-outer-container ${isEmpty(organization.applications) ? "" : "with-applications"}`}>
            {alertInfo()}
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
                                <li><p dangerouslySetInnerHTML={{__html: I18n.t("organization.catalog.fairUse")}}/></li>
                                <li><p dangerouslySetInnerHTML={{__html: I18n.t("organization.catalog.agreement")}}/>
                                </li>
                            </ul>
                            <p dangerouslySetInnerHTML={{__html: I18n.t("organization.catalog.disclaimer")}}/>
                        </div>
                    </div>}
                {!isEmpty(organization.applications) &&
                    <div className="applications">
                        <h2>{I18n.t("organization.applications")}</h2>
                        {organization.applications.map((application, index) =>
                            <div key={index} className="first-application">
                                <div
                                    className="application"
                                    onClick={() => navigate(`/connection/${application.id}`)}>
                                    {isEmpty(application.logoUrl) ? <ImageNotFound/> :
                                        <img src={application.logoUrl} alt={application.name}/>}
                                    <p>{application.name}</p>
                                    <span><ArrowRight/></span>
                                </div>
                                {index === 0 && <Button onClick={() => navigate("/application/new")}
                                                        txt={I18n.t("organization.addApplication")}/>}
                            </div>
                        )}
                    </div>
                }
            </div>
        </div>

    )
};
export default Organization;