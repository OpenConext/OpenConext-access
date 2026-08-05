import "./Connect.scss";

import React from "react";
import I18n from "../locale/I18n.js";
import StudentPng from "../icons/student.png";
import {Button, ButtonType} from "@surfnet/sds";
import {useNavigate} from "react-router";
import DOMPurify from "dompurify";

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
                    <p>{I18n.t("connect.subTitle")}</p>
                    <p>{I18n.t("connect.formalInfo")}</p>
                </div>
                <div className="connect">
                    <ul>
                        {I18n.translations[I18n.locale].connect.serviceBullets
                            .map((s, index) => <li key={index} dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(s)}}/>)}
                    </ul>
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
