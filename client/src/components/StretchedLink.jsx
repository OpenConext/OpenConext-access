import React from "react";
import {Link} from "react-router";

export const StretchedLink = ({to, onClick, ...rest}) => (
    <Link to={to} className="stretched-link" onClick={onClick} {...rest}/>
);

export default StretchedLink;
