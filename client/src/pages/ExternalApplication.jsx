import "./ExternalAppication.scss";
import React, {useEffect, useState} from "react";
import {useAppStore} from "../stores/AppStore";
import I18n from "../locale/I18n";
import {Alert, AlertType} from "@surfnet/sds";
import {useParams} from "react-router-dom";
import TeamIcon from "@surfnet/sds/icons/illustrative-icons/team.svg";
import {createAndClickLink} from "../utils/Forms.js";
import DOMPurify from "dompurify";
import CaretRight from "@surfnet/sds/icons/functional-icons/arrow-right-2.svg";
import HierarchyIcon from "@surfnet/sds/icons/illustrative-icons/hierarchy.svg";
import {mainMenuItems} from "../utils/MenuItems.js";

const icons = {
    invite: <TeamIcon/>,
    sram: <HierarchyIcon/>
}

const ExternalApplication = () => {
    const {app} = useParams();
    const [alertClosed, setAlertClosed] = useState(false);
    const {config} = useAppStore.getState();


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
            <h2>{I18n.t(`external.${app}.title`)}</h2>

            {!alertClosed && <div className="external-alert-container">
                <Alert close={() => setAlertClosed(true)}
                       alertType={AlertType.Info}
                       asChild={true}
                       message={I18n.t(`external.${app}.alert`)}/>
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