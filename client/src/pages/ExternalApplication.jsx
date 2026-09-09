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
        </div>
    )
};
export default ExternalApplication;
