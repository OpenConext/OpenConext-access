import React from "react";
import {WarningCircleIcon as AlertIcon} from "@phosphor-icons/react";
import "./Tab.scss";
import {Badge} from "@surfnet/curve-react";

export default function Tab({
                                name,
                                onClick,
                                activeTab,
                                className = "",
                                label,
                                Icon,
                                notifier,
                                readOnly,
                                busy,
                            }) {

    const onClickInner = () => {
        if (!readOnly) {
            onClick(name);
        }
    };


    className += ` tab ${name}`;

    if (activeTab === name) {
        className += " active";
    }
    if (readOnly) {
        className += " read-only";
    }
    if (busy) {
        className += " busy";
    }
    let chipCount = null;
    if (label && label.indexOf("(") > -1) {
        const count = label.substring(label.indexOf("(") + 1, label.indexOf(")"));
        label = label.substring(0, label.indexOf("(") - 1);
        chipCount = <Badge variant="secondary">{count}</Badge>
    }

    return (
        <div className={className} onClick={onClickInner}>
            {notifier && <span className="notifier"><AlertIcon/></span>}
            <button className={"tab-label"}>{Icon && <Icon/>}{label}{chipCount}</button>
        </div>
    );
}
