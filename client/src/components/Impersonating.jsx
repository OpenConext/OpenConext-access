import {useNavigate} from "react-router-dom";
import {Button, ButtonType, Tooltip} from "@surfnet/sds";
import I18n from "../locale/I18n";
import React from "react";

import "./Impersonating.scss";
import ImpersonateIcon from "@surfnet/sds/icons/illustrative-icons/presentation-amphitheater.svg";
import DOMPurify from "dompurify";
import {useAppStore} from "../stores/AppStore";
import {useShallow} from "zustand/react/shallow";
import {mainMenuItems} from "../utils/MenuItems.js";

export const Impersonating = () => {

    const {user: currentUser, setFlash, impersonator, stopImpersonation} = useAppStore(useShallow(state => ({
        user: state.user,
        setFlash: state.setFlash,
        impersonator: state.impersonator,
        stopImpersonation: state.stopImpersonation
    })));

    const navigate = useNavigate();

    const endImpersonation = () => {
        stopImpersonation();
        setFlash(I18n.t("impersonate.flash.clearedImpersonation"));
        setTimeout(() => {
            navigate("/", {replace: true});
            useAppStore.setState(() => ({
                activeMenuItem: mainMenuItems.home
            }));

        }, 375);
    }


    return (
        <div className="impersonator ">
            <Tooltip children={<ImpersonateIcon/>}
                     standalone={true}
                     tip={I18n.t("impersonate.impersonatorTooltip", {
                         currentUser: currentUser.name,
                         impersonator: impersonator.name
                     })}/>

            <p dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(I18n.t("impersonate.impersonator", {
                    name: currentUser.name
                }))
            }}/>
            <Button type={ButtonType.Secondary}
                    onClick={() => endImpersonation()}
                    txt={I18n.t("impersonate.exit")}/>
        </div>)
}
