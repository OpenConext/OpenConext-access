import "./IdentityProvider.scss";
import React, {useEffect, useState} from "react";
import {useAppStore} from "../stores/AppStore";
import {Loader} from "@surfnet/sds";
import {useNavigate, useParams} from "react-router-dom";
import {organizationById} from "../api/index.js";
import {isEmpty} from "../utils/Utils.js";
import IdentityProvider from "./IdentityProvider.jsx";
import ExternalOrganization from "./ExternalOrganization.jsx";

const MyOrganization = ({refreshUser}) => {
    const {user} = useAppStore(state => state);
    const {organizationId} = useParams();

    const [loading, setLoading] = useState(true);
    const [organization, setOrganization] = useState({});

    const navigate = useNavigate();

    useEffect(() => {
        if (isEmpty(organizationId)) {
            navigate("/home");
        } else {
            organizationById(organizationId)
                .then(res => {
                    setOrganization(res);
                    setLoading(false);
                }).catch(() => {
                navigate("/home")
            });
        }
    }, [navigate, organizationId]);

    if (loading) {
        return <Loader/>
    }
    //TODO, remove
    return (user.externalUser || 1 == 1) ?
        <ExternalOrganization organization={organization} user={user} refreshUser={refreshUser}/> :
        <IdentityProvider organization={organization} user={user}/>

};
export default MyOrganization;