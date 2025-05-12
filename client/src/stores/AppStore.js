import {create} from 'zustand'

export const useAppStore = create(set => ({
    user: {},
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
    //[{path: "/roles/4", value: role.name}]
    breadcrumbPath: [],
    //[ "home", "applications", "teams"]
    menuItems: [],
    //ShareWorks
    organization: ""
}));
