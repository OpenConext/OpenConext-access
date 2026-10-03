import './Home.scss';
import React, {useEffect, useState} from "react";
import I18n, {tArray} from "../locale/I18n";
import {Button, Spinner} from "@surfnet/curve-react";
import {useAppStore} from "../stores/AppStore.js";
import {sanitize} from "../utils/Utils";
import {login} from "../utils/Login.js";
import WelcomePublishApps from "../icons/landing/home_publish_apps.svg";
import WelcomeActivateApps from "../icons/landing/home_activate_apps.svg";
import WelcomeManageAccess from "../icons/landing/home_manage_access.svg";
import heroImage from "../icons/landing/home_top_right.png";
import providersImage from "../icons/landing/home_bottom_left.png";
import institutionsImage from "../icons/landing/home_bottom_right.png";
import PublicStats from "./PublicStats.jsx";
import {loginTimeFrame} from "../api/index.js";

const GETTING_STARTED_SECTION_ID = "getting-started";

export const Home = () => {

    const config = useAppStore(state => state.config);

    const [loginData, setLoginData] = useState(null);
    const [loadingLogins, setLoadingLogins] = useState(true);

    useEffect(() => {
        // Same window as the default (year) view of PublicStats: the last 5 years, one point per year
        const year = new Date().getFullYear();
        const from = new Date(year - 4, 0, 1).getTime() / 1000;
        const to = new Date(year + 1, 0, 1).getTime() / 1000;
        loginTimeFrame(from, to, "year", "", "", false)
            .then(data => setLoginData(Array.isArray(data) ? data : [data]))
            .catch(() => setLoginData(null))
            .finally(() => setLoadingLogins(false));
    }, []);

    const currentYear = new Date().getFullYear();
    // Timestamps are ms-epoch, but values below 1e12 are seconds
    const loginsCount = (loginData || [])
        .filter(d => new Date(d.time < 1e12 ? d.time * 1000 : d.time).getFullYear() === currentYear)
        .reduce((sum, d) => sum + (d.count_user_id || 0), 0);

    const applicationsCount = (config.stats.saml20_sp || 0) + (config.stats.oidc10_rp || 0);
    const institutionsCount = config.stats.saml20_idp || 0;

    const scrollToGettingStarted = () => {
        document.getElementById(GETTING_STARTED_SECTION_ID)?.scrollIntoView({behavior: "smooth"});
    };

    return (
        <div className="home-landing-container">
            <section className="hero">
                <div className="hero-main">
                    <div className="hero-copy">
                        <h1>
                            {I18n.t("landing.hero.title")}
                        </h1>
                        <p dangerouslySetInnerHTML={{__html: sanitize(I18n.t("landing.hero.subTitle"))}}/>
                    </div>
                    <div className="hero-stats">
                        <div className="hero-stat">
                            <p className="hero-stat-number">{applicationsCount}</p>
                            <p className="hero-stat-label">{I18n.t("landing.hero.stats.applications")}</p>
                        </div>
                        <div className="hero-stat">
                            <p className="hero-stat-number">{institutionsCount}</p>
                            <p className="hero-stat-label">{I18n.t("landing.hero.stats.institutions")}</p>
                        </div>
                        <div className="hero-stat">
                            <p className="hero-stat-number">
                                {loadingLogins ? <Spinner className="size-8"/> : loginsCount.toLocaleString(I18n.locale)}
                            </p>
                            <p className="hero-stat-label">{I18n.t("landing.hero.stats.login", {currentYear})}</p>
                        </div>
                    </div>
                    <Button onClick={scrollToGettingStarted}>
                        <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("landing.header.login"))}}/>
                    </Button>
                </div>
                <div className="hero-image" aria-hidden="true">
                    <img src={heroImage} alt="" loading="lazy"/>
                </div>
            </section>

            <section className="what-can-you-do">
                <h2>{I18n.t("landing.whatCanYouDo.title")}</h2>
                <div className="bento-grid">
                    <div className="bento-card green">
                        <div className="bento-illustration">
                            <WelcomePublishApps/>
                        </div>
                        <div className="bento-body">
                            <h3 className="text-[30px]">{I18n.t("landing.whatCanYouDo.publish.title")}</h3>
                            <p>{I18n.t("landing.whatCanYouDo.publish.description")}</p>
                        </div>
                    </div>
                    <div className="bento-card blue">
                        <div className="bento-illustration">
                            <WelcomeActivateApps/>
                        </div>
                        <div className="bento-body">
                            <h3 className="text-[30px]">{I18n.t("landing.whatCanYouDo.activate.title")}</h3>
                            <p>{I18n.t("landing.whatCanYouDo.activate.description")}</p>
                        </div>
                    </div>
                    <div className="bento-card purple">
                        <div className="bento-illustration">
                            <WelcomeManageAccess/>
                        </div>
                        <div className="bento-body">
                            <h3 className="text-[30px]">{I18n.t("landing.whatCanYouDo.manage.title")}</h3>
                            <p>{I18n.t("landing.whatCanYouDo.manage.description")}</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="getting-started" id={GETTING_STARTED_SECTION_ID}>
                <h2>{I18n.t("landing.gettingStarted.title")}</h2>
                <div className="getting-started-grid">
                    <div className="getting-started-card">
                        <div className="getting-started-image" aria-hidden="true">
                            <img src={providersImage} alt="" loading="lazy"/>
                        </div>
                        <div className="getting-started-body">
                            <h3 className="text-[30px]">{I18n.t("landing.gettingStarted.providers.title")}</h3>
                            {tArray("landing.gettingStarted.providers.info", (info, index) =>
                                <p key={index}>{info}</p>)}
                            <Button variant="outline" onClick={() => login(config, true, true)}>
                                <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("landing.gettingStarted.providers.cta"))}}/>
                            </Button>
                        </div>
                    </div>
                    <div className="getting-started-card">
                        <div className="getting-started-image" aria-hidden="true">
                            <img src={institutionsImage} alt="" loading="lazy"/>
                        </div>
                        <div className="getting-started-body">
                            <h3 className="text-[30px]">{I18n.t("landing.gettingStarted.institutions.title")}</h3>
                            {tArray("landing.gettingStarted.institutions.info", (info, index) =>
                                <p key={index}>{info}</p>)}
                            <Button variant="outline" onClick={() => login(config, true, false)}>
                                <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("landing.gettingStarted.institutions.cta"))}}/>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            <section className="try-demo">
                <div className="try-demo-copy">
                    <h2>{I18n.t("landing.tryDemo.title")}</h2>
                    <p>{I18n.t("landing.tryDemo.description")}</p>
                </div>
                <Button nativeButton={false} className="try-demo-cta" render={
                    <a href={I18n.t("landing.tryDemo.url")} target="_blank" rel="noreferrer">
                        <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("landing.tryDemo.cta"))}}/>
                    </a>
                }/>
            </section>

            <section className="activity">
                <h2>{I18n.t("landing.activity.title")}</h2>
                {loadingLogins
                    ? <div className="loading-container"><Spinner className="size-8"/></div>
                    : <PublicStats initialData={loginData}/>}
            </section>
        </div>
    );

}
