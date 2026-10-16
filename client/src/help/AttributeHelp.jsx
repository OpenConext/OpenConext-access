import React from "react";
import I18n from "../locale/I18n";
import {useAppStore} from "../stores/AppStore.js";
import {isEmpty} from "../utils/Utils.js";

const translation = (name, key) => I18n.t(`help.attributes.${name}.${key}`, {defaultValue: ""});

export const hasAttributeHelp = name => !isEmpty(translation(name, "description"));

//Generic help content for an attribute. The urn, example and friendly name come from the ARP metadata, the
//remaining documentation from the help.attributes.<name> locale section
const AttributeHelp = ({name}) => {
    const attributes = useAppStore(state => state.arp.attributes) || [];
    const attribute = attributes.find(attr => attr.name === name) || {};
    const rows = [
        [attribute.urn?.startsWith("urn:mace") ? "urn:mace" : "urn", attribute.urn],
        ["urn:oid", translation(name, "urnOid") && `urn:oid:${translation(name, "urnOid")}`],
        [I18n.t("help.table.multiplicity"), I18n.t(`help.table.${translation(name, "multiplicity")}`, {defaultValue: ""})],
        [I18n.t("help.table.description"), translation(name, "description")],
        [I18n.t("help.table.examples"), translation(name, "examples") || attribute.example],
        [I18n.t("help.table.notes"), translation(name, "notes"), true],
    ].filter(([, value]) => !isEmpty(value));

    return (
        <>
            <h4>{attribute.friendlyNames?.[I18n.locale] || name}</h4>
            <table>
                <thead>
                <tr>
                    <th>{I18n.t("help.table.detail")}</th>
                    <th>{I18n.t("help.table.explanation")}</th>
                </tr>
                </thead>
                <tbody>
                {rows.map(([label, value, list]) => <tr key={label}>
                    <td>{label}</td>
                    <td>{list ? <ul>
                        <li>{value}</li>
                    </ul> : value.split("\n").map((line, i) => <div key={i}>{line}</div>)}</td>
                </tr>)}
                </tbody>
            </table>
        </>
    );
}

export default AttributeHelp;
