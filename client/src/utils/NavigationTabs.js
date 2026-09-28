export const tabNames = ["home", "about", "applications", "institutions", "stats", "status"];

export const disabledTabNames = new Set(["stats"]);

// Statistics is hidden from the navigation for now (kept in tabNames/disabledTabNames
// so re-enabling it is a one-line change), but the route and page remain in place.
export const hiddenTabNames = new Set(["stats"]);
