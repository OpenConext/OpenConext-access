import {useAppStore} from "../stores/AppStore";
import {logout} from "../api";
import {useNavigate} from "react-router-dom";
import {SESSION_STORAGE_LOCATION} from "../utils/Login.js";
import {stopEvent} from "../utils/Utils.js";
import {useCallback} from "react";


export const useLogout = () => {
    const navigate = useNavigate();

    const logoutUser = useCallback((e, setIsAuthenticated) => {
        stopEvent(e);
        logout().then(() => {
            useAppStore.setState(() => ({
                currentOrganization: { name: "" },
                breadcrumbPaths: [],
                user: { name: "" }
            }));

            sessionStorage.removeItem(SESSION_STORAGE_LOCATION);
            navigate("/authentication-switch");

            setTimeout(() => {
                setIsAuthenticated(false);
                navigate("/home");
            }, 375);
        });
    }, [navigate]);

    return logoutUser;
};