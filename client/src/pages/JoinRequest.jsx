import "./JoinRequest.scss";
import React, {useEffect, useState} from "react";
import {useAppStore} from "../stores/AppStore";
import I18n from "../locale/I18n";
import {useNavigate, useParams} from "react-router";
import {newJoinRequest, organizationLightById} from "../api/index.js";
import {Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Spinner} from "@surfnet/curve-react";
import DOMPurify from "dompurify";
import InputField from "../components/InputField.jsx";
import {mainMenuItems} from "../utils/MenuItems.js";
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
        useAppStore.setState({
            breadcrumbPaths: [
                {path: "/home", value: I18n.t("breadCrumb.access"), menuItemName: mainMenuItems.home},
                {value: I18n.t("breadCrumb.landing")}
            ]
        });
        organizationLightById(organisationId).then(res => {
            setOrganization(res);
            setLoading(false);
        })
    }, [organisationId]);

    if (loading) {
        return <div className="loading-container"><Spinner className="size-8"/></div>
    }

    const createJoinRequest = () => {
        newJoinRequest({
            organizationId: organisationId,
            message: message,
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
            <h2 className="text-[length:var(--text-xl-font-size)]">{organization.name}</h2>
            <p dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(I18n.t("joinRequest.info", {name: organization.name}))
            }}/>
            <InputField name={I18n.t("joinRequest.optionalMessage")}
                        info={I18n.t("joinRequest.optionalMessageInfo")}
                        onChange={e => setMessage(e.target.value)}
                        value={message}
                        multiline={true}
                        placeholder={I18n.t("joinRequest.optionalMessagePlaceHolder")}/>
            <section className="actions">
                <Button variant="secondary"
                        onClick={() => navigate("/landing")}>
                    <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("forms.back"))}}/>
                </Button>
                <Button disabled={joinRequestCreated || duplicateJoinRequest}
                        onClick={() => createJoinRequest()}>
                    <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("joinRequest.requestAccess"))}}/>
                </Button>
            </section>
            {joinRequestCreated && <Dialog open={true}>
                <DialogContent showCloseButton={false}>
                    <DialogHeader>
                        <DialogTitle>{I18n.t("joinRequest.modal.title")}</DialogTitle>
                    </DialogHeader>
                    <p dangerouslySetInnerHTML={{
                        __html: sanitize(I18n.t("joinRequest.modal.success", {name: organization.name}))
                    }}/>
                    <DialogFooter>
                        <Button onClick={() => navigate("/home")}>
                            <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("joinRequest.modal.proceed"))}}/>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>}
            {duplicateJoinRequest && <section className="error">
                <p className={"error"} dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(I18n.t("joinRequest.duplicate", {name: organization.name}))
                }}/>
            </section>}
        </div>

    )
};
export default JoinRequest;