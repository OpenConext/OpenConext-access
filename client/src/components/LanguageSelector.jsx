import React from "react";
import I18n from "../locale/I18n";
import {stopEvent} from "../utils/Utils";
import {switchLocale} from "../utils/Language";
import {useUsedLanguages} from "../hooks/useUsedLanguages.js";
import "./LanguageSelector.scss"

export const LanguageSelector = () => {

    const languages = useUsedLanguages();

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

    if (languages.length < 2) {
        return null;
    }
    return (
        <nav className="sds--language-switcher" aria-label="Language">
            <ul>
                {languages.map((locale, index) =>
                    <li key={locale}>
                        {renderLocaleChooser(locale)}
                        {index < languages.length - 1 && <span className="sds--language-sds--divider">|</span>}
                    </li>
                )}
            </ul>
        </nav>
    );
}
