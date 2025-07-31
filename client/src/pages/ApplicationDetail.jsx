import "./ApplicationDetail.scss";
import React, {useEffect, useState} from "react";
import {publicServiceProviderByDetail} from "../api/index.js";
import I18n from "../locale/I18n.js";
import {useNavigate, useParams} from "react-router-dom";
import {Button, ButtonType, ButtonIconPlacement, Loader} from "@surfnet/sds";
import StudentPng from "../icons/student2.png";
import PlaceHolderImage from "@surfnet/sds/icons/placeholder-image.svg";
import ArrowLeftIcon from "@surfnet/sds/icons/functional-icons/arrow-left-2.svg";
import {idpName, idpOrganizationName} from "../utils/Manage.js";

const ApplicationDetail = () => {

        const navigate = useNavigate();
        const {manageType, manageId} = useParams();
        const [loading, setLoading] = useState(true);
        const [serviceProvider, setServiceProvider] = useState([]);

        useEffect(() => {
            publicServiceProviderByDetail(manageType, manageId)
                .then(res => {
                    setServiceProvider(res);
                    setLoading(false);
                })
                .catch(e => {
                    navigate("/404");
                });
        }, []);// eslint-disable-line react-hooks/exhaustive-deps

        if (loading) {
            return <Loader/>
        }

        const metaData = serviceProvider.data.metaDataFields;

        return (
            <div className="application-detail-container">
                <div className="application-detail-header-container">
                    <div className="application-detail-header">
                        <div className="left">
                            <h1 className="large">{I18n.t("applicationDetail.title")}</h1>
                            <p>{I18n.t("applicationDetail.subTitle")}</p>
                        </div>
                        <img src={StudentPng} alt="student"/>
                    </div>
                </div>
                <div className="inner-application-detail-container">
                    <div className="application-detail">
                        <div className="meta-data">
                            {metaData["logo:0:url"] && <img src={metaData["logo:0:url"]} alt=""/>}
                            {!metaData["logo:0:url"] && <PlaceHolderImage/>}
                            <div className="meta-data-name">
                                <p className="organization">
                                    {idpOrganizationName(I18n.locale, serviceProvider)}
                                </p>
                                <p className="name">
                                    {idpName(I18n.locale, serviceProvider)}
                                </p>
                            </div>
                            <Button type={ButtonType.Secondary}
                                    icon={<ArrowLeftIcon/>}
                                    iconPlacement={ButtonIconPlacement.Left}
                                    onClick={() => navigate("/applications")}
                                    txt={I18n.t("applicationDetail.back")}/>
                        </div>
                        <div className="details">
                            {JSON.stringify(serviceProvider)}
                        </div>
                    </div>
                </div>

            </div>
        );
    }
;
export default ApplicationDetail;