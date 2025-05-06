import React, {useEffect, useState} from 'react'
import {Loader} from "@surfnet/sds";
import './App.scss';
import {Navigate, Route, Routes, useNavigate} from "react-router-dom";
import {me, configuration} from "./api/index.js";
import {useAppStore} from "./stores/AppStore.js";
import {Flash} from "./components/Flash.jsx";
import {Header} from "./components/Header.jsx";
import {BreadCrumb} from "./components/BreadCrumb.jsx";
import NotFound from "./pages/NotFound.jsx";
import RefreshRoute from "./pages/RefreshRoute.jsx";
import {Home} from "./pages/Home.jsx";
import {Footer} from "./components/Footer.jsx";
import {useLocation} from "react-router";
import Organisation from "./pages/Organisation.jsx";
import Institutions from "./pages/Institutions.jsx";
import Connect from "./pages/Connect.jsx";
import Applications from "./pages/Applications.jsx";

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
                <Route path="/*" element={<NotFound/>}/>
            </>
        );
    }

    useEffect(() => {
        configuration()
            .then(config => {
                useAppStore.setState(() => ({config: config}));
                setLoading(false);
                setIsAuthenticated(config.authenticated);
                if (config.authenticated) {
                    me().then(user => {
                        useAppStore.setState(() => ({user: user}));
                        navigate("/organisation");
                    })
                } else {
                    navigate("/home");
                }
            }).catch(() => {
                setLoading(false);
                navigate("/home");
        });

    }, []);

    if (loading) {
        return <Loader/>
    }

    return (
        <div className="access">
            <div className="container">
                <Flash/>
                {!isAuthenticated && <Header currentLocation={currentLocation}/>}
                {isAuthenticated && <BreadCrumb/>}
                {isAuthenticated &&
                    <Routes>
                        <Route path="/" element={<Navigate replace to="organisation"/>}/>
                        <Route path="/organisation/:tab?" element={<Organisation/>}/>
                        <Route path="/refresh-route/:path" element={<RefreshRoute/>}/>
                        {sharedRoutes()}
                        <Route path="*" element={<NotFound/>}/>
                    </Routes>}
                {!isAuthenticated &&
                    <Routes>
                        <Route path="/" element={<Navigate replace to="home"/>}/>
                        {sharedRoutes()}
                    </Routes>
                }
            </div>
            {<Footer/>}
        </div>
    );
}

export default App;