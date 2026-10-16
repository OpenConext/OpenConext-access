import "./HelpIcon.scss";
import React, {useEffect} from "react";
import {createPortal} from "react-dom";
import {InfoIcon, XIcon} from "@phosphor-icons/react";
import I18n from "../locale/I18n";
import {useAppStore} from "../stores/AppStore.js";
import {getHelpContent} from "../help/index.jsx";

export const HelpPanel = ({helpId, onClose}) => {
    const content = getHelpContent(helpId);
    useEffect(() => {
        const onKeyDown = e => e.key === "Escape" && onClose();
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [onClose]);
    if (!content) {
        return null;
    }
    return createPortal(
        <aside className="help-panel" role="dialog" aria-label={I18n.t("help.title")}>
            <div className="help-panel-header">
                <div className="help-panel-titles">
                    <p className="help-panel-title">{I18n.t("help.title")}</p>
                    <p className="help-panel-subtitle">{I18n.t("help.subTitle")}</p>
                </div>
                <button type="button" className="help-close" aria-label={I18n.t("help.close")} onClick={onClose}>
                    <XIcon size={24}/>
                </button>
            </div>
            <div className="help-panel-content">
                {content}
            </div>
        </aside>,
        document.body
    );
}

export const HelpIcon = ({id}) => {
    const helpEnabled = useAppStore(state => state.config.helpEnabled);
    const activeHelpId = useAppStore(state => state.helpId);
    const setHelpId = useAppStore(state => state.setHelpId);
    const open = activeHelpId === id;

    if (helpEnabled === false || !getHelpContent(id)) {
        return null;
    }
    return (
        <>
            <button type="button"
                    className="help-icon"
                    aria-label={I18n.t("help.open")}
                    aria-expanded={open}
                    onClick={() => setHelpId(open ? null : id)}>
                <InfoIcon size={24}/>
            </button>
            {open && <HelpPanel helpId={id} onClose={() => setHelpId(null)}/>}
        </>
    );
}

export default HelpIcon;
