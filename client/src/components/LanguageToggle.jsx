import React from "react";
import I18n from "../locale/I18n";
import {GlobeIcon} from "@phosphor-icons/react";
import {stopEvent} from "../utils/Utils";
import {switchLocale} from "../utils/Language";
import "./LanguageToggle.scss";

export const LanguageToggle = () => {

    const otherLocale = I18n.locale === "nl" ? "en" : "nl";

    return (
        <button type="button"
                className="language-toggle"
                title={I18n.t("footer.select_locale")}
                onClick={e => {
                    stopEvent(e);
                    switchLocale(otherLocale);
                }}>
            <GlobeIcon/>
            <span>{I18n.t(`languages.${I18n.locale}`)}</span>
        </button>
    );
}
