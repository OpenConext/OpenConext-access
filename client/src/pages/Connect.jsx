import "./Connect.scss";

import React, {useEffect, useRef, useState} from "react";
import {publicIdentityProviders} from "../api/index.js";
import I18n from "../locale/I18n.js";
import {useNavigate} from "react-router-dom";
import {Loader, Pagination} from "@surfnet/sds";
import StudentPng from "../icons/student.png";
import SearchIcon from "@surfnet/sds/icons/functional-icons/search.svg";
import SelectField from "../components/SelectField.jsx";
import {isEmpty} from "../utils/Utils.js";
import {idpName, idpOrganizationName} from "../utils/Manage.js";
import PlaceHolderImage from "@surfnet/sds/icons/placeholder-image.svg";

const Connect = () => {

    

    return (
        <div className="connect-container">
            <div className="connect-header-container">
                <div className="connect-header">
                    <div className="left">
                        <h1 className="large">{I18n.t("connect.title")}</h1>
                        <p>{I18n.t("connect.subTitle")}</p>
                    </div>
                    <img src={StudentPng} alt="student"/>
                </div>
            </div>
            <div className="inner-connect-container">
                <div className="connect">
                    <h2>{I18n.t("connect.howTo")}</h2>
                </div>
            </div>
        </div>
    );


}
export default Connect;