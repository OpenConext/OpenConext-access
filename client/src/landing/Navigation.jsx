import {useEffect, useState} from "react";
import I18n from "../locale/I18n";
import "./Navigation.scss"
import {stopEvent} from "../utils/Utils.js";
import {useNavigate} from "react-router";
import {Button} from "@surfnet/sds";

const tabNames = ["home", "connect", "institutions", "applications"]

export const Navigation = ({mobile, path}) => {

    // const config = useAppStore((state) => state.config);

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

    const doLogin = () => {
        const path = window.location.origin;
        window.location.href = `${path}/api/v1/users/login`;
    }
    return (
        <div className={`desktop-navigation ${mobile ? "mobile" : ""}`}>
            {tabNames.map(tabName => <a key={tabName}
                                        href={`/${tabName}`}
                                        className={tabName === tab ? "active" : ""}
                                        onClick={e => doNavigate(e, tabName)}>
                {I18n.t(`tabs.${tabName}`)}
            </a>)}
            <div className="links">
                <Button onClick={() => doLogin()}
                        txt={I18n.t("header.register")}/>
            </div>
        </div>
    );
}
