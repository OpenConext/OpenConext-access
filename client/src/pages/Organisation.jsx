import "./Organisation.scss";
import React, {useEffect} from "react";
import {useAppStore} from "../stores/AppStore";
import I18n from "../locale/I18n";

const Organisation = () => {

    const {user} = useAppStore(state => state);

    useEffect(() => {
        useAppStore.setState({
            breadcrumbPath: [
                {path: "/home", value: I18n.t("breadCrumb.access")},
                {path: "/organizations/", value: "TODO Org Name"},
                {value: I18n.t("breadCrumb.applications")}
            ]
        });
    }, []);

    return (
        <div className="organisation-container">
            <div className="organisation">
                <p>TODO organisation</p>
                <code>{JSON.stringify(user)}</code>
            </div>
        </div>

    )
};
export default Organisation;