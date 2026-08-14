import React, {useEffect, useState} from "react";
import I18n from "../locale/I18n";
import Cookies from "js-cookie";
import {Link} from "react-router";
import "./SharedMenuFooter.scss"
import {info} from "../api";
import {replaceQueryParameter} from "../utils/QueryParameters";
import ToggleSegmentButton from "./ToggleSegmentButton";

export const SharedMenuFooter = () => {

    const [version, setVersion] = useState("");

    useEffect(() => {
        info().then(res => setVersion(res.git?.build?.version || "0.0.1-local"));
    }, []);

    const handleChooseLocale = locale => {
        Cookies.set("lang", locale, {expires: 356, secure: document.location.protocol.endsWith("https")});
        I18n.locale = locale;
        window.location.search = replaceQueryParameter(window.location.search, "lang", locale);
    };

    return (
        <footer className="sds--footer sds--footer--single-bar shared-menu">
            <div className="sds--footer--inner">
                <ToggleSegmentButton value={I18n.locale}
                                     onChange={handleChooseLocale}
                                     options={[
                                         {value: "nl", label: I18n.translations.nl.code},
                                         {value: "en", label: I18n.translations.en.code}
                                     ]}/>
                <hr/>
                <nav className="menu sds--text--body--small">
                    <ul>
                        <li>
                            <Link to={I18n.t("footer.versionLink")}>{I18n.t("footer.version", {version: version})}</Link>
                        </li>
                        <li>
                            <a href={I18n.t("footer.termsLink")} target="_blank"
                               rel="noopener noreferrer"><span>{I18n.t("footer.terms")}</span></a>
                        </li>
                        <li>
                            <a href={I18n.t("footer.privacyLink")} target="_blank"
                               rel="noopener noreferrer"><span>{I18n.t("footer.privacy")}</span></a>
                        </li>
                    </ul>
                </nav>
            </div>
        </footer>
    );
}
