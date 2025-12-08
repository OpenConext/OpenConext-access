import React from "react";
import './Home.scss';
import I18n from "../locale/I18n";
import Logo from "../icons/landing/logo.svg";
import {Background} from "../components/Background.jsx";
import {Link, useNavigate} from "react-router-dom";
import {Button, ButtonType} from "@surfnet/sds";
import {useAppStore} from "../stores/AppStore.js";

export const Home = () => {

    const navigate = useNavigate();
    const config = useAppStore(state => state.config);

    const contactUs = () => {
        const link = document.createElement("a");
        link.href = I18n.t("landing.institutions.contactMail");
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="about-container">
            <div className="about">
                <div className="top">
                    <h1 className="title large">
                        {I18n.t("landing.header.title")}
                    </h1>
                    <p
                        dangerouslySetInnerHTML={{__html: I18n.t("landing.header.subTitle")}}/>
                </div>
                <Logo/>
            </div>
            <Background>
                <div className="cards">
                    <div className="card">
                        <h3>
                            {I18n.t("landing.applicationProviders.title")}
                        </h3>
                        {I18n.translations[I18n.locale].landing.applicationProviders.info
                            .map((info, index) =>
                                <p key={index} dangerouslySetInnerHTML={{__html: info}}/>
                            )}
                        <Button onClick={() => navigate("/connect")}
                                txt={I18n.t("landing.applicationProviders.connect")}/>
                    </div>
                    <div className="card">
                        <h3>
                            {I18n.t("landing.institutions.title")}
                        </h3>
                        {I18n.translations[I18n.locale].landing.institutions.info
                            .map((info, index) =>
                                <p key={index} dangerouslySetInnerHTML={{__html: info}}/>
                            )}
                        <Button onClick={() => contactUs()}
                                type={ButtonType.Secondary}
                                txt={I18n.t("landing.institutions.contact")}/>
                    </div>
                    <div className="card">
                        <h3>
                            {I18n.t("landing.joining.title")}
                        </h3>
                        {I18n.translations[I18n.locale].landing.joining.info
                            .map((info, index) =>
                                <p key={index} dangerouslySetInnerHTML={{__html: info}}/>
                            )}
                        <p className="links">
                            <span>{I18n.t("landing.joining.links.prefix")}</span>
                            <Link to="/institutions">
                                {I18n.t("landing.joining.links.institutions",
                                    {nbr: config.stats.saml20_idp})}
                            </Link>
                            <span>{I18n.t("landing.joining.links.or")}</span>
                            <Link to="/applications">
                                {I18n.t("landing.joining.links.applications",
                                    {nbr: config.stats.saml20_sp + config.stats.oidc10_rp})}
                            </Link>
                        </p>
                    </div>
                </div>
            </Background>
        </div>

    );

}