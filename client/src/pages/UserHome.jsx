import "./UserHome.scss";
import React, {useEffect, useState} from "react";
import {useAppStore} from "../stores/AppStore";
import I18n from "../locale/I18n";
import {Loader} from "@surfnet/sds";
import {isEmpty} from "../utils/Utils.js";
import {Link, useNavigate} from "react-router-dom";
import Relax from "../icons/undraw/relax.svg";
import DOMPurify from "dompurify";

const UserHome = () => {

    const {user, currentOrganization} = useAppStore(state => state);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (!isEmpty(currentOrganization?.id)) {
            navigate(`/organization/${currentOrganization.id}`);
        } else if (isEmpty(user.joinRequests)) {
            navigate("/landing");
        } else {
            useAppStore.setState({
                breadcrumbPaths: [
                    {path: "/home", value: I18n.t("breadCrumb.access"), menuItemName: "yourApps"},
                    {value: I18n.t("breadCrumb.home")}
                ]
            });
        }
        setLoading(false);
    }, [currentOrganization]);

    if (loading) {
        return <Loader/>
    }

    return (
        <div className="home-container">

            <h2>{I18n.t("welcome.greeting", {name: user.name})}</h2>
            {(isEmpty(user.joinRequests)) &&
                <div className="nudge-landing">
                    <span>{I18n.t("userHome.nudgeLanding")}</span>
                    <Link to={"/landing"}>
                        <span>{I18n.t("userHome.nudgeLandingLink")}</span>
                    </Link>
                </div>}
            {!isEmpty(user.joinRequests) && <div>
                <p dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(I18n.t("userHome.infoJoinRequest",
                        {name: user.joinRequests[0].organization.name}))
                }}/>
                <Relax/>
                <div className="nudge-landing">
                    <span>{I18n.t("userHome.backToLanding")}</span>
                    <Link to={"/landing"}>
                        <span>{I18n.t("userHome.backToLandingLink")}</span>
                    </Link>
                </div>
            </div>}
        </div>
    )
};
export default UserHome;