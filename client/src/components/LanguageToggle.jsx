import React from "react";
import I18n from "../locale/I18n";
import {
    Button,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@surfnet/curve-react";
import {CheckIcon, GlobeIcon} from "@phosphor-icons/react";
import {stopEvent} from "../utils/Utils";
import {LANGUAGE_NAMES, switchLocale} from "../utils/Language";
import {useUsedLanguages} from "../hooks/useUsedLanguages.js";

// With two languages the toggle shows the language that is not active, clicking it switches to that language.
// With more languages the toggle opens a menu with all languages.
export const LanguageToggle = () => {

    const languages = useUsedLanguages();

    if (languages.length < 2) {
        return null;
    }
    if (languages.length === 2) {
        const otherLocale = languages.find(locale => locale !== I18n.locale) || languages[0];
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
    return (
        <DropdownMenu>
            <DropdownMenuTrigger render={
                <Button variant="ghost" className="language-toggle" title={I18n.t("footer.select_locale")}>
                    <GlobeIcon/>
                    <span lang={I18n.locale}>{LANGUAGE_NAMES[I18n.locale]}</span>
                </Button>
            }/>
            <DropdownMenuContent align="end">
                {languages.map(locale =>
                    <DropdownMenuItem key={locale} onClick={() => switchLocale(locale)}>
                        <span lang={locale}>{LANGUAGE_NAMES[locale]}</span>
                        {I18n.locale === locale && <CheckIcon/>}
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
