import {expect, test} from 'vitest'
import {emailPlaceholder} from "../../utils/Forms.js";

test("Test email placeholder", () => {
    expect(emailPlaceholder("info", "ACME B.V.")).toEqual("info@acme.nl");
    expect(emailPlaceholder("support", "Café de L'Étoile")).toEqual("support@cafe-de-letoile.nl");
    expect(emailPlaceholder("info", "My Group Holding")).toEqual("info@my-group.nl");
});
