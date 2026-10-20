import "./PolicyAttributeHelp.scss";
import React from "react";
import I18n from "../locale/I18n";
import {useAppStore} from "../stores/AppStore.js";
import {isEmpty} from "../utils/Utils.js";

//Maps the value of an allowed attribute to its key in the help.policyAttributes locale section
const KEYS = {
    "urn:mace:terena.org:attribute-def:schacHomeOrganization": "schacHomeOrganization",
    "urn:mace:terena.org:attribute-def:schacHomeOrganizationType": "schacHomeOrganizationType",
    "urn:mace:dir:attribute-def:eduPersonAffiliation": "eduPersonAffiliation",
    "urn:mace:dir:attribute-def:eduPersonScopedAffiliation": "eduPersonScopedAffiliation",
    "urn:mace:dir:attribute-def:eduPersonEntitlement": "eduPersonEntitlement",
    "urn:mace:dir:attribute-def:isMemberOf": "isMemberOf",
    "urn:collab:group:surfteams.nl": "inviteRole",
    "urn:collab:sab:surfnet.nl": "sabRole",
    "urn:mace:dir:attribute-def:mail": "mail",
};

const t = (key, options) => I18n.t(`help.policyAttributes.${key}`, {defaultValue: "", ...options});
const lines = value => value.split("\n").map((line, i) => <div key={i}>{line}</div>);

//Help content listing every attribute that can be used in a policy, based on the allowed attributes
const PolicyAttributeHelp = () => {
    const allowedAttributes = useAppStore(state => state.allowedAttributes) || [];

    return (
        <>
            <p>{t("intro")}</p>
            {allowedAttributes.map(attr => {
                const key = KEYS[attr.value];
                const rows = [
                    [t("table.urn"), attr.value],
                    [t("table.allowed"), key && t(`${key}.allowed`)],
                    [t("table.pattern"), attr.validationRegex],
                    [t("table.examples"), key && t(`${key}.examples`)],
                    [t("table.deny"), t(attr.allowedInDenyRule ? "table.yes" : "table.no")],
                ].filter(([, value]) => !isEmpty(value));
                return (
                    <section className="policy-attribute-help" key={attr.value}>
                        <h4>{attr.label}</h4>
                        <table>
                            <thead>
                            <tr>
                                <th>{I18n.t("help.table.detail")}</th>
                                <th>{I18n.t("help.table.explanation")}</th>
                            </tr>
                            </thead>
                            <tbody>
                            {rows.map(([label, value]) => <tr key={label}>
                                <td>{label}</td>
                                <td>{lines(value)}</td>
                            </tr>)}
                            </tbody>
                        </table>
                    </section>
                );
            })}
        </>
    );
}

export default PolicyAttributeHelp;
