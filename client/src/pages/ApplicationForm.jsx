import "./ApplicationForm.scss";
import React, {useEffect, useState} from "react";
import I18n from "../locale/I18n";
import InputField from "../components/InputField.jsx";
import {useParams} from "react-router-dom";
import {useAppStore} from "../stores/AppStore.js";

export const ApplicationForm = () => {

    const {id} = useParams();
    const [isNew, setIsNew] = useState(true);
    const [application, setApplication] = useState({});

    useEffect(() => {
        setIsNew(id === "new");
        useAppStore.setState({
            breadcrumbPath: [
                {path: "/home", value: I18n.t("breadCrumb.access")},
                {path: "/organizations/", value: "TODO Org Name"},
                {value: I18n.t("breadCrumb.applications")}
            ]
        });
    }, [id]);


    return (
        <div className="application-form-container">
            <div className="application-form">
                <h2>{I18n.t(`application.${isNew ? "new" : "edit"}`)}</h2>
                <InputField name={I18n.t("application.name")}
                            value={application.name || ""}
                            onChange={e => setApplication({...application, name: e.target.value})}
                info={I18n.t("application.nameInfo")}/>
            </div>
        </div>
    )
}
