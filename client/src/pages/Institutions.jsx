import "./Institutions.scss";
import React, {useEffect, useState} from "react";
import {publicServiceProviders} from "../api/index.js";
import I18n from "../locale/I18n.js";
import {useNavigate} from "react-router-dom";
import {Button, ButtonType, Loader, RadioOptions, RadioOptionsOrientation, Tooltip} from "@surfnet/sds";
import StudentPng from "../icons/student.png";

const Institutions = () => {

        const navigate = useNavigate();

        const [loading, setLoading] = useState(true);
        const [identityProviders, setIdentityProviders] = useState([]);

        useEffect(() => {
            publicServiceProviders(hash)
                .then(res => {
                    setIdentityProviders(res);
                    setLoading(false);
                })
                .catch(() => {
                    navigate("/404")
                });
        }, []);// eslint-disable-line react-hooks/exhaustive-deps

        if (loading) {
            return <Loader/>
        }

        return (
            <div className="institutions-container">
                <div className="institutions-header">
                    <div className="left">
                        <h1>{I18n.t("institutions.title")}</h1>
                        <p>{I18n.t("institutions.subTitle")}</p>
                    </div>
                    <div className="right">
                        <img src={StudentPng} alt="student"/>
                    </div>
                </div>
                <div className="institutions">
                    <code>{JSON.stringify(identityProviders)}</code>
                </div>
            </div>
        );
    }
;
export default Institutions;