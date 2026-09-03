import React from "react";
import "./ErrorIndicator.scss";
import {WarningIcon as CriticalIcon} from "@phosphor-icons/react";
import DOMPurify from "dompurify";

export default function ErrorIndicator({msg, standalone = false, decode = true, adjustMargin = false}) {
    const className = `error-indication ${standalone ? "standalone" : ""} ${adjustMargin ? "adjust-margin" : ""}`;
    msg = msg.replaceAll("?", "");
    return decode ? <span className={className}><CriticalIcon weight="fill"/>{msg}</span> :
        <span className={className}>
            <CriticalIcon weight="fill"/>
            <span className={"error-message"}
                  dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(msg, {ADD_ATTR: ['target'], ADD_TAGS: ['rel']})}}/>
        </span>
}