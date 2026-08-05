import {useAppStore} from "../stores/AppStore";
import {logout} from "../api";
import {useNavigate} from "react-router";
import {SESSION_STORAGE_LOCATION} from "../utils/Login.js";
import {stopEvent} from "../utils/Utils.js";
import {useCallback} from "react";


export const useLogout = () => {
    const navigate = useNavigate();

    const logoutUser = useCallback((e, setIsAuthenticated) => {
        stopEvent(e);
        navigate("/authentication-switch");
        logout().then(() => {
            sessionStorage.removeItem(SESSION_STORAGE_LOCATION);
            setIsAuthenticated(false);
            setTimeout(() => {
                useAppStore.setState(() => ({
                    currentOrganization: { name: "" },
                    breadcrumbPaths: [],
                    user: { name: "" }
                }));
                navigate("/home");
            }, 175);
        });
    }, [navigate]);

    return logoutUser;
};
