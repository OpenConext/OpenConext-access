import React, {useState} from "react";
import "./MoreLessToggle.scss";
import {isEmpty, stopEvent} from "../utils/Utils";

export const MoreLessToggle = (props) => {
    const cutoffNumber = props.cutoffNumber || 190;
    const [showMore, setShowMore] = useState(!isEmpty(props.txt) && props.txt.length > cutoffNumber
        && props.txt.substring(cutoffNumber).indexOf(" ") > -1);
    const [showLess, setShowLess] = useState(false);

    const toggleShowMore = (e) => {
        stopEvent(e);
        const isShowingMore = showMore;
        setShowMore(!isShowingMore);
        setShowLess(isShowingMore);
    }

    const txtToDisplay = isEmpty(props.txt) ? props.txt : props.txt.substring(0, cutoffNumber + props.txt.substring(cutoffNumber).indexOf(" "));
    return (
        <span className="sds--more-less-toggle">
            {showMore ? txtToDisplay : props.txt}
            {showMore && <a className={"show-more"} href="/more" onClick={toggleShowMore}>
                {props.moreLabel || "More"}
            </a>}
            {showLess &&
                <a className={"show-more"} href="/less" onClick={toggleShowMore}>
                    {props.lessLabel || "Less"}
                </a>}
        </span>
    )
};

export default MoreLessToggle;
