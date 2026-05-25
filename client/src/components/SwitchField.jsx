import React from "react";
import "./SwitchField.scss";
import {Switch, Tooltip} from "@surfnet/sds";
import AlertIcon from "../icons/alert-triangle.svg";
import I18n from "../locale/I18n";

export default function SwitchField({name, value, onChange, label, info, last = false, isAlert=false, className = ""}) {
    return (
        <div className={`switch-field ${last ? "last" : ""} ${className}`}>
            <div className={"inner-switch"}>
                <span className="switch-label">{label}{isAlert &&
                    <Tooltip standalone={true}
                             children={<AlertIcon/>}
                             tip={I18n.t("forms.changeRequest")}/>
                    }</span>
                <span className="switch-info">{info}</span>
            </div>
            <Switch name={name}
                    value={value}
                    onChange={onChange}/>
        </div>

    )
}