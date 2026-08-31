import React, {useEffect, useState} from "react";
import {useNavigate} from "react-router";
import {useAppStore} from "../stores/AppStore";
import I18n from "../locale/I18n";
import {acceptInvitation, getInvitationByHash} from "../api";
import {getParameterByName} from "../utils/QueryParameters.js";
import {Spinner} from "@surfnet/curve-react";
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
            refreshUser(() => {
                navigate(`/organization/${invitation.organization.id}/team`);
            });

        }).catch(() => {
            //e.g. this account's email does not match the invitation - see InvitationController#accept
            setLoading(false);
            setFlash(I18n.t("invitation.acceptedErrorFlash"), "error");
        })
    }


    if (loading) {
        return <div className="loading-container"><Spinner className="size-8"/></div>
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
