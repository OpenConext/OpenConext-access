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
import {isEmpty} from "./utils/Utils.js";
import Landing from "./pages/Landing.jsx";
import JoinRequest from "./pages/JoinRequest.jsx";
import UserHome from "./pages/UserHome.jsx";
import {LoginRedirect} from "./pages/LoginRedirect.jsx";
import {LOCAL_STORAGE_LOCATION} from "./utils/Login.js";

const App = () => {

    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const navigate = useNavigate();
    const currentLocation = useLocation();

    const sharedRoutes = () => {
        return (
            <>
                <Route path="/home" element={<Home/>}/>
                <Route path="/institutions" element={<Institutions/>}/>
                <Route path="/connect" element={<Connect/>}/>
                <Route path="/applications" element={<Applications/>}/>
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
                            if (isEmpty(user.organizationMemberships)) {
                                useAppStore.setState(() => ({
                                    menuItems: ["home"]
                                }));
                                navigate("/landing");
                            } else {
                                useAppStore.setState(() => ({
                                    menuItems: ["home", "applications", "teams"],
                                    currentOrganization: user.organizationMemberships.map(om => om.organization)[0]
                                }));
                            }
                            const storedLocation = localStorage.getItem(LOCAL_STORAGE_LOCATION);
                            if (!isEmpty(storedLocation)) {
                                localStorage.removeItem(LOCAL_STORAGE_LOCATION);
                                navigate(storedLocation);
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
    }, []);

    if (loading) {
        return <Loader/>
    }

    return (
        <div className="access">
            {isAuthenticated && <>
                <Flash/>
                <div className="container">
                    <SharedMenu/>
                    <div className="pages">
                        <AuthorizedHeader setIsAuthenticated={setIsAuthenticated}/>
                        <Routes>
                            <Route path="/" element={<Navigate replace to="/home"/>}/>
                            <Route path="/landing" element={<Landing refreshUser={refreshUser}/>}/>
                            <Route path="/home" element={<UserHome/>}/>
                            <Route path="/organization/:organizationId/:tab?" element={<Organization/>}/>
                            <Route path="/application/:applicationId" element={<ApplicationForm/>}/>
                            <Route path="/join/:organisationId" element={<JoinRequest refreshUser={refreshUser}/>}/>
                            <Route path="/connection/:applicationId/:id?" element={<Connection/>}/>
                            <Route path="/refresh-route/:path" element={<RefreshRoute/>}/>
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
                        <Route path="/*" element={<LoginRedirect/>}/>
                    </Routes>
                    <Footer/>
                </>
            }
        </div>
    );
}

export default App;