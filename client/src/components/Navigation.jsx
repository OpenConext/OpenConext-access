import {useEffect, useState} from "react";
import I18n from "../locale/I18n";
import "./Navigation.scss"
import {isEmpty, sanitizeURL, stopEvent} from "../utils/Utils.js";
import {useNavigate} from "react-router";
import {Button} from "@surfnet/sds";
import {useAppStore} from "../stores/AppStore.js";

const tabNames = ["home", "connect", "institutions", "applications"];

export const Navigation = ({mobile, path}) => {

    const config = useAppStore(state => state.config);
    const [tab, setTab] = useState("");

    const navigate = useNavigate();

    useEffect(() => {
        setTab(path.substring(1));
    }, [path]);

    const doNavigate = (e, tabName) => {
        stopEvent(e);
        setTab(tabName);
        navigate(`/${tabName}`)
    }

    const login = (force = true) => {
        let params = force ? `?force=true` : "";
        let serverUrl = config.serverUrl;
        if (isEmpty(serverUrl)) {
            const local = window.location.hostname === "localhost";
            serverUrl = local ? "http://localhost:8886" :
                `${window.location.protocol}//${window.location.host}`
        }
        window.location.href = sanitizeURL(`${serverUrl}/api/v1/users/login${params}`);
    }

    return (
        <div className={`desktop-navigation ${mobile ? "mobile" : ""}`}>
            {tabNames.map(tabName => <a key={tabName}
                                        href={`/${tabName}`}
                                        className={tabName === tab ? "active" : ""}
                                        onClick={e => doNavigate(e, tabName)}>
                {I18n.t(`landing.tabs.${tabName}`)}
            </a>)}
            <div className="links">
                <Button onClick={() => login()}
                        txt={I18n.t("landing.header.login")}/>
            </div>
        </div>
    );
}
