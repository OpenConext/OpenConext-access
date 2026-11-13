import {create} from 'zustand'

const DARK_KEY = "darkMode";

const darkQuery = window.matchMedia?.("(prefers-color-scheme: dark)");

const storedDark = () => {
    try {
        return localStorage.getItem(DARK_KEY);
    } catch {
        return null;
    }
};

// An explicit choice wins, otherwise follow the OS setting
const readDark = () => {
    const stored = storedDark();
    return stored === null ? Boolean(darkQuery?.matches) : stored === "true";
};

export const useAppStore = create(set => ({
    dark: readDark(),
    toggleDark: () => set(state => {
        const dark = !state.dark;
        try {
            localStorage.setItem(DARK_KEY, String(dark));
        } catch {
            // storage unavailable, the preference just isn't remembered
        }
        return {dark};
    }),
    user: {},
    impersonator: null,
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
            setTimeout(() => set({flash: {}}), 6500);
        }
    },
    clearFlash: () => set({flash: {}}),
    helpId: null,
    setHelpId: helpId => set({helpId}),
    config: {
        baseUrl: "http://localhost:3000",
        stats: {},
        testEnvironment: false,
        demoLoginOnly: false,
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
    currentOrganization: {name: ""},
    arp: {},
    privacy: [],
    allowedAttributes: []
}));


// The store is the single source of truth, the class on <html> just mirrors it
const applyDark = ({dark}) => document.documentElement.classList.toggle("dark", dark);
applyDark(useAppStore.getState());
useAppStore.subscribe(applyDark);

// Follow live OS changes until the user has made an explicit choice
darkQuery?.addEventListener("change", e => {
    if (storedDark() === null) {
        useAppStore.setState({dark: e.matches});
    }
});
