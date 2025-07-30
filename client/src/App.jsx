import React, {useEffect, useState} from 'react'
import {Loader} from "@surfnet/sds";
import './App.scss';
import {Navigate, Route, Routes, useNavigate} from "react-router-dom";
import {configuration, csrf, me} from "./api/index.js";
import {useAppStore} from "./stores/AppStore.js";
import {Flash} from "./components/Flash.jsx";
import {Header} from "./components/Header.jsx";
import NotFound from "./pages/NotFound.jsx";
import RefreshRoute from "./pages/RefreshRoute.jsx";
import {Home} from "./pages/Home.jsx";
import {Footer} from "./components/Footer.jsx";
import {useLocation} from "react-router";
import Organization from "./pages/Organization.jsx";
import Institutions from "./pages/Institutions.jsx";
import Connect from "./pages/Connect.jsx";
import Applications from "./pages/Applications.jsx";
import {SharedMenu} from "./components/SharedMenu.jsx";
import {ApplicationForm} from "./pages/ApplicationForm.jsx";
import {Connection} from "./pages/Connection.jsx";
import {AuthorizedHeader} from "./components/AuthorizedHeader.jsx";
import {isEmpty, stopEvent} from "./utils/Utils.js";
import Landing from "./pages/Landing.jsx";
import JoinRequest from "./pages/JoinRequest.jsx";
import UserHome from "./pages/UserHome.jsx";
import {LoginRedirect} from "./pages/LoginRedirect.jsx";
import {LOCAL_STORAGE_LOCATION} from "./utils/Login.js";
import {Impersonating} from "./components/Impersonating.jsx";
import System from "./pages/System.jsx";
import {InvitationForm} from "./pages/InvitationForm.jsx";
import {Invitation} from "./pages/Invitation.jsx";
import {UserManagement} from "./organization/UserManagement.jsx";
import {LoginInfo} from "./pages/LoginInfo.jsx";
import {AuthenticationSwitch} from "./pages/AuthenticationSwitch.jsx";

const App = () => {

    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const {impersonator} = useAppStore(state => state);
    const navigate = useNavigate();
    const currentLocation = useLocation();

    const sharedRoutes = () => {
        return (
            <>
                <Route path="/home" element={<Home/>}/>
                <Route path="/institutions" element={<Institutions/>}/>
                <Route path="/connect" element={<Connect/>}/>
                <Route path="/applications" element={<Applications/>}/>
                <Route path="/login-info" element={<LoginInfo/>}/>
            </>
        );
    }

    const refreshUser = () => {
        me().then(user =>
            useAppStore.setState(() => ({
                user: user
            })))
    }

    useEffect(() => {
        csrf().then(token => {
            useAppStore.setState(() => ({csrfToken: token.token}));
            configuration()
                .then(config => {
                    useAppStore.setState(() => ({
                        config: config
                    }));
                    setIsAuthenticated(config.authenticated);
                    if (config.authenticated) {
                        me().then(user => {
                            useAppStore.setState(() => ({
                                user: user
                            }));
                            const hasOrganizationMemberships = !isEmpty(user.organizationMemberships);
                            if (hasOrganizationMemberships) {
                                useAppStore.setState(() => ({
                                    menuItems: ["users", "yourApps", "allApps"],
                                    currentOrganization: user.organizationMemberships.map(om => om.organization)[0]
                                }));
                            } else {
                                useAppStore.setState(() => ({
                                    menuItems: ["allApps"]
                                }));
                            }
                            const storedLocation = localStorage.getItem(LOCAL_STORAGE_LOCATION);
                            if (!isEmpty(storedLocation)) {
                                // Do not remove the LOCAL_STORAGE_LOCATION because in development mode this is called twice
                                if (!storedLocation.startsWith("/accept") && !hasOrganizationMemberships) {
                                    navigate("/landing")
                                } else {
                                    navigate(storedLocation);
                                }
                            }
                            setLoading(false);
                        })
                    } else {
                        setLoading(false);
                    }
                })
                .catch(() => {
                    setLoading(false);
                    navigate("/home");
                });
        })
    }, [impersonator]);

    if (loading) {
        return <Loader/>
    }

    return (
        <div className="access">
            {isAuthenticated && <>
                <Flash/>
                {impersonator && <Impersonating/>}
                <div className="container">
                    <SharedMenu/>
                    <div className="pages">
                        <AuthorizedHeader setIsAuthenticated={setIsAuthenticated}/>
                        <Routes>
                            <Route path="/" element={<Navigate replace to="/home"/>}/>
                            <Route path="/landing" element={<Landing refreshUser={refreshUser}/>}/>
                            <Route path="/home" element={<UserHome/>}/>
                            <Route path="/users/:organizationId/:tab?" element={<UserManagement/>}/>
                            <Route path="/organization/:organizationId/:tab?" element={<Organization refreshUser={refreshUser}/>}/>
                            <Route path="/application/:applicationId" element={<ApplicationForm/>}/>
                            <Route path="/join/:organisationId" element={<JoinRequest refreshUser={refreshUser}/>}/>
                            <Route path="/connection/:applicationId/:tab?" element={<Connection/>}/>
                            <Route path="/invitation/:organizationId/:applicationId?" element={<InvitationForm/>}/>
                            <Route path="/accept" element={<Invitation/>}/>
                            <Route path="/system" element={<System/>}/>
                            <Route path="/refresh-route/:path" element={<RefreshRoute/>}/>
                            <Route path="/authentication-switch" element={<AuthenticationSwitch/>}/>
                            {/*{sharedRoutes()}*/}
                            <Route path="*" element={<NotFound/>}/>
                        </Routes>
                    </div>
                </div>
            </>}

            {!isAuthenticated &&
                <>
                    <Header currentLocation={currentLocation}/>
                    <Routes>
                        <Route path="/" element={<Navigate replace to="home"/>}/>
                        {sharedRoutes()}
                        <Route path="/authentication-switch" element={<AuthenticationSwitch/>}/>
                        <Route path="/*" element={<LoginRedirect/>}/>
                    </Routes>
                    <Footer/>
                </>
            }
        </div>
    );
}

export default App;