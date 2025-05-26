import "./Organization.scss";
import React, {useEffect, useState} from "react";
import {useAppStore} from "../stores/AppStore";
import I18n from "../locale/I18n";
import {isEmpty} from "../utils/Utils.js";
import {Alert, AlertType, Button} from "@surfnet/sds";
import Logo from "../icons/logo.svg";
import {useNavigate, useParams} from "react-router-dom";
import {organizationById} from "../api/index.js";

const Organization = () => {

    const {id} = useParams();

    const {user} = useAppStore(state => state);
    const [alertClosed, setAlertClosed] = useState(false);
    const [organization, setOrganization] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        organizationById(id).then(res => {
            setOrganization(res);
            useAppStore.setState({
                organization: res,
                breadcrumbPath: [
                    {path: "/home", value: I18n.t("breadCrumb.access")},
                    {path: `/organizations/${id}`, value: res.name},
                    {value: I18n.t("breadCrumb.applications")}
                ]
            });

        })
    }, []);

    const alertInfo = () => {
        if (alertClosed) {
            return null;
        }
        if (isEmpty(user?.organizationMemberships)) {
            return (
                <Alert close={() => setAlertClosed(true)}
                       alertType={AlertType.Info}
                       asChild={true}
                       message={I18n.t("organization.alertInfo")}/>
            )
        }
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