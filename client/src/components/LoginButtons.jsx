import React from "react";
import I18n from "../locale/I18n";
import {Button} from "@surfnet/curve-react";
import {useAppStore} from "../stores/AppStore.js";
import {login} from "../utils/Login.js";
import {sanitize} from "../utils/Utils";
import "./LoginButtons.scss";

export const LoginButtons = ({className = "", onClick}) => {

    const config = useAppStore(state => state.config);

    const doLogin = useEduID => () => {
        onClick && onClick();
        login(config, true, useEduID);
    };

    return (
        <div className={`login-buttons ${className}`}>
            <Button variant="outline" onClick={doLogin(true)}>
                <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("landing.header.loginProvider"))}}/>
            </Button>
            <Button variant="outline" onClick={doLogin(false)}>
                <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("landing.header.loginInstitution"))}}/>
            </Button>
        </div>
    );
}
