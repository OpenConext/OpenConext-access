import Cookies from "js-cookie";
import I18n from "../locale/I18n";
import {replaceQueryParameter} from "./QueryParameters";

const DEFAULT_LANGUAGES = ["nl", "en"];

// Every language is shown in its own language, independent of the current locale
export const LANGUAGE_NAMES = {en: "English", nl: "Nederlands", pt: "Português"};

// The languages offered in the language picker: the comma separated config.usedLanguages (e.g. "nl, en, pt"),
// restricted to the locale bundles that exist
export const parseUsedLanguages = usedLanguages => {
    const languages = (usedLanguages || "")
        .split(",")
        .map(language => language.trim().toLowerCase())
        .filter(language => I18n.translations[language]);
    return languages.length > 0 ? [...new Set(languages)] : DEFAULT_LANGUAGES;
};

export const switchLocale = locale => {
    Cookies.set("lang", locale, {expires: 356, secure: document.location.protocol.endsWith("https")});
    I18n.locale = locale;
    window.location.search = replaceQueryParameter(window.location.search, "lang", locale);
};
