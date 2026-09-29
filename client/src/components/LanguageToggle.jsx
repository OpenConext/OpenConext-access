import React from "react";
import I18n from "../locale/I18n";
import {Button} from "@surfnet/curve-react";
import {GlobeIcon} from "@phosphor-icons/react";
import {stopEvent} from "../utils/Utils";
import {switchLocale} from "../utils/Language";

// Every language is shown in its own language, independent of the current locale
const LANGUAGE_NAMES = {en: "English", nl: "Nederlands"};

// Shows the language that is not active, clicking it switches to that language
export const LanguageToggle = () => {

    const otherLocale = I18n.locale === "nl" ? "en" : "nl";

    return (
        <Button variant="ghost"
                className="language-toggle"
                title={I18n.t("footer.select_locale")}
                onClick={e => {
                    stopEvent(e);
                    switchLocale(otherLocale);
                }}>
            <GlobeIcon/>
            <span lang={otherLocale}>{LANGUAGE_NAMES[otherLocale]}</span>
        </Button>
    );
}
