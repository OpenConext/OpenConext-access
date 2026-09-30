import React from "react";
import "./SegmentedControl.scss";
import {Tabs, TabsList, TabsTrigger} from "@surfnet/curve-react";
import {sanitize} from "../utils/Utils";

const SegmentedControl = ({options, option, optionLabelResolver, onClick}) => (
    <Tabs value={option} onValueChange={onClick} className="access-segmented-control-container">
        <TabsList>
            {options.map(o =>
                <TabsTrigger key={o} value={o}>
                    <span dangerouslySetInnerHTML={{__html: sanitize(optionLabelResolver(o))}}/>
                </TabsTrigger>)}
        </TabsList>
    </Tabs>
);

export default SegmentedControl;
