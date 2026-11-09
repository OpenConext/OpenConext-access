import {describe, expect, it} from "vitest";
import {badgeOf, diffOf, groupByDay, periodRange} from "../../utils/AuditLog.js";

describe("AuditLog", () => {
    it("groups events per local day and keeps the order", () => {
        const events = [
            {id: 1, createdAt: new Date(2026, 10, 9, 11, 42).toISOString()},
            {id: 2, createdAt: new Date(2026, 10, 9, 10, 15).toISOString()},
            {id: 3, createdAt: new Date(2026, 10, 6, 16, 48).toISOString()}
        ];
        const groups = groupByDay(events);
        expect(groups).toHaveLength(2);
        expect(groups[0].key).toBe("2026-11-09");
        expect(groups[0].events.map(e => e.id)).toEqual([1, 2]);
        expect(groups[1].key).toBe("2026-11-06");
    });

    it("returns no groups without events", () => {
        expect(groupByDay([])).toEqual([]);
    });

    it("builds a period ending now", () => {
        const now = new Date("2026-11-09T12:00:00.000Z");
        const {from, to} = periodRange(7, now);
        expect(from).toBe("2026-11-02T12:00:00.000Z");
        expect(new Date(to).getTime()).toBeGreaterThan(now.getTime());
    });

    it("only returns a diff when from and to are present", () => {
        expect(diffOf({details: {from: "MEMBER", to: "GUEST"}})).toEqual({field: undefined, from: "MEMBER", to: "GUEST"});
        expect(diffOf({details: {authority: "ADMIN"}})).toBeNull();
        expect(diffOf({details: null})).toBeNull();
    });

    it("shows the outcome of a closed change request instead of the pending category", () => {
        const submitted = {action: "CHANGE_REQUEST_SUBMITTED", category: "PENDING", status: "APPLIED"};
        expect(badgeOf(submitted)).toEqual({className: "cat-application", labelKey: "auditLog.status.APPLIED"});
        expect(badgeOf({...submitted, status: "PENDING"}))
            .toEqual({className: "cat-pending", labelKey: "auditLog.categories.PENDING"});
        expect(badgeOf({action: "POLICY_CREATED", category: "ACCESS"}))
            .toEqual({className: "cat-access", labelKey: "auditLog.categories.ACCESS"});
    });
});
