import {expect, test} from 'vitest'
import {authorities} from "../../utils/Permissions.js";
import {showContractRequiredBanner} from "../../utils/Organization.js";

const serviceProvider = {id: 1, manageIdentifier: null, contractSigned: false, contractRequested: false};
const institution = {...serviceProvider, id: 2, manageIdentifier: "7"};

const user = (organization, authority) => ({
    id: 1,
    superUser: false,
    organizationMemberships: [{organization: organization, authority: authority}]
});

test("Contract banner for the admin of a service provider without a contract", () => {
    expect(showContractRequiredBanner(user(serviceProvider, authorities.ADMIN), serviceProvider)).toBe(true);
});

test("No contract banner for a member or a guest", () => {
    expect(showContractRequiredBanner(user(serviceProvider, authorities.MEMBER), serviceProvider)).toBe(false);
    expect(showContractRequiredBanner(user(serviceProvider, authorities.GUEST), serviceProvider)).toBe(false);
});

test("No contract banner for an institution", () => {
    expect(showContractRequiredBanner(user(institution, authorities.ADMIN), institution)).toBe(false);
});

test("No contract banner when the contract is requested or signed", () => {
    const requested = {...serviceProvider, contractRequested: true};
    const signed = {...serviceProvider, contractSigned: true};
    expect(showContractRequiredBanner(user(requested, authorities.ADMIN), requested)).toBe(false);
    expect(showContractRequiredBanner(user(signed, authorities.ADMIN), signed)).toBe(false);
});

test("No contract banner without an organization", () => {
    expect(showContractRequiredBanner(user(serviceProvider, authorities.ADMIN), null)).toBe(false);
});
