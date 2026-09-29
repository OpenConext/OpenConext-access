import './About.scss';
import React from "react";
import I18n from "../locale/I18n";
import {Badge} from "@surfnet/curve-react";
import {TextboxIcon, NavigationArrowIcon, ChartLineIcon} from "@phosphor-icons/react";
import heroImage from "../icons/landing/about_top_right.png";
import eduidImage from "../icons/landing/about_eduid_left.png";
import roadmapImage from "../icons/landing/about_bottom_left.png";

const About = () => {

    return (
        <div className="about-container">
            <section className="about-hero">
                <div className="about-copy">
                    <h1>{I18n.t("about.hero.title")}</h1>
                    <p>{I18n.t("about.hero.paragraph1")}</p>
                    <p>{I18n.t("about.hero.paragraph2")}</p>
                </div>
                <div className="about-image" aria-hidden="true">
                    <img src={heroImage} alt="" loading="lazy"/>
                </div>
            </section>

            <section className="about-eduid">
                <div className="about-image" aria-hidden="true">
                    <img src={eduidImage} alt="" loading="lazy"/>
                </div>
                <div className="about-copy">
                    <h2>{I18n.t("about.eduId.title")}</h2>
                    <p>{I18n.t("about.eduId.description")}</p>
                </div>
            </section>

            <section className="about-services">
                <div className="about-services-header">
                    <h2>{I18n.t("about.services.title")}</h2>
                    <p>{I18n.t("about.services.subTitle")}</p>
                </div>
                <div className="about-services-grid">
                    <div className="about-service-card">
                        <Badge className="about-service-badge">
                            {I18n.t("about.services.idp.badge")}
                        </Badge>
                        <h3>{I18n.t("about.services.idp.title")}</h3>
                        <p>{I18n.t("about.services.idp.description")}</p>
                    </div>
                    <div className="about-service-card">
                        <Badge className="about-service-badge">
                            {I18n.t("about.services.sp.badge")}
                        </Badge>
                        <h3>{I18n.t("about.services.sp.title")}</h3>
                        <p>{I18n.t("about.services.sp.description")}</p>
                    </div>
                    <div className="about-service-card">
                        <Badge variant="outline" className="about-service-badge">
                            {I18n.t("about.services.invite.badge")}
                        </Badge>
                        <h3>{I18n.t("about.services.invite.title")}</h3>
                        <p>{I18n.t("about.services.invite.description")}</p>
                    </div>
                    <div className="about-service-card">
                        <Badge variant="outline" className="about-service-badge">
                            {I18n.t("about.services.sram.badge")}
                        </Badge>
                        <div className="about-service-title">
                            <h3>{I18n.t("about.services.sram.title")}</h3>
                            <span>{I18n.t("about.services.sram.subTitle")}</span>
                        </div>
                        <p>{I18n.t("about.services.sram.description")}</p>
                    </div>
                    <div className="about-service-card">
                        <Badge variant="outline" className="about-service-badge">
                            {I18n.t("about.services.secureId.badge")}
                        </Badge>
                        <h3>{I18n.t("about.services.secureId.title")}</h3>
                        <p>{I18n.t("about.services.secureId.description")}</p>
                    </div>
                </div>
            </section>

            <section className="about-roadmap">
                <div className="about-image" aria-hidden="true">
                    <img src={roadmapImage} alt="" loading="lazy"/>
                </div>
                <div className="about-copy">
                    <h2>{I18n.t("about.roadmap.title")}</h2>
                    <ul className="roadmap-list">
                        <li className="roadmap-item">
                            <TextboxIcon/>
                            <div>
                                <h3>{I18n.t("about.roadmap.selfService.title")}</h3>
                                <p>{I18n.t("about.roadmap.selfService.description")}</p>
                            </div>
                        </li>
                        <li className="roadmap-item">
                            <NavigationArrowIcon/>
                            <div>
                                <h3>{I18n.t("about.roadmap.navigation.title")}</h3>
                                <p>{I18n.t("about.roadmap.navigation.description")}</p>
                            </div>
                        </li>
                        <li className="roadmap-item">
                            <ChartLineIcon/>
                            <div>
                                <h3>{I18n.t("about.roadmap.insight.title")}</h3>
                                <p>{I18n.t("about.roadmap.insight.description")}</p>
                            </div>
                        </li>
                    </ul>
                </div>
            </section>
        </div>
    );

}
export default About;
