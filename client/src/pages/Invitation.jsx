import React, {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import {useAppStore} from "../stores/AppStore";
import I18n from "../locale/I18n";
import {acceptInvitation, getInvitationByHash} from "../api";
import {getParameterByName} from "../utils/QueryParameters.js";
import {Loader} from "@surfnet/sds";
import ConfirmationDialog from "../components/ConfirmationDialog.jsx";
import Welcome from "../icons/undraw/welcome.svg";
import {SESSION_STORAGE_LOCATION} from "../utils/Login.js";
import {mainMenuItems} from "../utils/MenuItems.js";

export const Invitation = ({refreshUser}) => {

    const navigate = useNavigate();
    const setFlash = useAppStore(state => state.setFlash);
    const [invitation, setInvitation] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const hash = getParameterByName("hash", window.location.search)
        getInvitationByHash(hash)
            .then(res => {
                setInvitation(res);
                sessionStorage.removeItem(SESSION_STORAGE_LOCATION);
                useAppStore.setState({
                    breadcrumbPaths: [
                        {path: "/home", value: I18n.t("breadCrumb.access"), menuItemName: mainMenuItems.home},
                        {path: `/organization/${res.organization.id}`, value: res.organization.name, menuItemName: mainMenuItems.yourApps},
                        {value: I18n.t("breadCrumb.invitations")}
                    ],
                });
                setLoading(false);
            })
            .catch(() => {
                navigate("/404")
            });
    }, []);// eslint-disable-line react-hooks/exhaustive-deps

    const proceed = () => {
        setLoading(true);
        acceptInvitation(invitation).then(() => {
            setFlash(I18n.t("invitation.acceptedFlash", {name: invitation.organization.name}));
            refreshUser();
            navigate(`/organization/${invitation.organization.id}/team`);
        })
    }


    if (loading) {
        return <Loader/>
    }

    return (
        <section className="invitation-container">
            <Welcome/>
            <ConfirmationDialog confirm={proceed}
                                confirmationHeader={I18n.t("forms.accept")}
                                confirmationTxt={I18n.t("forms.proceed")}
                                question={I18n.t("invitation.accept",
                                    {
                                        name: invitation.organization.name,
                                        inviter: invitation.inviter.name
                                    })}
            />
        </section>
    );
}