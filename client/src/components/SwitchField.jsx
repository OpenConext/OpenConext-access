import React from "react";
import "./SwitchField.scss";
import {Switch, Tooltip, TooltipContent, TooltipTrigger} from "@surfnet/curve-react";
import AlertIcon from "../icons/alert-triangle.svg";
import I18n from "../locale/I18n";
import {sanitize} from "../utils/Utils";

export default function SwitchField({name, value, onChange, label, info, last = false, isAlert=false, className = ""}) {
    return (
        <div className={`switch-field ${last ? "last" : ""} ${className}`}>
            <div className={"inner-switch"}>
                <span className="switch-label">{label}{isAlert &&
                    <Tooltip>
                        <TooltipTrigger render={<AlertIcon/>}/>
                        <TooltipContent><span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("forms.changeRequest"))}}/></TooltipContent>
                    </Tooltip>
                    }</span>
                <span className="switch-info">{info}</span>
            </div>
            <Switch name={name}
                    checked={value}
                    onCheckedChange={onChange}/>
        </div>

    )
}