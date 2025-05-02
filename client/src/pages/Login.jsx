import React from "react";
import './Login.scss';
import I18n from "../locale/I18n";
import logo from "../icons/landing/logo.svg";
import {Background} from "../components/Background.jsx";

export const Login = () => {

    return (
        <div className="about-container">
            <div className="about">
                <div className="top">
                    <div className="top-right">
                        <h1 className="title small">
                            {I18n.t("about.eduID")}
                        </h1>
                        <h3>{I18n.t("about.title")}</h3>
                    </div>
                    <img src={logo} className="cheering" alt="cheering"/>
                </div>
            </div>
            <Background>
                <div className="card">
                    <h5>
                        {I18n.t("about.why")}
                    </h5>
                    <p className="info">
                        {I18n.t("about.whyInfo1")}
                    </p>
                    <p className="info">
                        {I18n.t("about.whyInfo2")}
                    </p>
                </div>
                <div className="card bottom">
                    <h5>
                        {I18n.t("about.register")}
                    </h5>
                    <p className="info"
                       dangerouslySetInnerHTML={{__html: I18n.t("about.registerInfo")}}/>
                </div>
                <div className="card bottom">
                    <h5>
                        {I18n.t("about.logins")}
                    </h5>
                    <p className="info"
                       dangerouslySetInnerHTML={{__html: I18n.t("about.loginsInfo")}}/>
                    <ul>
                        <li>
                            <span className="header">{I18n.t("about.institution")}</span><br/>
                            <span className="indented">{I18n.t("about.institutionInfo")}</span>
                        </li>
                        <li>
                            <span className="header">{I18n.t("about.bank")}</span><br/>
                            <span className="indented">{I18n.t("about.bankInfo")}</span>
                        </li>
                        <li>
                            <span className="header">{I18n.t("about.european")}</span><br/>
                            <span className="indented">{I18n.t("about.europeanInfo")}</span>
                        </li>
                    </ul>
                </div>
                <div className="card bottom">
                    <h5>
                        {I18n.t("about.identity")}
                    </h5>
                    <p className="info"
                       dangerouslySetInnerHTML={{__html: I18n.t("about.identityInfo1")}}/>
                    <p className="info"
                       dangerouslySetInnerHTML={{__html: I18n.t("about.identityInfo2")}}/>
                    <ul>
                        <li>
                            <span className="header">{I18n.t("about.magicLink")}</span>
                        </li>
                        <li>
                            <span className="header">{I18n.t("about.password")}</span>
                        </li>
                        <li>
                            <span className="header">{I18n.t("about.passKey")}</span>
                        </li>
                    </ul>
                </div>
                <div className="card bottom">
                    <h5>
                        {I18n.t("about.manage")}
                    </h5>
                    <p className="info"
                       dangerouslySetInnerHTML={{__html: I18n.t("about.manageInfo", {url: config.spBaseUrl})}}/>
                </div>
            </Background>
        </div>

    );

}