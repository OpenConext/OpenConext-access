import "./JoinRequest.scss";
import React, {useEffect, useState} from "react";
import {useAppStore} from "../stores/AppStore";
import I18n from "../locale/I18n";
import {useNavigate, useParams} from "react-router-dom";
import {newJoinRequest, organizationLightById} from "../api/index.js";
import {Button, ButtonType, Loader, Modal} from "@surfnet/sds";
import DOMPurify from "dompurify";

const JoinRequest = ({refreshUser}) => {

    const {setFlash} = useAppStore(state => state);

    const [loading, setLoading] = useState(true);
    const [organization, setOrganization] = useState({});
    const [joinRequestCreated, setJoinRequestCreated] = useState(false);
    const [duplicateJoinRequest, setDuplicateJoinRequest] = useState(false);

    const {organisationId} = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        useAppStore.setState({
            breadcrumbPath: [
                {path: "/home", value: I18n.t("breadCrumb.access")},
                {value: I18n.t("breadCrumb.landing")}
            ]
        });
        organizationLightById(organisationId).then(res => {
            setOrganization(res);
            setLoading(false);
        })
    }, []);

    if (loading) {
        return <Loader/>
    }

    const createJoinRequest = () => {
        newJoinRequest({
            organizationId: organisationId,
            language: I18n.locale,
        }).then(() => {
            setJoinRequestCreated(true);
            setFlash(I18n.t("joinRequest.flash", {name: organization.name}));
            refreshUser();
        }).catch(() => {
            setDuplicateJoinRequest(true);
        });
    };

    return (
        <div className="join-request-container">
            <h2>{organization.name}</h2>
            <p dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(I18n.t("joinRequest.info", {name: organization.name}))
            }}/>
            <section className="actions">
                <Button type={ButtonType.Secondary}
                        txt={I18n.t("forms.back")}
                        onClick={() => navigate("/landing")}/>
                <Button txt={I18n.t("joinRequest.requestAccess")}
                        disabled={joinRequestCreated || duplicateJoinRequest}
                        onClick={() => createJoinRequest()}/>
            </section>
            {joinRequestCreated && <Modal confirm={() => navigate("/home")}
                                          title={I18n.t("joinRequest.modal.title")}
                                          question={I18n.t("joinRequest.modal.success", {name: organization.name})}
                                          confirmationButtonLabel={I18n.t("joinRequest.modal.proceed")}/>}
            {duplicateJoinRequest && <section className="error">
                <p className={"error"} dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(I18n.t("joinRequest.duplicate", {name: organization.name}))
                }}/>
            </section>}
        </div>

    )
};
export default JoinRequest;