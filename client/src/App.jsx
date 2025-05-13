import React, {useEffect, useState} from 'react'
import {Loader} from "@surfnet/sds";
import './App.scss';
import {Navigate, Route, Routes, useNavigate} from "react-router-dom";
import {configuration, me} from "./api/index.js";
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
import {SharedMenu} from "./components/SharedMenu.jsx";
import I18n from "./locale/I18n.js";
import {ApplicationForm} from "./pages/ApplicationForm.jsx";

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
                useAppStore.setState(() => ({
                    config: config
                }));
                setLoading(false);
                setIsAuthenticated(config.authenticated);
                if (config.authenticated) {
                    me().then(user => {
                        useAppStore.setState(() => ({
                            user: user,
                            menuItems: ["home", "applications", "teams"]
                        }));
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
            {isAuthenticated && <>
                <Flash/>
                <div className="container">
                    <SharedMenu/>
                    <div className="pages">
                        <BreadCrumb/>
                        <Routes>
                            <Route path="/" element={<Navigate replace to="organisation"/>}/>
                            <Route path="/organisations/:tab?" element={<Organisation/>}/>
                            <Route path="/application/:id" element={<ApplicationForm/>}/>
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
                    </Routes>
                    <Footer/>
                </>
            }
        </div>
    );
}

export default App;