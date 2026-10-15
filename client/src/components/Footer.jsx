import React from "react";
import I18n from "../locale/I18n";
import "./Footer.scss"
import SurfLogo from "../icons/logo-surf.svg";

export const Footer = () => {

    return (
        <footer className="sds--footer">
            <div className="sds--footer--inner">
                <nav className="menu">
                    <a className="external-link"
                       href={I18n.t("footer.termsLink")} target="_blank"
                       rel="noopener noreferrer"><span>{I18n.t("footer.privacyTerms")}</span></a>
                </nav>
                <SurfLogo className="footer-logo" aria-hidden="true"/>
            </div>
        </footer>
    );
}
