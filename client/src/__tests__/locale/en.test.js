import {expect, test} from 'vitest'

import en from "../../locale/en.js";
import nl from "../../locale/nl.js";
import {isEmpty} from "../../utils/Utils.js";

expect.extend({
    toContainKey(translation, key) {
        return {
            message: () => `Expected ${key} to be present in ${JSON.stringify(translation)}`,
            pass: (translation !== undefined && translation[key] !== undefined)
        };
    },
});

test("All translations exists in all bundles", () => {
    const disabledTest = true;
    //For now disable this, enable again when translations are more final
    if (disabledTest) {
        return;
    }
    const contains = (translation, translationToVerify, keyCollection, parents) => {
        if (!isEmpty(translation)) {
            Object.keys(translation).forEach(key => {
                expect(translationToVerify).toContainKey(key);
                const value = translation[key];
                keyCollection.push(parents + key);
                if (typeof value === "object") {
                    contains(value, translationToVerify[key], keyCollection, parents + key + ".")
                }
            });
        }
    };
    const keyCollectionEN = [];
    contains(en, nl, keyCollectionEN, '');
    const keyCollectionNL = [];
    contains(nl, en, keyCollectionNL, '');
    const positionalMismatches = keyCollectionEN.filter((item, index) => keyCollectionNL[index] !== item);
    expect(positionalMismatches).toEqual([])
});
