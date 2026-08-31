import {Spinner} from "@surfnet/curve-react";
import {useAppStore} from "../stores/AppStore.js";
import {login, SESSION_STORAGE_LOCATION} from "../utils/Login.js";
import {useLocation} from "react-router";

export const LoginRedirect = () => {
    const config = useAppStore(state => state.config);
    const currentLocation = useLocation();

    const locationUrl = currentLocation.pathname + currentLocation.search;
    sessionStorage.setItem(SESSION_STORAGE_LOCATION, locationUrl);
    login(config);

    return <div className="loading-container"><Spinner className="size-8"/></div>
}
