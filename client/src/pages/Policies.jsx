import React, {useEffect, useMemo, useRef, useState} from "react";
import {useAppStore} from "../stores/AppStore";
import {Navigate, useNavigate, useParams} from "react-router";
import {getPolicyByIdentityProvider, getServiceProvidersAllowed} from "../api/index.js";
import {isEmpty, sanitize} from "../utils/Utils.js";
import "./Policies.scss";
import I18n from "../locale/I18n";
import {authorities} from "../utils/Permissions.js";
import {Button, Spinner} from "@surfnet/curve-react";
import {useShallow} from "zustand/react/shallow";
import {groupByValues, policyTemplateRegular, policyTemplateStepUp, policyTypes} from "../utils/Policy.js";
import {PolicyForm} from "../policies/PolicyForm.jsx";
import {PolicyOverview} from "../policies/PolicyOverview.jsx";
import {mainMenuItems} from "../utils/MenuItems.js";
import {providerName} from "../utils/Manage.js";
import SelectField from "../components/SelectField.jsx";
import {SearchField} from "../components/SearchField.jsx";


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
    const [selectedPolicyType, setSelectedPolicyType] = useState(null);
    const [policyQuery, setPolicyQuery] = useState("");
    const [returnToApplication, setReturnToApplication] = useState(null);
    const initialEntityId = useRef(null);

    const navigate = useNavigate();

    const policyTypeOptions = [
        {value: policyTypes.reg, label: I18n.t("policies.policyChoices.regTitle")},
        {value: policyTypes.step, label: I18n.t("policies.policyChoices.stepTitle")},
    ];

    const adminUser = useMemo(() => {
        return user.superUser || (user.organizationMemberships
                .some(om => om.authority === authorities.ADMIN && om.organization.id === currentOrganization.id)
            && !isEmpty(currentOrganization.manageIdentifier));
    }, [user, currentOrganization]);

    //The URL is the source of truth for which view is shown, so the browser back button and the breadcrumb work.
    const toPolicyDetail = policyIdentifier => navigate(`/policies/details/${policyIdentifier}`);

    const openPolicyDetail = (policyIdentifier, allPolicies = policies, serviceProviderEntityId = null) => {
        setShowPolicyOverview(false);
        let newCurrentPolicy;
        if (policyIdentifier === "reg" || policyIdentifier === "step") {
            newCurrentPolicy = policyIdentifier === "step" ? policyTemplateStepUp(currentOrganization.identityProvider.data.entityid, serviceProviderEntityId) :
                policyTemplateRegular(currentOrganization.identityProvider.data.entityid, serviceProviderEntityId);
        } else {
            const existingPolicy = allPolicies.find(policy => policy.id === policyIdentifier);
            //Clone, the form regroups the attributes and the overview list must keep the original shape
            newCurrentPolicy = isEmpty(existingPolicy) ? existingPolicy : structuredClone(existingPolicy);
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
    }

    useEffect(() => {
        Promise.all([
            getPolicyByIdentityProvider(currentOrganization.id),
            getServiceProvidersAllowed(currentOrganization.id)
        ]).then(res => {
            setPolicies(res[0].sort((p1, p2)=> p1.data.name.toLowerCase().localeCompare(p2.data.name)));
            setServiceProviders(res[1].sort((p1, p2)=> p1.data.metaDataFields["name:en"].toLowerCase().localeCompare(p2.data.metaDataFields["name:en"])));
            const urlSearchParams = new URLSearchParams(window.location.search);
            const returnManageType = urlSearchParams.get("manageType");
            const returnManageId = urlSearchParams.get("manageId");
            if (!isEmpty(returnManageType) && !isEmpty(returnManageId)) {
                setReturnToApplication({
                    manageType: returnManageType,
                    manageId: returnManageId,
                    appName: urlSearchParams.get("appName")
                });
            }
            initialEntityId.current = urlSearchParams.get("entityId");
            const options = res[1].map(sp => ({
                label: providerName(I18n.locale, sp),
                value: sp.data.entityid
            }));
            setServiceProviderOptions(options);
            const service = urlSearchParams.get("service");
            setSelectedServiceProviders(isEmpty(service) ? [] : [options.find(option => option.value === service)]);
            setLoading(false);
        }).catch(() => {
            navigate("/home")
        });

    }, []);// eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (loading) {
            return;
        }
        const isDetail = page === "details" && !isEmpty(policyId);
        if (isDetail) {
            openPolicyDetail(policyId, policies, initialEntityId.current);
            initialEntityId.current = null;
        } else {
            setShowPolicyDetails(false);
            setShowPolicyOverview(true);
        }
        const rulesCrumb = {path: "/policies/overview", value: I18n.t("navigation.policies"), menuItemName: mainMenuItems.policies};
        useAppStore.setState({
            breadcrumbPaths: [
                {path: "/home", value: I18n.t("breadCrumb.access"), menuItemName: mainMenuItems.home},
                isDetail ? rulesCrumb : {value: I18n.t("navigation.policies")},
                isDetail ? {value: policyId === "step" ? I18n.t("appAccess.newStepUpPolicy") : policyId === "reg" ? I18n.t("appAccess.newPolicy") :
                    (policies.find(policy => policy.id === policyId)?.data?.name || I18n.t("appAccess.editPolicy"))} : null
            ].filter(crumb => crumb !== null)
        });
    }, [loading, page, policyId]);// eslint-disable-line react-hooks/exhaustive-deps

    if (!adminUser) {
        return <Navigate to={"/404"} replace/>;
    }

    if (loading) {
        return <div className="loading-container"><Spinner className="size-8"/></div>
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

    const addNewPolicy = () => {
        const newPolicyType = selectedPolicyType ? selectedPolicyType.value : policyTypes.reg;
        toPolicyDetail(newPolicyType);
    }

    const filteredPolicies = policies
        .filter(policy => isEmpty(selectedServiceProviders) || policy.data.serviceProviderIds
            .some(sp => selectedServiceProviders.some(sel => sp.name === sel.value)))
        .filter(policy => isEmpty(selectedPolicyType) || policy.data.type === selectedPolicyType.value)
        .filter(policy => isEmpty(policyQuery.trim()) ||
            `${policy.data.name} ${policy.data.description}`.toLowerCase().includes(policyQuery.trim().toLowerCase()));

    return (
        <div className="policies-outer-container">
            {!showPolicyDetails && <div className="policies-header-container">
                <div className="top-header">
                    <h1 className="text-[length:var(--text-2xl-font-size)]">{I18n.t("policies.title", {name: currentOrganization.name})}</h1>
                    <p>{I18n.t("policies.subTitle")}</p>
                </div>
                <div className="policies-filters">
                    <div className="filters">
                        <SelectField value={selectedServiceProviders}
                                     searchable={true}
                                     options={serviceProviderOptions}
                                     placeholder={I18n.t("policies.serviceProvidersPlaceholder")}
                                     onChange={val => setSelectedServiceProviders(val)}
                                     isMulti={true}
                                     clearable={true}/>
                        <SearchField value={policyQuery}
                                     onChange={e => setPolicyQuery(e.target.value)}
                                     placeholder={I18n.t("policies.searchPlaceholder")}/>
                        <SelectField value={selectedPolicyType}
                                     options={policyTypeOptions}
                                     placeholder={I18n.t("policies.policyTypesPlaceholder")}
                                     onChange={val => setSelectedPolicyType(val)}
                                     clearable={true}/>
                    </div>
                    <Button onClick={addNewPolicy}>
                        <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("policies.newPolicy"))}}/>
                    </Button>
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
                                    returnToApplication={returnToApplication}
                        />
                    }
                    {showPolicyOverview &&
                        <PolicyOverview
                            policies={filteredPolicies}
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
