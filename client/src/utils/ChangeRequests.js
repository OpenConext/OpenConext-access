import { create } from "jsondiffpatch";

// 1️⃣ Create a diff instance
const jsondiffpatch = create({
    arrays: { detectMove: true, includeValueOnMove: false },
});

// 2️⃣ Example data
const original = {
    name: "Alice",
    active: true,
    tags: ["user", "admin"],
    profile: { city: "Amsterdam", age: 30 },
};

const updated = {
    name: "Alice B.",
    active: false,
    tags: ["user", "editor"],
    profile: { city: "Rotterdam" },
};

// 3️⃣ Translations
const translations = {
    name: "Naam",
    active: "Actief",
    tags: "Labels",
    profile: "Profiel",
    city: "Stad",
    age: "Leeftijd",
};

// 4️⃣ Compute diff
const delta = jsondiffpatch.diff(original, updated);

// 5️⃣ Extract changes (recursive)
function extractChanges(delta, path = [], changes = []) {
    if (typeof delta !== "object" || delta === null) return changes;

    const isArrayDiff = delta._t === "a";

    for (const key in delta) {
        if (key === "_t") continue;

        const currentPath = [...path, key];
        const value = delta[key];

        // --- Handle arrays ---
        if (isArrayDiff) {
            // key starting with '_' = removal
            if (key.startsWith("_")) {
                const idx = key.substring(1);
                changes.push({
                    path: [...path, idx],
                    type: "array_removed",
                    oldValue: value[0],
                });
            } else if (Array.isArray(value)) {
                if (value.length === 1) {
                    // added
                    changes.push({
                        path: [...path, key],
                        type: "array_added",
                        newValue: value[0],
                    });
                } else if (value.length === 2) {
                    // changed element
                    changes.push({
                        path: [...path, key],
                        type: "array_changed",
                        oldValue: value[0],
                        newValue: value[1],
                    });
                }
            }
            continue;
        }

        // --- Handle normal value diffs ---
        if (Array.isArray(value)) {
            if (value.length === 1) {
                changes.push({ path: currentPath, type: "added", newValue: value[0] });
            } else if (value.length === 2) {
                changes.push({
                    path: currentPath,
                    type: "changed",
                    oldValue: value[0],
                    newValue: value[1],
                });
            } else if (value.length === 3 && value[2] === 0) {
                changes.push({ path: currentPath, type: "removed", oldValue: value[0] });
            }
        } else if (typeof value === "object") {
            extractChanges(value, currentPath, changes);
        }
    }

    return changes;
}

const changes = extractChanges(delta);

function translatePath(path) {
    return path.map((k) => translations[k] ?? k).join(" → ");
}

function formatValue(v) {
    if (typeof v === "boolean") return v ? "ja" : "nee";
    return JSON.stringify(v);
}

function formatChange(change) {
    const label = translatePath(change.path);
    switch (change.type) {
        case "added":
            return `${label}: toegevoegd → ${formatValue(change.newValue)}`;
        case "removed":
            return `${label}: verwijderd (was ${formatValue(change.oldValue)})`;
        case "changed":
            return `${label}: gewijzigd van ${formatValue(change.oldValue)} naar ${formatValue(change.newValue)}`;
        case "array_added":
            return `${label}: toegevoegd in lijst → ${formatValue(change.newValue)}`;
        case "array_removed":
            return `${label}: verwijderd uit lijst (was ${formatValue(change.oldValue)})`;
        case "array_changed":
            return `${label}: element gewijzigd van ${formatValue(change.oldValue)} naar ${formatValue(change.newValue)}`;
    }
}

for (const c of changes) {
    console.log(formatChange(c));
}
