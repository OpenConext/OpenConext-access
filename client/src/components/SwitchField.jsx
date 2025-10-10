import React from "react";
import "./SwitchField.scss";
import {Switch} from "@surfnet/sds";
import AlertIcon from "../icons/alert-triangle.svg";

export default function SwitchField({name, value, onChange, label, info, last = false, isAlert=false}) {
    return (
        <div className={`switch-field ${last ? "last" : ""}`}>
            <div className={"inner-switch"}>
                <span className="switch-label">{label}{isAlert && <AlertIcon/>}</span>
                <span className="switch-info">{info}</span>
            </div>
            <Switch name={name}
                    value={value}
                    onChange={onChange}/>
        </div>

    )
}