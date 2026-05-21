import {useState} from "react";
import I18n from "../locale/I18n";
import "./Navigation.scss"
import {stopEvent} from "../utils/Utils.js";
import {useNavigate} from "react-router";
import {Button} from "@surfnet/sds";

const tabNames = ["home", "connect", "institutions", "applications", "stats"];

export const Navigation = ({mobile, path}) => {

    const [tab, setTab] = useState(() => path.substring(1));

    const navigate = useNavigate();

    const doNavigate = (e, tabName) => {
        stopEvent(e);
        setTab(tabName);
        navigate(`/${tabName}`)
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
                {path !== "/login-info" &&
                    <Button onClick={() => navigate("/login-info")}
                            txt={I18n.t("landing.header.login")}/>}
            </div>
        </div>
    );
}
