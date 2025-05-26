import "./UserHome.scss";
import React, {useEffect} from "react";
import {useAppStore} from "../stores/AppStore";
import I18n from "../locale/I18n";

const UserHome = () => {

    const {user} = useAppStore(state => state);

    useEffect(() => {
        useAppStore.setState({
            breadcrumbPath: [
                {path: "/home", value: I18n.t("breadCrumb.access")},
                {value: I18n.t("breadCrumb.home")}
            ]
        });
    }, []);

    return (
        <div className="home-container">
            <div className="me">
                <h2>{I18n.t("welcome.greeting", {name: user.name})}</h2>
                <code>{JSON.stringify(user)}</code>
            </div>
        </div>

    )
};
export default UserHome;