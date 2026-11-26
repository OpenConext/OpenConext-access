import React from "react";
import "./LanguageSwitcher.scss";
import I18n from "../locale/I18n";
import {switchLocale} from "../utils/Language";
import {
    Button,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@surfnet/curve-react";
import {CaretDownIcon, CheckIcon} from "@phosphor-icons/react";
import {useUsedLanguages} from "../hooks/useUsedLanguages.js";

export const LanguageSwitcher = () => {

    const languages = useUsedLanguages();

    if (languages.length < 2) {
        return null;
    }
    return (
        <DropdownMenu>
            <DropdownMenuTrigger render={
                <Button variant="ghost">
                    <span>{I18n.translations[I18n.locale].code}</span>
                    <CaretDownIcon/>
                </Button>
            }/>
            <DropdownMenuContent align="end">
                {languages.map(locale =>
                    <DropdownMenuItem key={locale} onClick={() => switchLocale(locale)}>
                        <span className="language-option-name">{I18n.translations[locale].code}</span>
                        {I18n.locale === locale && <CheckIcon/>}
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
