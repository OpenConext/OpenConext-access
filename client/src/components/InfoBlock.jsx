import React from "react";

import "./InfoBlock.scss"

export const InfoBlock = ({children, className = ""}) => {

    return (
        <div className={`info-block ${className}`}>
            {children}
        </div>
    );
}
