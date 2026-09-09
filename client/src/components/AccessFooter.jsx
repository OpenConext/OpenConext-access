import React, {useEffect, useState} from "react";
import I18n from "../locale/I18n";
import {Link} from "react-router";
import "./AccessFooter.scss"
import {info} from "../api";

export const AccessFooter = () => {

    const [version, setVersion] = useState("");

    useEffect(() => {
        info().then(res => setVersion(res.git?.build?.version || "0.0.1-local"));
    }, []);

    return (
        <footer className="access-footer">
            <a href={I18n.t("footer.versionLink")} target="_blank" rel="noopener noreferrer">
                {I18n.t("footer.version", {version: version})}
            </a>
            <a href={I18n.t("footer.termsLink")} target="_blank" rel="noopener noreferrer">
                {I18n.t("footer.privacyTerms")}
            </a>
        </footer>
    );
}
