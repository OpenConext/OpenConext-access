// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, it} from "vitest";
import I18n from "../../locale/I18n";
import {inviteRoleHref, inviteRolesHref, withCrossAppParams} from "../../utils/MenuItems.js";

let locale;
beforeEach(() => {
    locale = I18n.locale;
    I18n.locale = "nl";
});
afterEach(() => {
    I18n.locale = locale;
});

describe("Invite hrefs", () => {
    const sameTab = {invite: "http://invite.example.com", inviteSameTab: true};

    it("carries the organization to Invite", () => {
        expect(inviteRolesHref(sameTab, 7)).toBe("http://invite.example.com/roles/home/roles?organizationId=7&lang=nl");
        expect(inviteRoleHref(sameTab, 3, 7)).toBe("http://invite.example.com/roles/roles/3?organizationId=7&lang=nl");
    });

    it("accepts a configured url with the old or new Invite path", () => {
        ["/home/roles", "/roles/home/roles", "/roles/home/roles/", ""].forEach(path =>
            expect(inviteRoleHref({invite: `http://invite.example.com${path}`, inviteSameTab: true}, 3))
                .toBe("http://invite.example.com/roles/roles/3?lang=nl"));
    });

    it("omits the organization when unknown", () => {
        expect(inviteRolesHref(sameTab)).toBe("http://invite.example.com/roles/home/roles?lang=nl");
    });

    it("keeps the internal path when Invite is not opened in the same tab", () => {
        expect(inviteRolesHref({invite: "http://invite.example.com"}, 7)).toBe("/external/invite");
    });
});

describe("withCrossAppParams", () => {
    it("adds the organization and the language", () => {
        expect(withCrossAppParams("http://invite.example.com/roles/role/new", 7))
            .toBe("http://invite.example.com/roles/role/new?organizationId=7&lang=nl");
    });

    it("encodes the organization and appends to an existing query", () => {
        expect(withCrossAppParams("http://invite.example.com/x?a=1", "a b"))
            .toBe("http://invite.example.com/x?a=1&organizationId=a+b&lang=nl");
    });

    it("carries the current language", () => {
        I18n.locale = "en";
        expect(withCrossAppParams("http://invite.example.com/x")).toBe("http://invite.example.com/x?lang=en");
    });
});
