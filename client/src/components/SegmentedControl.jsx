import React from "react";
import "./SegmentedControl.scss";
import {Button} from "@surfnet/curve-react";
import {sanitize} from "../utils/Utils";

const SegmentedControl = ({options, option, optionLabelResolver, onClick}) => {

    return (
        <div className="access-segmented-control-container">
            <div className="access-segmented-control">
                {options.map((o) =>
                    <Button key={o}
                            aria-expanded={o === option}
                            onClick={() => onClick(o)}
                            variant={o === option ? undefined : "outline"}
                    >
                        <span dangerouslySetInnerHTML={{__html: sanitize(optionLabelResolver(o))}}/>
                    </Button>)}
            </div>

        </div>)
};

export default SegmentedControl;
