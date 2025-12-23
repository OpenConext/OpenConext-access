import {isEmpty} from "./Utils.js";

export function replaceQueryParameter(windowLocationSearch, name, value) {
    const urlSearchParams = new URLSearchParams(windowLocationSearch);
    urlSearchParams.set(name, value);
    return "?" + urlSearchParams.toString();
}

export function getParameterByName(name, windowLocationSearch) {
    const urlSearchParams = new URLSearchParams(windowLocationSearch);
    return urlSearchParams.get(name);
}


export function dictToQueryString(params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (!isEmpty(value)) {
            if (Array.isArray(value)) {
                value.forEach(v => searchParams.append(key, v));
            } else {
                searchParams.append(key, value);
            }
        }
    });
    return searchParams.toString();
}