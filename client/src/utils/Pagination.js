import {isEmpty} from "./Utils";
import {getParameterByName} from "./QueryParameters.js";

export const pageCount = 10;

//https://gist.github.com/kottenator/9d936eb3e4e3c3e02598
export const pageRangeWithDots = (page, totalResults) => {
    const delta = 2,
        left = page - delta,
        right = page + delta + 1,
        range = [],
        rangeWithDots = [];
    let l;

    for (let i = 1; i <= totalResults; i++) {
        if (i === 1 || i === totalResults || (i >= left && i < right)) {
            range.push(i);
        }
    }

    for (const i of range) {
        if (l) {
            if (i - l === 2) {
                rangeWithDots.push(l + 1);
            } else if (i - l !== 1) {
                rangeWithDots.push("...");
            }
        }
        rangeWithDots.push(i);
        l = i;
    }
    return rangeWithDots;
}

export const paginationQueryParams = (page, queryParams = {}) => {
    if (!isEmpty(page)) {
        if (!isEmpty(page.query)) {
            queryParams.query = encodeURIComponent(page.query);
        }
        if (!isEmpty(page.pageNumber)) {
            queryParams.pageNumber = page.pageNumber;
        }
        if (!isEmpty(page.pageSize)) {
            queryParams.pageSize = page.pageSize;
        }
        if (!isEmpty(page.sort)) {
            queryParams.sort = page.sort;
        }
        if (!isEmpty(page.sortDirection)) {
            queryParams.sortDirection = page.sortDirection;
        }
        if (!isEmpty(page.roleId)) {
            queryParams.roleId = encodeURIComponent(page.roleId);
        }
    }
    return Object.entries(queryParams).reduce((acc, entry) => {
        acc += `${entry[0]}=${encodeURIComponent(entry[1])}&`
        return acc;
    }, "");
}

export const defaultPagination = (sort = "name", sortDirection = "ASC") => {
    const dp = {
        query: "",
        pageNumber: 0,
        pageSize: pageCount,
        sort: sort,
        sortDirection: sortDirection
    };
    return dp;
}

export const storePageNumber = nbr => {
    const url = new URL(window.location);
    url.searchParams.set("page", nbr);
    window.history.pushState({page: nbr}, "", url);
}

export const storeQueryParameter = (name, value) => {
    const url = new URL(window.location);
    url.searchParams.set(name, value);
    window.history.pushState({[name]: value}, "", url);
}

export const pageNumberFromQueryParams = () => {
    const nbr = getParameterByName("page", window.location.search) || 1;
    return parseInt(nbr, 10);
}

export const valueFromQueryParams = (name, defaultValue) => {
    const val = getParameterByName(name, window.location.search) || defaultValue;
    return val;
}
