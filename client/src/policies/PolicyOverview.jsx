import "./PolicyOverview.scss";
import React from "react";
import {Button, ButtonType} from "@surfnet/sds";
import I18n from "../locale/I18n.js";
import {InfoBlock} from "../components/InfoBlock.jsx";
import {providerOrganizationName} from "../utils/Manage.js";
import {isEmpty} from "../utils/Utils.js";

export const PolicyOverview = ({serviceProvider,policies, backToAccess, newPolicy}) => {

    return (
        <div className="policy-overview-container">
            <div className="policy-overview">
                <a href="/#" onClick={e => backToAccess(e)}>{I18n.t("appAccess.backToAccess")}</a>
                <div className="grouped">
                    <h2>{I18n.t("appAccess.authorizationRules")}</h2>
                    <Button type={ButtonType.Primary}
                            onClick={() => newPolicy(true)}
                            txt={I18n.t("forms.new")}/>
                </div>
                <InfoBlock className="light-grey" >
                    <div>
                        <h3>{I18n.t("appAccess.users", {name: providerOrganizationName(I18n.locale, serviceProvider)})}</h3>
                        <p>{I18n.t("appAccess.config")}</p>
                    </div>
                    {isEmpty(policies) && <>
                        <div className="access-card grey border">
                            {I18n.t("appAccess.noPolicies")}
                        </div>
                    </>}
                    {!isEmpty(policies) && <>
                        {policies.map((policy, index) =>
                            <div key={index} className="access-card large">
                                {policy.data.name}

                            </div>)}

                    </>}
                </InfoBlock>
            </div>
        </div>
    );
}
