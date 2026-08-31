import React from "react";
import "./LanguageSwitcher.scss";
import I18n from "../locale/I18n";
import Cookies from "js-cookie";
import {replaceQueryParameter} from "../utils/QueryParameters";
import {
    Button,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@surfnet/curve-react";
import {CaretDownIcon} from "@phosphor-icons/react";

export const LanguageSwitcher = () => {

    const handleChooseLocale = locale => {
        Cookies.set("lang", locale, {expires: 356, secure: document.location.protocol.endsWith("https")});
        I18n.locale = locale;
        window.location.search = replaceQueryParameter(window.location.search, "lang", locale);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger render={
                <Button variant="ghost">
                    <span>{I18n.translations[I18n.locale].code}</span>
                    <CaretDownIcon/>
                </Button>
            }/>
            <DropdownMenuContent align="end">
                {["nl", "en"].map(locale =>
                    <DropdownMenuItem key={locale} onClick={() => handleChooseLocale(locale)}>
                        {I18n.translations[locale].code}
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
