import React, {useEffect, useMemo, useState} from "react";
import {useAppStore} from "../stores/AppStore";
import {Navigate, useNavigate, useParams} from "react-router";
import {getPolicyByIdentityProvider, getServiceProvidersAllowed} from "../api/index.js";
import {isEmpty} from "../utils/Utils.js";
import "./Policies.scss";
import I18n from "../locale/I18n";
import {authorities} from "../utils/Permissions.js";
import {Loader} from "@surfnet/sds";
import {useShallow} from "zustand/react/shallow";
import {groupByValues, policyTemplateRegular, policyTemplateStepUp, policyTypes} from "../utils/Policy.js";
import {PolicyForm} from "../policies/PolicyForm.jsx";
import {PolicyOverview} from "../policies/PolicyOverview.jsx";
import {mainMenuItems} from "../utils/MenuItems.js";
import {providerName} from "../utils/Manage.js";
import SelectField from "../components/SelectField.jsx";


const Policies = () => {

    const {user, currentOrganization} = useAppStore(useShallow(state => ({
        user: state.user,
        currentOrganization: state.currentOrganization
    })));
    const {page, policyId} = useParams();

    const [loading, setLoading] = useState(true);
    const [policies, setPolicies] = useState({});
    const [serviceProviders, setServiceProviders] = useState({});
    const [showPolicyOverview, setShowPolicyOverview] = useState(true);
    const [showPolicyDetails, setShowPolicyDetails] = useState(false);
    const [currentPolicy, setCurrentPolicy] = useState(null);
    const [serviceProviderOptions, setServiceProviderOptions] = useState([])
    const [selectedServiceProviders, setSelectedServiceProviders] = useState([]);

    const navigate = useNavigate();


    const adminUser = useMemo(() => {
        return user.superUser || (user.organizationMemberships
                .some(om => om.authority === authorities.ADMIN && om.organization.id === currentOrganization.id)
            && !isEmpty(currentOrganization.manageIdentifier));
    }, [user, currentOrganization]);

    const toPolicyDetail = (policyIdentifier, policyType, allPolicies = policies) => {
        setShowPolicyOverview(false);
        let newCurrentPolicy;
        if (policyIdentifier === "reg" || policyIdentifier === "step") {
            newCurrentPolicy = policyIdentifier === "step" ? policyTemplateStepUp(currentOrganization.identityProvider.data.entityid) :
                policyTemplateRegular(currentOrganization.identityProvider.data.entityid);
        } else {
            newCurrentPolicy = allPolicies.find(policy => policy.id === policyIdentifier);
            if (isEmpty(newCurrentPolicy)) {
                navigate("/404");
                return;
            }
            newCurrentPolicy.data.attributes = groupByValues([...newCurrentPolicy.data.attributes]);
            if (newCurrentPolicy.data.type === policyTypes.step && newCurrentPolicy.data.loas && newCurrentPolicy.data.loas.length > 0) {
                newCurrentPolicy.data.loas[0].attributes = groupByValues([...newCurrentPolicy.data.loas[0].attributes]);
            }
            newCurrentPolicy.originalName = newCurrentPolicy.data.name;
        }
        window.scrollTo({top: 0, behavior: "smooth"});
        setCurrentPolicy(newCurrentPolicy);
        setShowPolicyDetails(true);
        navigate(`/policies/details/${policyIdentifier}`);
    }

    useEffect(() => {
        Promise.all([
            getPolicyByIdentityProvider(currentOrganization.id),
            getServiceProvidersAllowed(currentOrganization.id)
        ]).then(res => {
            setPolicies(res[0]);
            setServiceProviders(res[1]);
            if (page === "details" && !isEmpty(policyId)) {
                toPolicyDetail(policyId, null, res[0]);
            }
            useAppStore.setState({
                breadcrumbPaths: [
                    {path: "/home", value: I18n.t("breadCrumb.access"), menuItemName: mainMenuItems.home},
                    {value: I18n.t("navigation.policies")}
                ]
            });
            const options = res[1].map(sp => ({
                label: providerName(I18n.locale, sp),
                value: sp.data.entityid
            }));
            setServiceProviderOptions(options);
            const service = new URLSearchParams(window.location.search).get("service");
            setSelectedServiceProviders(isEmpty(service) ? [] : [options.find(option => option.value === service)]);
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
        getPolicyByIdentityProvider(currentOrganization.id)
            .then(res => {
                setPolicies(res);
                navigate("/policies/overview");
                setShowPolicyOverview(true);
                setShowPolicyDetails(false);
                setLoading(false);
            });
    }

    return (
        <div className="policies-outer-container">
            {!showPolicyDetails && <div className="policies-header-container">
                <div className="top-header">
                    <h2>{I18n.t("policies.title", {name: currentOrganization.name})}</h2>
                    <SelectField value={selectedServiceProviders}
                                 searchable={true}
                                 options={serviceProviderOptions}
                                 placeholder={I18n.t("policies.serviceProvidersPlaceholder")}
                                 onChange={val => setSelectedServiceProviders(val)}
                                 isMulti={true}
                                 clearable={true}/>
                </div>
            </div>}
            <div className="policies">
                <div className="app-policies">
                    {showPolicyDetails &&
                        <PolicyForm policy={currentPolicy}
                                    setPolicy={setCurrentPolicy}
                                    isExistingPolicy={!isEmpty(currentPolicy.id)}
                                    currentOrganization={currentOrganization}
                                    originalName={currentPolicy.originalName}
                                    refreshPolicies={refreshPolicies}
                                    serviceProviderOptions={serviceProviderOptions}
                        />
                    }
                    {showPolicyOverview &&
                        <PolicyOverview
                            policies={isEmpty(selectedServiceProviders) ? policies :
                                policies.filter(policy => policy.data.serviceProviderIds
                                    .some(sp => selectedServiceProviders.some(sel => sp.name === sel.value)))}
                            currentOrganization={currentOrganization}
                            policyDetails={toPolicyDetail}
                            selectedServiceProviders={selectedServiceProviders}
                            refreshPolicies={refreshPolicies}
                            serviceProviders={serviceProviders}
                        />
                    }

                </div>

            </div>
        </div>

    )

};
export default Policies;