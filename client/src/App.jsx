import React, {useEffect, useState} from 'react'
import {Loader} from "@surfnet/sds";
import './App.scss';
import {Navigate, Route, Routes, useLocation, useNavigate} from "react-router";
import {allowedAttributes, arp, configuration, csrf, me, privacy} from "./api/index.js";
import {useAppStore} from "./stores/AppStore.js";
import {Flash} from "./components/Flash.jsx";
import {Header} from "./components/Header.jsx";
import NotFound from "./pages/NotFound.jsx";
import RefreshRoute from "./pages/RefreshRoute.jsx";
import {Home} from "./pages/Home.jsx";
import {Footer} from "./components/Footer.jsx";
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
import {SESSION_STORAGE_LOCATION} from "./utils/Login.js";
import {Impersonating} from "./components/Impersonating.jsx";
import System from "./pages/System.jsx";
import {InvitationForm} from "./pages/InvitationForm.jsx";
import {Invitation} from "./pages/Invitation.jsx";
import {UserManagement} from "./organization/UserManagement.jsx";
import {LoginInfo} from "./pages/LoginInfo.jsx";
import {AuthenticationSwitch} from "./pages/AuthenticationSwitch.jsx";
import {flushSync} from "react-dom";
import ApplicationDetail from "./pages/ApplicationDetail.jsx";
import {activeMenuItem, menuItemsForUser} from "./utils/MenuItems.js";
import Relax from "./pages/Relax.jsx";
import ExternalApplication from "./pages/ExternalApplication.jsx";
import Feedback from "./pages/Feedback.jsx";
import MyOrganization from "./pages/MyOrganization.jsx";
import ApplicationOverview from "./pages/ApplicationOverview.jsx";
import Profile from "./pages/Profile.jsx";
import Changelog from "./pages/Changelog.jsx";
import {UserFeedbackWidget} from "./components/UserFeedbackWidget.jsx";
import Policies from "./pages/Policies.jsx";
import ManageDetail from "./pages/ManageDetail.jsx";
import Statistics from "./pages/Statistics.jsx";
import {currentOrganizationFromUser} from "./utils/Organization.js";
import PublicStats from "./pages/PublicStats.jsx";
import {Monitoring} from "./pages/Monitoring.jsx";
import I18n from "./locale/I18n.js";
import ConfirmationDialog from "./components/ConfirmationDialog.jsx";
import {useLogout} from "./hooks/UseLogout.jsx";

