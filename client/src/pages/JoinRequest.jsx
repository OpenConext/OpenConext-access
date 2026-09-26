import "./JoinRequest.scss";
import React, {useEffect, useState} from "react";
import {useAppStore} from "../stores/AppStore";
import I18n from "../locale/I18n";
import {useNavigate, useParams} from "react-router";
import {newJoinRequest, organizationLightById} from "../api/index.js";
import {Button, Spinner} from "@surfnet/curve-react";
import DOMPurify from "dompurify";
import InputField from "../components/InputField.jsx";
import {sanitize} from "../utils/Utils";

const JoinRequest = ({refreshUser}) => {

    const setFlash = useAppStore(state => state.setFlash);

    const [loading, setLoading] = useState(true);
    const [organization, setOrganization] = useState({});
    const [joinRequestCreated, setJoinRequestCreated] = useState(false);
    const [duplicateJoinRequest, setDuplicateJoinRequest] = useState(false);
    const [message, setMessage] = useState("");

    const {organisationId} = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        organizationLightById(organisationId).then(res => {
            setOrganization(res);
            setLoading(false);
        })
    }, [organisationId]);

    if (loading) {
        return <div className="loading-container"><Spinner className="size-8"/></div>
    }

    const createJoinRequest = () => {
        setJoinRequestCreated(true);
        newJoinRequest({
            organizationId: organisationId,
            message: message,
            language: I18n.locale,
        }).then(() => {
            setFlash(I18n.t("joinRequest.flash", {name: organization.name}));
            refreshUser(() => navigate("/relax"));

        }).catch(() => {
            setDuplicateJoinRequest(true);
        });
    };

    return (
        <div className="join-request-container">
            <div className="join-request-inner">
                <h2 className="text-[length:var(--text-xl-font-size)]">{organization.name}</h2>
                <p dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(I18n.t("joinRequest.info", {name: organization.name}))
                }}/>
                <InputField name={I18n.t("joinRequest.optionalMessage")}
                            info={I18n.t("joinRequest.optionalMessageInfo")}
                            onChange={e => setMessage(e.target.value)}
                            optional={true}
                            value={message}
                            multiline={true}
                            />
                <section className="actions">
                    <Button variant="outline"
                            onClick={() => navigate("/landing")}>
                        <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("forms.back"))}}/>
                    </Button>
                    <Button disabled={joinRequestCreated || duplicateJoinRequest}
                            onClick={() => createJoinRequest()}>
                        <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("joinRequest.requestAccess"))}}/>
                    </Button>
                </section>
                {duplicateJoinRequest && <section className="error">
                    <p className={"error"} dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(I18n.t("joinRequest.duplicate", {name: organization.name}))
                    }}/>
                </section>}
            </div>
        </div>

    )
};
export default JoinRequest;
