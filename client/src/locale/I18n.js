import en from "./en";
import nl from "./nl";
import pt from "./pt";
import { enOverride, nlOverride } from '../appCustomizations/index.ts'

import {I18n as I18nRemote} from "i18n-js";

import {getParameterByName} from "../utils/QueryParameters";
import {isEmpty} from "../utils/Utils";
import Cookies from "js-cookie";

const I18n = new I18nRemote({
    en: en,
    nl: nl,
    pt: pt,
});

I18n.store({
    en: enOverride,
    nl: nlOverride,
})

// DetermineLanguage based on parameter, cookie and finally navigator
const requestedLanguage = getParameterByName("lang", window.location.search);
let parameterByName = requestedLanguage;

if (isEmpty(parameterByName)) {
    parameterByName = Cookies.get("lang");
}

if (isEmpty(parameterByName)) {
    parameterByName = navigator.language.toLowerCase().substring(0, 2);
}
if (!I18n.translations[parameterByName]) {
    parameterByName = "en";
}
I18n.locale = parameterByName;

// The other application (Access / Invite) runs on another domain and passes the language in the url.
// Remember it for this domain, before a possible login redirect drops the parameter.
if (!isEmpty(requestedLanguage) && requestedLanguage === parameterByName) {
    Cookies.set("lang", parameterByName, {expires: 356, secure: document.location.protocol.endsWith("https")});
}

I18n.missingTranslation.register("report-error", (i18n, scope) => {
    return `[missing "${scope}" translation]`;
});
I18n.missingBehavior = "report-error";

// Allows inserting always-available variables in translations
const _t = I18n.t.bind(I18n);
I18n.t = (scope, options = {}) => _t(scope, { productName: _t("globalVariables.productName"), ...options });

export const tArray = (scope, mapFn) =>
    I18n.t(scope).map((_, i) => mapFn(I18n.t(`${scope}.${i}`), i));

export default I18n;
