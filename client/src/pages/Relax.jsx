import "./Relax.scss";
import React, {useEffect} from "react";
import {useAppStore} from "../stores/AppStore";
import I18n from "../locale/I18n";
import {isEmpty} from "../utils/Utils.js";
import {Link, useNavigate} from "react-router-dom";
import RelaxIcon from "../icons/undraw/relax.svg";
import DOMPurify from "dompurify";
import {mainMenuItems} from "../utils/MenuItems.js";

const Relax = () => {
    const {user, currentOrganization} = useAppStore(state => state);
    const navigate = useNavigate();

    useEffect(() => {
        if (!isEmpty(currentOrganization?.id)) {
            navigate(`/organization/${currentOrganization.id}`);
        } else if (isEmpty(user.joinRequests)) {
            navigate("/landing");
        } else {
            useAppStore.setState({
                breadcrumbPaths: [
                    {path: "/home", value: I18n.t("breadCrumb.home"), menuItemName: mainMenuItems.home}
                ]
            });
        }
    }, []);

    return (
        <div className="relax-container">
            <h2>{I18n.t("welcome.greeting", {name: user.givenName})}</h2>
            <div>
                <p dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(I18n.t("userHome.infoJoinRequest",
                        {name: user.joinRequests[0].organization.name}))
                }}/>
            </div>
            <RelaxIcon/>
            <div className="nudge-landing">
                <span>{I18n.t("userHome.backToLanding")}</span>
                <Link to={"/landing"}>
                    <span>{I18n.t("userHome.backToLandingLink")}</span>
                </Link>
            </div>
        </div>
    )
};
export default Relax;