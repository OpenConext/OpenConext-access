import React from "react";
import I18n from "../locale/I18n";
import "./Footer.scss"
import {LanguageSelector} from "./LanguageSelector";

export const Footer = () => {

    return (
        <footer className="sds--footer sds--footer--single-bar">
            <div className="sds--footer--inner">
                <nav className="menu sds--text--body--small">
                    <ul>
                        <li>
                            <a className="external-link"
                               href={I18n.t("footer.termsLink")} target="_blank"
                               rel="noopener noreferrer"><span>{I18n.t("footer.terms")}</span></a>
                        </li>
                        <li>
                            <a className="external-link"
                               href={I18n.t("footer.privacyLink")} target="_blank"
                               rel="noopener noreferrer"><span>{I18n.t("footer.privacy")}</span></a>
                        </li>
                    </ul>
                </nav>
                <LanguageSelector/>
            </div>
        </footer>
    );
}
