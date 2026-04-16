import React from "react";
import "./SegmentedControl.scss";
import {Button, ButtonType} from "@surfnet/sds";

const SegmentedControl = ({options, option, optionLabelResolver, onClick}) => {

    return (
        <div className="access-segmented-control-container">
            <div className="access-segmented-control">
                {options.map((o) =>
                    <Button txt={optionLabelResolver(o)}
                            key={o}
                            active={o === option}
                            onClick={() => onClick(o)}
                            type={o === option ? ButtonType.Primary : ButtonType.Secondary}
                    />)}
            </div>

        </div>)
};

export default SegmentedControl;
