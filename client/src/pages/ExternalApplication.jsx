import "./ExternalAppication.scss";
import React, {useEffect} from "react";
import {useAppStore} from "../stores/AppStore";
import I18n from "../locale/I18n";
import {Button} from "@surfnet/curve-react";
import {useParams} from "react-router";
import {ArrowRightIcon, UserCircleCheckIcon as TeamIcon, FediverseLogoIcon as HierarchyIcon} from "@phosphor-icons/react";
import {createAndClickLink} from "../utils/Forms.js";
import DOMPurify from "dompurify";
import {mainMenuItems} from "../utils/MenuItems.js";
import blob from "../assets/support/support-blob.svg?url";
import person from "../assets/support/support-person.svg?url";
import arrow from "../assets/support/support-arrow.svg?url";

const icons = {
    invite: <TeamIcon/>,
    sram: <HierarchyIcon/>
}

const ExternalApplication = () => {
    const {app} = useParams();
    const config = useAppStore.getState().config;

    useEffect(() => {
        useAppStore.setState({
            breadcrumbPaths: [
                {path: "/home", value: I18n.t("breadCrumb.access"), menuItemName: mainMenuItems.home},
                {value: I18n.t(`external.${app}.title`)}
            ],
            activeMenuItem: mainMenuItems[app]
        });
    }, [app]);

    return (
        <div className="extern-application-container">
            <div className="extern-application-header">
                <h1 className="text-[length:var(--text-2xl-font-size)]">{I18n.t(`external.${app}.title`)}</h1>
                <p dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t(`external.${app}.description`))}}/>
            </div>
            <Button variant="outline" size="lg" onClick={() => createAndClickLink(config[app])}>
                {icons[app]}
                <span dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t(`external.${app}.link`))}}/>
                <ArrowRightIcon/>
            </Button>
            {app === "serviceDesk" &&
                <div className="feedback-hint" aria-hidden="true">
                    <p className="feedback-hint-text">{I18n.t("external.serviceDesk.feedbackHint")}</p>
                    <img className="feedback-hint-blob" src={blob} alt=""/>
                    <img className="feedback-hint-person" src={person} alt=""/>
                    <img className="feedback-hint-arrow" src={arrow} alt=""/>
                </div>}
        </div>
    )
};
export default ExternalApplication;
