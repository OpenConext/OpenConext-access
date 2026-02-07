import React from "react";
import './LoginInfo.scss';
import I18n from "../locale/I18n";
import Logo from "../icons/landing/logo.svg";
import {Background} from "../components/Background.jsx";
import {Button, ButtonType} from "@surfnet/sds";
import {useAppStore} from "../stores/AppStore.js";
import {login} from "../utils/Login.js";
import DOMPurify from "dompurify";

export const LoginInfo = () => {

    const config = useAppStore(state => state.config);

    return (
        <div className="login-info-container">
            <div className="about">
                <div className="top">
                    <h1 className="title large">
                        {I18n.t("landing.loginInfo.title")}
                    </h1>
                    <p
                        dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("landing.loginInfo.subTitle"))}}/>
                </div>
                <Logo/>
            </div>
            <Background>
                <div className="cards">
                    <div className="card">
                        <h3>
                            {I18n.t("landing.loginInfo.commercial.title")}
                        </h3>
                        {I18n.translations[I18n.locale].landing.loginInfo.commercial.info
                            .map((info, index) =>
                                <p key={index} dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(info)}}/>
                            )}
                        <Button onClick={() => login(config, true, true)}
                                type={ButtonType.Secondary}
                                txt={I18n.t("landing.loginInfo.commercial.login")}/>
                    </div>
                    <div className="card">
                        <h3>
                            {I18n.t("landing.loginInfo.education.title")}
                        </h3>
                        {I18n.translations[I18n.locale].landing.loginInfo.education.info
                            .map((info, index) =>
                                <p key={index} dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(info)}}/>
                            )}
                        <Button onClick={() => login(config, true, false)}
                                type={ButtonType.Secondary}
                                txt={I18n.t("landing.loginInfo.education.login")}/>
                    </div>
                </div>
            </Background>
        </div>

    );

}