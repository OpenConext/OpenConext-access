import "./JoinRequest.scss";
import React, {useEffect, useState} from "react";
import {useAppStore} from "../stores/AppStore";
import I18n from "../locale/I18n";
import {useNavigate, useParams} from "react-router-dom";
import {newJoinRequest, organizationById} from "../api/index.js";
import {Loader, Button, ButtonType} from "@surfnet/sds";
import DOMPurify from "dompurify";

const JoinRequest = () => {

    const [loading, setLoading] = useState(true);
    const [organization, setOrganization] = useState({});

    const {id} = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        useAppStore.setState({
            breadcrumbPath: [
                {path: "/home", value: I18n.t("breadCrumb.access")},
                {value: I18n.t("breadCrumb.landing")}
            ]
        });
        organizationById(id).then(res => {
            setOrganization(res);
            setLoading(false);
        })
    }, []);

    if (loading) {
        return <Loader/>
    }

    const createJoinRequest = () => {
        newJoinRequest({}).then(res => {
            //Big flash, and nice picture?
        })
    };

    return (
        <div className="join-request-container">
            <h2>{organization.name}</h2>
            <p dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(I18n.t("joinRequest.info",{name: organization.name}))
            }}/>
            <section className="actions">
                <Button type={ButtonType.Secondary}
                        txt={I18n.t("forms.back")}
                        onClick={() => navigate("/landing")}/>
                <Button txt={I18n.t("joinRequest.requestAccess")}
                        onClick={() => createJoinRequest()}/>
            </section>
        </div>

    )
};
export default JoinRequest;