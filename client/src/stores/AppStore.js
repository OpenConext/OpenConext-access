import {create} from 'zustand'

export const useAppStore = create(set => ({
    user: {},
    csrfToken: null,
    startImpersonation: otherUser => {
        set(state => ({impersonator: state.user, user: otherUser}));
    },
    stopImpersonation: () => {
        set(state => ({impersonator: null, user: state.impersonator}));
    },
    flash: {msg: "", className: "hide", type: "info"},
    setFlash: (message, type) => {
        set({flash: {msg: message, type: type || "info"}});
        if (!type || type === "info") {
            setTimeout(() => set({flash: {}}), 5000);
        }
    },
    clearFlash: () => set({flash: {}}),
    config: {
        baseUrl: "http://localhost:3000"
    },
    /*
     * [{path: "/roles/4", value: role.name, menuItemName: "yourApps"}] - the menuItemName is optional, but must be
     * specified if the breadcrumb link corresponds with a menu item in the SharedMenu. Otherwise, URL and active
     * menuitem are not synced
     */
    breadcrumbPaths: [],
    //users
    activeMenuItem: "yourApps",
    //[ "home", "applications", "teams"]
    menuItems: [],
    //{name: "ShareWorks"}
    currentOrganization: {name: ""}
}));
