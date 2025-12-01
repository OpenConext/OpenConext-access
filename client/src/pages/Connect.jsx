import "./Connect.scss";

import React from "react";
import I18n from "../locale/I18n.js";
import StudentPng from "../icons/student.png";
import {Button, ButtonType} from "@surfnet/sds";
import {useNavigate} from "react-router-dom";

const Connect = () => {

    const navigate = useNavigate();

    return (
        <div className="connect-container">
            <div className="connect-header-container">
                <div className="connect-header">
                    <div className="left">
                        <h1 className="large">{I18n.t("connect.title")}</h1>
                        <p>{I18n.t("connect.subTitle")}</p>
                    </div>
                    <img src={StudentPng} alt="student"/>
                </div>
            </div>
            <div className="inner-connect-container">
                <div className="connect">
                    <h2>{I18n.t("connect.formal")}</h2>
                    <p>{I18n.t("connect.formalInfo")}</p>
                    <div className="table-container">
                        <table>
                            <thead></thead>
                            <tbody>
                            <tr>
                                <td className="left-top">
                                    {I18n.t("connect.agreementTypes")}
                                </td>
                                <td>
                                    <p>{I18n.t("connect.testIdps")}</p>
                                    <span className="sub">{I18n.t("connect.accessTestIdps")}</span>
                                </td>
                                <td>
                                    <p>{I18n.t("connect.collaborations")}</p>
                                    <span className="sub">{I18n.t("connect.accessGroups")}</span>
                                </td>
                                <td>
                                    <p>{I18n.t("connect.enterprises")}</p>
                                    <span className="sub">{I18n.t("connect.accessStudent")}</span>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <p>{I18n.t("connect.commercial")}</p>
                                </td>
                                <td dangerouslySetInnerHTML={{__html: I18n.t("connect.fairUse")}}/>
                                <td dangerouslySetInnerHTML={{__html: I18n.t("connect.accessTOS")}}/>
                                <td dangerouslySetInnerHTML={{__html: I18n.t("connect.connectionAgreement")}}/>
                            </tr>
                            <tr>
                                <td>
                                    <p>{I18n.t("connect.surfMember")}<sup>*</sup></p>
                                </td>
                                <td><span>{I18n.t("connect.notNeeded")}</span></td>
                                <td><span>{I18n.t("connect.notNeeded")}</span></td>
                                <td dangerouslySetInnerHTML={{__html: I18n.t("connect.memberAgreement")}}/>
                            </tr>
                            </tbody>
                        </table>
                        <p className="sup-info"><sup>*</sup>{I18n.t("connect.surfMemberInfo")}</p>
                    </div>
                    <p>{I18n.t("connect.provisions")}</p>
                </div>
                <div className="connect">
                    <h2>{I18n.t("connect.technical")}</h2>
                    <p>{I18n.t("connect.technicalInfo")}</p>
                    <div>
                        <p>{I18n.t("connect.serviceInfo")}</p>
                        <ul>
                            {I18n.translations[I18n.locale].connect.serviceBullets
                                .map(s => <li dangerouslySetInnerHTML={{__html: s}}/>)}
                        </ul>
                    </div>
                    <div>
                        <h5>{I18n.t("connect.samlOidc")}</h5>
                        <p>{I18n.t("connect.samlOidcInfo")}</p>
                    </div>
                    <div>
                        <h5>{I18n.t("connect.attributes")}</h5>
                        <p>{I18n.t("connect.attributesInfo")}</p>
                    </div>
                </div>
                <div className="button-container">
                    <Button type={ButtonType.Primary}
                            onClick={() => navigate("/login-info")}
                            txt={I18n.t("connect.connect")}/>
                </div>
            </div>
        </div>
    );


}
export default Connect;