const App = () => {

    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [reference, setReference] = useState(null);
    const impersonator = useAppStore(state => state.impersonator);
    const feedbackWidgetEnabled = useAppStore(state => state.config.feedbackWidgetEnabled);
    const navigate = useNavigate();
    const currentLocation = useLocation();
    const logoutUser = useLogout();

    const refreshUser = callback => {
        me()
            .then(user => {
                const currentOrganization = useAppStore.getState().currentOrganization;
                let organization;
                if (currentOrganization.id) {
                    organization = currentOrganizationFromUser(user, currentOrganization.id);
                } else {
                    organization = user.organizationMemberships[0].organization;
                }
                const newMenuItems = menuItemsForUser(user, organization);
                useAppStore.setState(() => ({
                    user: user,
                    currentOrganization: organization,
                    menuItems: newMenuItems
                }));
                callback && callback();
            })
    }

    useEffect(() => {
        csrf().then(token => {
            useAppStore.setState(() => ({csrfToken: token.token}));
            Promise.all([configuration(), arp(), privacy(), allowedAttributes()])
                .then(res => {
                    useAppStore.setState(() => ({
                        config: res[0],
                        arp: res[1],
                        privacy: res[2],
                        allowedAttributes: res[3]
                    }));
                    setIsAuthenticated(res[0].authenticated);
                    if (res[0].authenticated) {
                        me()
                            .then(user => {
                                //If there are multiple organization memberships, we default to the one which was used to login
                                const orgMembership = (user.organizationMemberships || [])
                                    .find(organizationMembership => !isEmpty(organizationMembership.organization.identityProvider) &&
                                        organizationMembership.organization.identityProvider.data.entityid ===
                                        user.authenticatingAuthority);
                                const currentOrganization = orgMembership?.organization || user.organizationMemberships.map(om => om.organization)[0] || {name: ""};
                                const newMenuItems = menuItemsForUser(user, currentOrganization);
                                useAppStore.setState(() => ({
                                    user: user,
                                    menuItems: newMenuItems,
                                    activeMenuItem: activeMenuItem(currentLocation),
                                    currentOrganization: currentOrganization
                                }));
                                const hasOrganizationMemberships = !isEmpty(user.organizationMemberships);
                                let storedLocation = sessionStorage.getItem(SESSION_STORAGE_LOCATION);
                                if (!isEmpty(storedLocation)) {
                                    // Do not remove the SESSION_STORAGE_LOCATION directly because in development mode this is called twice
                                    if (!storedLocation.startsWith("/accept") && !hasOrganizationMemberships) {
                                        storedLocation = "/landing";
                                    }
                                    flushSync(() => {
                                        navigate(storedLocation, {replace: true});
                                        setTimeout(() => sessionStorage.removeItem(SESSION_STORAGE_LOCATION), 1000 * 5);
                                    });
                                    setTimeout(() => setLoading(false), 500);
                                } else {
                                    setLoading(false);
                                }
                            })
                            .catch(e => {
                                e.response.json().then(j => {
                                    const ref = j.reference || 999;
                                    setReference(ref);
                                    setLoading(false);
                                    setShowErrorModal(true);
                                })
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
    }, [impersonator]); // eslint-disable-line react-hooks/exhaustive-deps

    if (loading) {
        return <Loader/>
    }

    if (showErrorModal) {

        const proceed = () => {
            setLoading(true);
            setShowErrorModal(false);
            logoutUser(null, setIsAuthenticated);
            setTimeout(() => setLoading(false), 325);
        }

        return (
            <div className="access">
                <ConfirmationDialog confirm={proceed}
                                    confirmationHeader={I18n.t("forms.idpConfigException")}
                                    confirmationTxt={I18n.t("forms.proceed")}
                                    question={I18n.t("forms.idpConfigExceptionIfo", {reference: reference})}
                />
            </div>
        );
    }

    return (
        <div className="access">
            {isAuthenticated && <>
                <Flash/>
                {impersonator && <Impersonating/>}
                <div className="container">
                    <SharedMenu currentLocation={currentLocation}/>
                    <div className="pages">
                        <AuthorizedHeader setIsAuthenticated={setIsAuthenticated}/>
                        {feedbackWidgetEnabled && <UserFeedbackWidget/>}
                        <Routes>
                            <Route path="/" element={<Navigate replace to="/home"/>}/>
                            <Route path="/landing" element={<Landing refreshUser={refreshUser}/>}/>
                            <Route path="/home" element={<UserHome/>}/>
                            <Route path="/relax" element={<Relax/>}/>
                            <Route path="/users/:organizationId/:tab?" element={<UserManagement refreshUser={refreshUser}/>}/>
                            <Route path="/organization/:organizationId/:tab?" element={<Organization/>}/>
                            <Route path="/application/:applicationId" element={<ApplicationForm/>}/>
                            <Route path="/join/:organisationId" element={<JoinRequest refreshUser={refreshUser}/>}/>
                            <Route path="/connection/:applicationId/:tab?/:connectionId?" element={<Connection/>}/>
                            <Route path="/invitation/:organizationId/:applicationId?" element={<InvitationForm/>}/>
                            <Route path="/accept" element={<Invitation refreshUser={refreshUser}/>}/>
                            <Route path="/profile" element={<Profile setIsAuthenticated={setIsAuthenticated}/>}/>
                            <Route path="/changelog" element={<Changelog/>}/>
                            <Route path="/external/:app?" element={<ExternalApplication/>}/>
                            <Route path="/application-detail/:manageType/:manageId/:tab?"
                                   element={<ApplicationDetail anonymous={false} refreshUser={refreshUser}/>}/>
                            <Route path="/manage/details/:manageType/:manageId"
                                   element={<ManageDetail/>}/>
                            <Route path="/refresh-route/:path" element={<RefreshRoute/>}/>
                            <Route path="/feedback" element={<Feedback/>}/>
                            <Route path="/idp/:organizationId/:tab?" element={<MyOrganization refreshUser={refreshUser}/>}/>
                            <Route path="/policies/:page?/:policyId?" element={<Policies/>}/>
                            <Route path="/authentication-switch" element={<AuthenticationSwitch/>}/>
                            <Route path="/accessible-apps" element={<ApplicationOverview accessible={true}/>}/>
                            <Route path="/catalogue" element={<ApplicationOverview accessible={false}/>}/>
                            <Route path="/statistics" element={<Statistics/>}/>
                            <Route path="/system/:tab?" element={<System/>}/>
                            <Route path="*" element={<NotFound/>}/>
                        </Routes>
                    </div>
                </div>
            </>}

            {!isAuthenticated &&
                <>
                    <Header currentLocation={currentLocation}/>
                    <Routes>
                        <Route path="/" element={<Navigate replace to="/home"/>}/>
                        <Route path="/landing" element={<Navigate replace to="/home"/>}/>
                        <Route path="/home" element={<Home/>}/>
                        <Route path="/institutions" element={<Institutions/>}/>
                        <Route path="/connect" element={<Connect/>}/>
                        <Route path="/applications" element={<Applications/>}/>
                        <Route path="/stats" element={<PublicStats/>}/>
                        <Route path="/monitoring" element={<Monitoring/>}/>
                        <Route path="/login-info" element={<LoginInfo/>}/>
                        <Route path="/application-detail/:manageType/:manageId"
                               element={<ApplicationDetail anonymous={true}/>}/>
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
