import React from "react";
import PolicyAttributeHelp from "./PolicyAttributeHelp.jsx";
import AttributeHelp, {hasAttributeHelp} from "./AttributeHelp.jsx";

const ATTRIBUTE_PREFIX = "attribute.";
export const POLICY_ATTRIBUTES_HELP = "policy.attributes";

//Maps the logical identifier passed to <HelpIcon id="..."/> to the help content. Attribute help is identified
//as "attribute.<ARP attribute name>". Returns null when there is no help for the identifier.
export const getHelpContent = id => {
    if (id === POLICY_ATTRIBUTES_HELP) {
        return <PolicyAttributeHelp/>;
    }
    if (id?.startsWith(ATTRIBUTE_PREFIX)) {
        const name = id.substring(ATTRIBUTE_PREFIX.length);
        return hasAttributeHelp(name) ? <AttributeHelp name={name}/> : null;
    }
    return null;
}
