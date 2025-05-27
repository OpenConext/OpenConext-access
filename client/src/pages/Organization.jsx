import "./Organization.scss";
import React, {useEffect, useState} from "react";
import {useAppStore} from "../stores/AppStore";
import I18n from "../locale/I18n";
import {Alert, AlertType, Button} from "@surfnet/sds";
import Logo from "../icons/logo.svg";
import {useNavigate, useParams} from "react-router-dom";
import {organizationById} from "../api/index.js";

const Organization = () => {

    const {id} = useParams();

    const [organization, setOrganization] = useState(false);
    const [alertClosed, setAlertClosed] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        organizationById(organisationId)
            .then(res => {
            useAppStore.setState({
                breadcrumbPath: [
                    {path: "/home", value: I18n.t("breadCrumb.access")},
                    {path: `/organizations/${id}`, value: currentOrganization.name},
                    {value: I18n.t("breadCrumb.applications")}
                ]
            });
        }).catch(() => navigate("/404"));
    }, [currentOrganization]);

    const alertInfo = () => {
        if (alertClosed || currentOrganization.applicationCount > 0) {
            return null;
        }
        return (
            <Alert close={() => setAlertClosed(true)}
                   alertType={AlertType.Info}
                   asChild={true}
                   message={I18n.t("organization.alertInfo")}/>
        )
    }

    return (
        <div className="organization-outer-container">
            {alertInfo()}
            <div className="organization-container">
                <div className="organization">
                    <h2 className="one-row">{I18n.t("organization.applications")}</h2>
                    <div className="left">
                        <Logo/>
                        <Button onClick={() => navigate("/application/new")}
                                txt={I18n.t("organization.addApplication")}/>
                    </div>
                    <div className="right">
                        <p className="terms">{I18n.t("organization.catalog.terms")}</p>
                        <ul>
                            <li><p dangerouslySetInnerHTML={{__html: I18n.t("organization.catalog.fairUse")}}/></li>
                            <li><p dangerouslySetInnerHTML={{__html: I18n.t("organization.catalog.agreement")}}/></li>
                        </ul>
                        <p dangerouslySetInnerHTML={{__html: I18n.t("organization.catalog.disclaimer")}}/>
                    </div>
                </div>
            </div>
        </div>

    )
};
export default Organization;