export const createAndClickLink = href => {
    const link = document.createElement("a");
    link.href = href;
    //Also works for mailto:
    link.target = "_blank";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

}

const sanitizeOrganizationName = orgName => {
    return orgName
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
        .replace(/\b(bv|b\.v\.|n\.v\.|inc|ltd)\b/g, "") // remove suffixes
        .replace(/[^a-z0-9-]+/g, "-") // replace invalid chars with dash
        .replace(/-+/g, "-") // collapse multiple dashes
        .replace(/^-|-$/g, "") // trim leading/trailing dashes
        .trim();
}

export const emailPlaceholder = (prefix, orgName, separator) => {
    const domain = sanitizeOrganizationName(orgName);
    return `${prefix}@${domain || "example"}.nl ${separator} https://${domain}.nl/${prefix}`;
}

export const addArrayItem = (arr, index, value) => {
    return [
        ...arr.slice(0, index),
        value,
        ...arr.slice(index)
    ];
}

export const replaceArrayItem = (arr, index, value) => {
    if (index < 0 || index >= arr.length) {
        return arr.slice();
    }
    return [
        ...arr.slice(0, index),
        value,
        ...arr.slice(index + 1)
    ];
}

export const removeArrayItem = (arr, index) => {
    if (index < 0 || index >= arr.length) {
        return arr.slice();
    }
    return [
        ...arr.slice(0, index),
        ...arr.slice(index + 1)
    ];
}
