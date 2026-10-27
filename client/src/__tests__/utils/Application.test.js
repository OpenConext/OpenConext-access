import {expect, test} from 'vitest'
import {roleApplicationNames} from "../../utils/Application.js";

//Taken from the roles-mine response of SURF Invite
const roleWithUnknownApplication = {
    name: "Harderwijk",
    applicationMaps: [{landingPage: "https://test.com/", policies: [], unknown: true}]
};
const roleWithKnownApplication = {
    name: "Konijn",
    applicationMaps: [{landingPage: "https://test.com", "name:nl": "Test", "name:en": "Test"}]
};

test("Role application names of a known application", () => {
    expect(roleApplicationNames(roleWithKnownApplication, "nl")).toEqual(["Test"]);
});

test("Role application names of an application unknown in Manage fall back to the landing page host", () => {
    expect(roleApplicationNames(roleWithUnknownApplication, "en")).toEqual(["test.com"]);
});

test("Role application names without applications or a usable name", () => {
    expect(roleApplicationNames({name: "Empty"}, "en")).toEqual([]);
    expect(roleApplicationNames({applicationMaps: [{unknown: true, landingPage: "not a url"}]}, "en")).toEqual([]);
});
