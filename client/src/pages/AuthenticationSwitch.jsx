import {useEffect} from "react";
import {Loader} from "@surfnet/sds";
import {useAppStore} from "../stores/AppStore.js";
import {LOCAL_STORAGE_LOCATION, login} from "../utils/Login.js";
import {useLocation} from "react-router";

export const AuthenticationSwitch = () => {

    return <Loader/>
}
