import React, {useState} from "react";
import ImageNotFound from "../icons/image-not-found.svg";
import {isEmpty} from "../utils/Utils.js";

//The logo is decorative as the application name is always rendered next to it, hence the empty alt
export const AppLogo = ({src, className, Fallback = ImageNotFound}) => {
    //Remember which url failed, so a changed src is retried without needing an effect to reset the state
    const [failedSrc, setFailedSrc] = useState(null);

    if (isEmpty(src) || failedSrc === src) {
        return <Fallback className={className}/>;
    }
    return <img className={className} src={src} alt="" onError={() => setFailedSrc(src)}/>;
}
