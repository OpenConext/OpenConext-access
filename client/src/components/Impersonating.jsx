import {useNavigate} from "react-router";
import {Tooltip, TooltipContent, TooltipTrigger} from "@surfnet/curve-react";
import {Button} from "@surfnet/curve-react";
import I18n from "../locale/I18n";
import React from "react";

import "./Impersonating.scss";
import {ChalkboardTeacherIcon as ImpersonateIcon} from "@phosphor-icons/react";
import DOMPurify from "dompurify";
import {useAppStore} from "../stores/AppStore";
import {useShallow} from "zustand/react/shallow";
import {mainMenuItems} from "../utils/MenuItems.js";
import {sanitize} from "../utils/Utils";

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
            <Tooltip>
                <TooltipTrigger render={<ImpersonateIcon/>}/>
                <TooltipContent><span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("impersonate.impersonatorTooltip", {
                    currentUser: currentUser.name,
                    impersonator: impersonator.name
                }))}}/></TooltipContent>
            </Tooltip>

            <p dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(I18n.t("impersonate.impersonator", {
                    name: currentUser.name
                }))
            }}/>
            <Button variant="secondary"
                    onClick={() => endImpersonation()}>
                <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("impersonate.exit"))}}/>
            </Button>
        </div>)
}
