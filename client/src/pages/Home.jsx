import './Home.scss';
import React from "react";
import I18n, {tArray} from "../locale/I18n";
import {Button} from "@surfnet/curve-react";
import {useAppStore} from "../stores/AppStore.js";
import {sanitize} from "../utils/Utils";
import {login} from "../utils/Login.js";
import WelcomePublishApps from "../icons/figma/welcome-add-apps.svg";
import WelcomeActivateApps from "../icons/figma/welcome-discover-apps.svg";
import WelcomeManageAccess from "../icons/figma/welcome-setup-access.svg";
import AspectRatioPlaceholder from "../icons/aspect_ratio.svg";
import PublicStats from "./PublicStats.jsx";

const GETTING_STARTED_SECTION_ID = "getting-started";

export const Home = () => {

    const config = useAppStore(state => state.config);

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
                            <p className="hero-stat-number">1</p>
                            <p className="hero-stat-label">{I18n.t("landing.hero.stats.login")}</p>
                        </div>
                    </div>
                    <Button onClick={scrollToGettingStarted}>
                        <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("landing.header.login"))}}/>
                    </Button>
                </div>
                <div className="hero-image" aria-hidden="true">
                    <AspectRatioPlaceholder preserveAspectRatio="xMidYMid slice"/>
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
                            <AspectRatioPlaceholder preserveAspectRatio="xMidYMid slice"/>
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
                            <AspectRatioPlaceholder preserveAspectRatio="xMidYMid slice"/>
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
                <PublicStats/>
            </section>
        </div>
    );

}
