import React, {useEffect, useRef, useState} from "react";

import I18n from "../locale/I18n";
import "./Feedback.scss";
import {feedback} from "../api";
import DOMPurify from "dompurify";
import {Button, ButtonType} from "@surfnet/sds";
import {useNavigate} from "react-router-dom";
import {useAppStore} from "../stores/AppStore.js";

export default function Feedback() {
    const {setFlash} = useAppStore(state => state);
    const navigate = useNavigate();
    const [message, setMessage] = useState("");

    const inputRef = useRef(null);

    useEffect(() => {
        inputRef.current && inputRef.current.focus();
        useAppStore.setState({
            breadcrumbPaths: [
                {path: "/home", value: I18n.t("breadCrumb.access"), menuItemName: "yourApps"},
                {value: I18n.t("breadCrumb.feedback")}
            ]
        });
    }, []);

    const sendFeedBack = () => {
        feedback(message).then(() => {
            setFlash(I18n.t("feedback.flash"));
            navigate("/home");
        });
    }

    return (
        <div className={"feedback-content-container"}>
            <div className={"feedback-content-header"}>
                <h1>{I18n.t("feedback.title")}</h1>
            </div>
            <div className={"feedback-content"}>
                <div className="sds--text-area">
                    <textarea name="feedback"
                              id="feedback"
                              value={message}
                              rows="10"
                              ref={inputRef}
                              onChange={e => setMessage(e.target.value)}/>
                </div>
                <section className="help">
                    <h3 className="title"
                        dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("feedback.help"))}}/>
                    <span dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("feedback.helpInfo"))}}/>
                </section>
                <section className="disclaimer">
                <span dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(I18n.t("feedback.disclaimer"),
                        {ADD_ATTR: ['target']})
                }}/>
                </section>
                <section className="actions">
                    <Button type={ButtonType.Primary}
                            onClick={() => sendFeedBack()}
                            txt={I18n.t("forms.submit")}/>
                </section>
            </div>
        </div>
    )

}
