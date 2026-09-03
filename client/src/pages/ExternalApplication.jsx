import "./ExternalAppication.scss";
import React, {useEffect, useState} from "react";
import {useAppStore} from "../stores/AppStore";
import I18n from "../locale/I18n";
import {Alert, AlertAction, AlertDescription} from "@surfnet/curve-react";
import {useParams} from "react-router";
import {UsersThreeIcon as TeamIcon} from "@phosphor-icons/react";
import {createAndClickLink} from "../utils/Forms.js";
import DOMPurify from "dompurify";
import {CaretRightIcon as CaretRight, InfoIcon, TreeStructureIcon as HierarchyIcon, XIcon} from "@phosphor-icons/react";
import {mainMenuItems} from "../utils/MenuItems.js";

const icons = {
    invite: <TeamIcon/>,
    sram: <HierarchyIcon/>
}

const ExternalApplication = () => {
    const {app} = useParams();
    const [alertClosed, setAlertClosed] = useState(false);
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
            <h1 className="text-[length:var(--text-2xl-font-size)]">{I18n.t(`external.${app}.title`)}</h1>

            {!alertClosed && <div className="external-alert-container">
                <Alert>
                    <InfoIcon/>
                    <AlertDescription dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t(`external.${app}.alert`))}}/>
                    <AlertAction>
                        <button type="button" onClick={() => setAlertClosed(true)}><XIcon/></button>
                    </AlertAction>
                </Alert>
            </div>}
            <div className="external-link"
                 onClick={() => createAndClickLink(config[app])}>
                {icons[app]}
                <span className="info"
                      dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t(`external.${app}.link`))}}/>
                <div className="caret">
                    <CaretRight/>
                </div>

            </div>
        </div>
    )
};
export default ExternalApplication;