import {create} from 'zustand'

const DARK_KEY = "darkMode";

const darkQuery = typeof window !== "undefined" && window.matchMedia ?
    window.matchMedia("(prefers-color-scheme: dark)") : null;

const storedDark = () => {
    try {
        const value = localStorage.getItem(DARK_KEY);
        return value === null ? null : value === "true";
    } catch {
        return null;
    }
};

// An explicit choice wins, otherwise follow the OS setting
const readDark = () => {
    const stored = storedDark();
    return stored !== null ? stored : Boolean(darkQuery && darkQuery.matches);
};

const applyDark = dark => document.documentElement.classList.toggle("dark", dark);

export const useAppStore = create(set => ({
    dark: readDark(),
    toggleDark: () => set(state => {
        const dark = !state.dark;
        try {
            localStorage.setItem(DARK_KEY, String(dark));
        } catch {
            // storage unavailable, the preference just isn't remembered
        }
        applyDark(dark);
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


applyDark(useAppStore.getState().dark);

// Follow live OS changes until the user has made an explicit choice
if (darkQuery) {
    darkQuery.addEventListener("change", e => {
        if (storedDark() === null) {
            applyDark(e.matches);
            useAppStore.setState({dark: e.matches});
        }
    });
}
