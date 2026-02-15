import React, {useEffect, useMemo, useState} from "react";
import {useAppStore} from "../stores/AppStore";
import {Navigate, useNavigate, useParams} from "react-router-dom";
import {getPolicyByIdentityProvider} from "../api/index.js";
import {isEmpty} from "../utils/Utils.js";
import "./Policies.scss";
import I18n from "../locale/I18n";
import DOMPurify from "dompurify";
import {authorities} from "../utils/Permissions.js";
import {Loader} from "@surfnet/sds";
import {useShallow} from "zustand/react/shallow";
import {groupByValues, policyTemplate} from "../utils/Policy.js";
import {PolicyForm} from "../policies/PolicyForm.jsx";
import {PolicyOverview} from "../policies/PolicyOverview.jsx";


const Policies = () => {

    const {user, currentOrganization} = useAppStore(useShallow(state => ({
        user: state.user,
        currentOrganization: state.currentOrganization
    })));
    const {page, policyId} = useParams();

    const [loading, setLoading] = useState(true);
    const [policies, setPolicies] = useState({});
    const [showPolicyOverview, setShowPolicyOverview] = useState(true);
    const [showPolicyDetails, setShowPolicyDetails] = useState(false);
    const [currentPolicy, setCurrentPolicy] = useState(null);

    const navigate = useNavigate();

    const adminUser = useMemo(() => {
        return user.superUser || (user.organizationMemberships
                .some(om => om.authority === authorities.ADMIN && om.organization.id === currentOrganization.id)
            && !isEmpty(currentOrganization.manageIdentifier));
    }, [user, currentOrganization]);

    const toPolicyDetail = (policyIdentifier, allPolicies = policies) => {
        setShowPolicyOverview(false);
        let newCurrentPolicy;
        if (policyIdentifier === "new") {
            newCurrentPolicy = policyTemplate(user.identityProvider.data.entityid);
        } else {
            newCurrentPolicy = allPolicies.find(policy => policy.id === policyIdentifier);
            if (isEmpty(newCurrentPolicy)) {
                navigate("/404");
                return;
            }
            newCurrentPolicy.data.attributes = groupByValues([...newCurrentPolicy.data.attributes]);
        }
        window.scrollTo({top: 0, behavior: "smooth"});
        setCurrentPolicy(newCurrentPolicy);
        setShowPolicyDetails(true);
        navigate(`/policies/details/${policyIdentifier}`);
    }

    useEffect(() => {
        getPolicyByIdentityProvider()
            .then(res => {
                setPolicies(res);
                if (page === "details" && !isEmpty(policyId)) {
                    toPolicyDetail(policyId, res);
                }
                setLoading(false);
            }).catch(() => {
            navigate("/home")
        });

    }, []);// eslint-disable-line react-hooks/exhaustive-deps

    if (!adminUser) {
        return <Navigate to={"/404"} replace/>;
    }

    if (loading) {
        return <Loader/>
    }

    const refreshPolicies = () => {
        setLoading(true);
        getPolicyByIdentityProvider()
            .then(res => {
                setPolicies(res);
                navigate("/policies/overview");
                setShowPolicyOverview(true);
                setShowPolicyDetails(false);
                setLoading(false);
            });
    }

    return (
        <div
            className="policies-outer-container">
            <div className="policies-header-container">
                <div className="top-header">
                    <h1>{I18n.t("policies.title", {name: currentOrganization.name})}</h1>
                </div>
                <p dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(I18n.t("myOrganization.info"),
                        {ADD_ATTR: ['target'], ADD_TAGS: ['rel']})
                }}/>
            </div>
            <div className="policies">
                <div className="app-policies">
                    {showPolicyDetails &&
                        <PolicyForm policy={currentPolicy}
                                    setPolicy={setCurrentPolicy}
                                    isExistingPolicy={!isEmpty(currentPolicy.id)}
                                    originalName={currentPolicy.originalName}
                                    refreshPolicies={refreshPolicies}
                        />
                    }
                    {showPolicyOverview &&
                        <PolicyOverview
                            policies={policies}
                            policyDetails={toPolicyDetail}
                            refreshPolicies={refreshPolicies}
                        />
                    }

                </div>

            </div>
        </div>

    )

};
export default Policies;