const formatValue = val => {
    return JSON.stringify(val);
}

const translateKey = key => {
    //TODO Lookup translation
    return key;
}

const translateAction = action => {
    //TODO Lookup translation
    return action;
}

const formatChange = change => {
    const label = change.path.map((k) => translateKey(k)).join(" → ");
    switch (change.type) {
        case "added":
            return `${label}: ${translateAction("added")} → ${formatValue(change.newValue)}`;
        case "removed":
            return `${label}: ${translateAction("removed")} (was ${formatValue(change.oldValue)})`;
        case "changed":
            return `${label}: ${translateAction("changed")} from ${formatValue(change.oldValue)} to ${formatValue(change.newValue)}`;
        case "array_added":
            return `${label}: ${translateAction("array_added")} → ${formatValue(change.newValue)}`;
        case "array_removed":
            return `${label}: ${translateAction("array_removed")} (was ${formatValue(change.oldValue)})`;
        case "array_changed":
            return `${label}: ${translateAction("array_changed")} ${formatValue(change.oldValue)} to ${formatValue(change.newValue)}`;
    }
}


const extractChanges = (delta, path = [], changes = []) => {
    if (typeof delta !== "object" || delta === null) {
        return changes;
    }

    const isArrayDiff = delta._t === "a";

    for (const key in delta) {
        if (key === "_t") {
            continue;
        }

        const currentPath = [...path, key];
        const value = delta[key];

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

        // Handle normal value diffs
        if (Array.isArray(value)) {
            if (value.length === 1) {
                changes.push({path: currentPath, type: "added", newValue: value[0]});
            } else if (value.length === 2) {
                changes.push({
                    path: currentPath,
                    type: "changed",
                    oldValue: value[0],
                    newValue: value[1],
                });
            } else if (value.length === 3 && value[2] === 0) {
                changes.push({path: currentPath, type: "removed", oldValue: value[0]});
            }
        } else if (typeof value === "object") {
            extractChanges(value, currentPath, changes);
        }
    }

    return changes;
}

export const deltaToText = delta => {
    const changes = extractChanges(delta);
    return changes.map(change => formatChange(change));
}
