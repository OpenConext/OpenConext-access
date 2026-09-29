import "./PolicyOverview.scss";
import "../styles/access_card.scss";
import React from "react";
import {PolicyCard} from "./PolicyCard.jsx";
import I18n from "../locale/I18n.js";
import {isEmpty, splitListSemantically} from "../utils/Utils.js";

export const PolicyOverview = ({
                                   policies,
                                   currentOrganization,
                                   policyDetails,
                                   selectedServiceProviders,
                                   refreshPolicies,
                                   serviceProviders
                               }) => {

    return (
        <div className="policy-overview-container">
            <div className="policy-overview">
                <p>
                    {I18n.t(`policies.policiesFound${policies.length === 1 ? "Single" : ""}${isEmpty(selectedServiceProviders) ? "" : "ForServiceProvider"}`,
                        {
                            nbr: policies.length,
                            names: splitListSemantically(selectedServiceProviders.map(sp => sp.label), I18n.t("forms.and"))
                        })}
                </p>
                <div className="policy-list">
                    {isEmpty(policies) &&
                        <div className="access-card grey border">
                            {I18n.t("appAccess.noPoliciesFound")}
                        </div>}
                    {!isEmpty(policies) &&
                        policies.map(policy => <PolicyCard key={policy.id}
                                                       policy={policy}
                                                       serviceProviders={serviceProviders}
                                                       currentOrganization={currentOrganization}
                                                       refreshPolicies={refreshPolicies}
                                                       onEdit={pol => policyDetails(pol.id)}/>)}
                </div>
            </div>
        </div>
    );
}
