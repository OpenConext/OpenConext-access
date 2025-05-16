import "./Organisation.scss";
import React, {useEffect, useState} from "react";
import {useAppStore} from "../stores/AppStore";
import I18n from "../locale/I18n";
import {isEmpty} from "../utils/Utils.js";
import {Alert, AlertType, Button} from "@surfnet/sds";
import Logo from "../icons/logo.svg";
import {useNavigate} from "react-router-dom";

const Organisation = () => {

    const {user} = useAppStore(state => state);
    const [alertClosed, setAlertClosed] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        useAppStore.setState({
            breadcrumbPath: [
                {path: "/home", value: I18n.t("breadCrumb.access")},
                {path: "/organizations/", value: "TODO Org Name"},
                {value: I18n.t("breadCrumb.applications")}
            ]
        });
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
                       message={I18n.t("organisation.alertInfo")}/>
            )
        }
    }

    return (
        <div className="organisation-outer-container">
            {alertInfo()}
            <div className="organisation-container">

            <div className="organisation">
                <h2 className="one-row">{I18n.t("organisation.applications")}</h2>
                <div className="left">
                    <Logo/>
                    <Button onClick={() => navigate("/application/new")}
                            txt={I18n.t("organisation.addApplication")}/>
                </div>
                <div className="right">
                    <p className="terms">{I18n.t("organisation.catalog.terms")}</p>
                    <ul>
                        <li><p dangerouslySetInnerHTML={{__html: I18n.t("organisation.catalog.fairUse")}}/></li>
                        <li><p dangerouslySetInnerHTML={{__html: I18n.t("organisation.catalog.agreement")}}/></li>
                    </ul>
                    <p dangerouslySetInnerHTML={{__html: I18n.t("organisation.catalog.disclaimer")}}/>
                </div>
            </div>
        </div>
        </div>

    )
};
export default Organisation;