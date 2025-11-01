import "./UserHome.scss";
import React, {useEffect, useState} from "react";
import {useAppStore} from "../stores/AppStore";
import I18n from "../locale/I18n";
import {Loader} from "@surfnet/sds";
import {isEmpty} from "../utils/Utils.js";
import {useNavigate} from "react-router-dom";
import {mainMenuItems} from "../utils/MenuItems.js";

const UserHome = () => {

    const {user, currentOrganization} = useAppStore(state => state);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        debugger;
        let newLocation = null;
        if (isEmpty(user.joinRequests) && isEmpty(currentOrganization?.id)) {
            newLocation = "/landing"

        } else if (!isEmpty(user.joinRequests)) {
            newLocation = "/relax"
        }
        if (newLocation !== null) {
            setTimeout(() => navigate(newLocation, {replace: true}), 175);
        } else {
            useAppStore.setState({
                breadcrumbPaths: [
                    {path: "/home", value: I18n.t("breadCrumb.home"), menuItemName: mainMenuItems.home}
                ]
            });
        }
    }, []);

    if (loading) {
        return <Loader/>
    }

    return (
        <div className="home-container">
            <h2>{I18n.t("welcome.greeting", {name: user.firstName || user.name})}</h2>
            <p>TODO</p>
        </div>
    )
};
export default UserHome;