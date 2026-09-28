import React from "react";
import I18n from "../locale/I18n";
import {stopEvent} from "../utils/Utils";
import {switchLocale} from "../utils/Language";
import "./LanguageSelector.scss"

export const LanguageSelector = () => {

    const handleChooseLocale = locale => e => {
        stopEvent(e);
        switchLocale(locale);
    };

    const renderLocaleChooser = locale => {
        return (
            <button type="button" className={`link-button ${I18n.locale === locale ? "is-active" : "not-active"}`}
               title={I18n.t("footer.select_locale")}
               onClick={handleChooseLocale(locale)}>
                {I18n.translations[locale].code}
            </button>
        );
    }

    return (
        <nav className="sds--language-switcher" aria-label="Language">
            <ul>
                <li>{renderLocaleChooser("nl")}
                    <span className="sds--language-sds--divider">|</span>
                </li>
                <li>
                    {renderLocaleChooser("en")}
                </li>
            </ul>
        </nav>
    );
}
