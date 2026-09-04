import React, {useEffect, useRef, useState} from "react";

import I18n from "../locale/I18n";
import "./Feedback.scss";
import {feedback} from "../api";
import DOMPurify from "dompurify";
import {Button} from "@surfnet/curve-react";
import {useNavigate} from "react-router";
import {useAppStore} from "../stores/AppStore.js";
import {mainMenuItems} from "../utils/MenuItems.js";
import {sanitize} from "../utils/Utils";

export default function Feedback() {
    const setFlash = useAppStore(state => state.setFlash);

    const navigate = useNavigate();
    const [message, setMessage] = useState("");

    const inputRef = useRef(null);

    useEffect(() => {
        inputRef.current && inputRef.current.focus();
        useAppStore.setState({
            breadcrumbPaths: [
                {path: "/home", value: I18n.t("breadCrumb.access"), menuItemName: mainMenuItems.home},
                {value: I18n.t("breadCrumb.feedback")}
            ]
        });
    }, []);

    const sendFeedBack = () => {
        feedback(message).then(() => {
            setFlash(I18n.t("feedback.flash"));
            navigate(-1);
        });
    }

    return (
        <div className={"feedback-content-container"}>
            <div className={"feedback-content-header"}>
                <h1 className="text-[length:var(--text-2xl-font-size)]">{I18n.t("feedback.title")}</h1>
            </div>
            <div className={"feedback-content"}>
                <textarea name="feedback"
                          id="feedback"
                          value={message}
                          rows="10"
                          ref={inputRef}
                          onChange={e => setMessage(e.target.value)}/>
                <section className="help">
                    <h3 className="title text-[length:var(--text-lg-font-size)]"
                        dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("feedback.help"))}}/>
                    <span dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("feedback.helpInfo"))}}/>
                </section>
                <section className="disclaimer">
                <span dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(I18n.t("feedback.disclaimer"),
                        {ADD_ATTR: ['target'], ADD_TAGS: ['rel']})
                }}/>
                </section>
                <section className="actions">
                    <Button onClick={() => sendFeedBack()}>
                        <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("forms.submit"))}}/>
                    </Button>
                </section>
            </div>
        </div>
    )

}
