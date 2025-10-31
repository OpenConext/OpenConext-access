import {expect, test} from 'vitest'
import {emailPlaceholder} from "../../utils/Forms.js";

test("Test email placeholder", () => {
    expect(emailPlaceholder("info", "ACME B.V.", "or")).toEqual("info@acme-b-v.nl or https://acme-b-v.nl/info");
    expect(emailPlaceholder("support", "Café de L'Étoile", "or")).toEqual("support@cafe-de-l-etoile.nl or https://cafe-de-l-etoile.nl/support");
    expect(emailPlaceholder("info", "My Group Holding", "or")).toEqual("info@my-group-holding.nl or https://my-group-holding.nl/info");
});
