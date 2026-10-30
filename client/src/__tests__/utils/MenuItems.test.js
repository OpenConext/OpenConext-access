import {describe, expect, it} from "vitest";
import {inviteRoleHref, inviteRolesHref} from "../../utils/MenuItems.js";

describe("Invite hrefs", () => {
    const sameTab = {invite: "http://invite.example.com", inviteSameTab: true};

    it("carries the organization to Invite", () => {
        expect(inviteRolesHref(sameTab, 7)).toBe("http://invite.example.com/home/roles?organizationId=7");
        expect(inviteRoleHref(sameTab, 3, 7)).toBe("http://invite.example.com/roles/3?organizationId=7");
    });

    it("omits the organization when unknown", () => {
        expect(inviteRolesHref(sameTab)).toBe("http://invite.example.com/home/roles");
    });

    it("keeps the internal path when Invite is not opened in the same tab", () => {
        expect(inviteRolesHref({invite: "http://invite.example.com"}, 7)).toBe("/external/invite");
    });
});
