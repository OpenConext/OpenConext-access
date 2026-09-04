import React from "react";
import "./Chip.scss";
import {Badge, Tooltip, TooltipContent, TooltipTrigger} from "@surfnet/curve-react";
import {sanitize} from "../utils/Utils";

export const ChipType = {
    Main_100: "main-100",
    Main_200: "main-200",
    Main_300: "main-300",
    Main_400: "main-400",
    Main_500: "main-500",
    Support_100: "support-100",
    Support_400: "support-400",
    Support_500: "support-500",
    Status_default: "status-default",
    Status_success: "status-success",
    Status_warning: "status-warning",
    Status_error: "status-error",
    Status_info: "status-info",
};

export const Chip = (props) => {
    const chipType = props.type || ChipType.Main_100;
    const className = props.className || "";
    const chip = (
        <Badge variant="secondary" className={`custom-chip ${chipType} ${className}`}>
            {props.children &&
                <span className="custom-chip--visual">
                    {props.children}
                </span>}
            <span className="custom-chip--textual">{props.label}</span>
        </Badge>
    );
    if (!props.toolTip) {
        return chip;
    }
    return (
        <Tooltip>
            <TooltipTrigger render={chip}/>
            <TooltipContent><span dangerouslySetInnerHTML={{__html: sanitize(props.toolTip)}}/></TooltipContent>
        </Tooltip>
    );
};

export default Chip;
