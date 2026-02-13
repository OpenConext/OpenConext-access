import React, {useCallback, useRef, useState} from "react";
import {createPortal} from "react-dom";
import {Checkbox} from "@surfnet/sds";
import {useLocation} from "react-router-dom";
import DOMPurify from "dompurify";
import html2canvas from "html2canvas";
import I18n from "../locale/I18n.js";
import {sendFeedback} from "../api/index.js";
import {useAppStore} from "../stores/AppStore.js";
import ConfirmationDialog from "./ConfirmationDialog.jsx";
import "./UserFeedbackWidget.scss";

const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;

export const UserFeedbackWidget = () => {
    const location = useLocation();
    const setFlash = useAppStore(state => state.setFlash);
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [includeScreenshot, setIncludeScreenshot] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const inputRef = useRef(null);

    const closeModal = () => {
        setOpen(false);
        setMessage("");
        setIncludeScreenshot(true);
    };

    const captureScreenshot = useCallback(async () => {
        document.body.classList.add("feedback-capture");
        try {
            const canvas = await html2canvas(document.body, {
                backgroundColor: null,
                useCORS: true,
                scale: 1,
                windowWidth: document.documentElement.clientWidth,
                windowHeight: document.documentElement.clientHeight
            });
            return canvas.toDataURL("image/png");
        } finally {
            document.body.classList.remove("feedback-capture");
        }
    }, []);

    const handleSubmit = useCallback(async () => {
        if (!message.trim()) {
            return;
        }
        setSubmitting(true);
        try {
            const payload = {
                message,
                url: `${window.location.origin}${location.pathname}${location.search}${location.hash}`,
                includeScreenshot
            };

            if (includeScreenshot) {
                const dataUrl = await captureScreenshot();
                const base64 = dataUrl.split(",")[1] || "";
                const estimatedBytes = Math.ceil((base64.length * 3) / 4);
                if (estimatedBytes > MAX_SCREENSHOT_BYTES) {
                    setFlash(I18n.t("feedback.tooLarge"));
                } else if (base64.length > 0) {
                    payload.screenshotBase64 = base64;
                    payload.screenshotContentType = "image/png";
                }
            }

            await sendFeedback(payload);
            setFlash(I18n.t("feedback.flash"));
            closeModal();
        } catch (error) {
            setFlash(I18n.t("forms.error"));
        } finally {
            setSubmitting(false);
        }
    }, [captureScreenshot, includeScreenshot, location.hash, location.pathname, location.search, message, setFlash]);


    const renderContent = () => (
        <div className="user-feedback-widget__modal">
            <p>{I18n.t("feedback.info")}</p>
            <div className="sds--text-area">
                <textarea
                    name="feedback"
                    id="feedback"
                    value={message}
                    rows="6"
                    ref={inputRef}
                    onChange={e => setMessage(e.target.value)}
                />
            </div>
            <label className="user-feedback-widget__options">
                <Checkbox
                    value={includeScreenshot}
                    onChange={() => setIncludeScreenshot(!includeScreenshot)}
                />
                <span>{I18n.t("feedback.includeScreenshot")}</span>
            </label>
            <section className="disclaimer">
                <span
                    dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(I18n.t("feedback.disclaimer"), {
                            ADD_ATTR: ["target", "rel"]
                        })
                    }}
                />
            </section>
            <section className="help">
                <h3
                    className="title"
                    dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(I18n.t("feedback.help"))
                    }}
                />
                <span
                    dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(I18n.t("feedback.helpInfo"))
                    }}
                />
            </section>
        </div>
    );

    return (
        <div className="user-feedback-widget">
            <button
                className="user-feedback-widget__trigger"
                onClick={() => {
                    setOpen(true);
                    setTimeout(() => inputRef.current?.focus(), 0);
                }}
                type="button"
            >
                {I18n.t("feedback.widgetLabel")}
            </button>
            {open && createPortal(
                <ConfirmationDialog
                    cancel={closeModal}
                    confirm={handleSubmit}
                    confirmationHeader={I18n.t("feedback.title")}
                    confirmationTxt={I18n.t("forms.submit")}
                    disabledConfirm={submitting || !message.trim()}
                    children={renderContent()}
                    largeWidth={true}
                />,
                document.body
            )}
        </div>
    );
};
