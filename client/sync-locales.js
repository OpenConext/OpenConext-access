/**
 * sync-locales.js
 *
 * Standalone script to synchronize en.js and nl.js locale files.
 * - Ensures both files have the same keys in the same order.
 * - Missing keys are copied from the other file with " TODO" appended to string values.
 * - The file with more keys is used as the ordering authority.
 *
 * Note: when changes are needed, the script rewrites the locale files. This
 * normalizes formatting (trailing commas become consistent, multi-line string
 * concatenations are joined, and JS comments inside the object are removed).
 * Review the diff after running and re-add any comments if needed.
 *
 * Usage: node sync-locales.js
 */

import {writeFileSync} from "fs";
import {fileURLToPath} from "url";
import {dirname, join} from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const EN_PATH = join(__dirname, "src/locale/en.js");
const NL_PATH = join(__dirname, "src/locale/nl.js");

// ---------------------------------------------------------------------------
// Parse: import the locale objects from the ESM files
// ---------------------------------------------------------------------------

async function loadLocale(filePath) {
    const module = await import(filePath);
    return module.default;
}

// ---------------------------------------------------------------------------
// Deep-merge: produce a merged object that has all keys from both a and b,
// ordered according to the "authority" (the one with more keys at each level).
// For keys missing in one side, copy the value from the other and mark strings
// with " TODO".
// ---------------------------------------------------------------------------

function allKeys(a, b) {
    const keysA = Object.keys(a || {});
    const keysB = Object.keys(b || {});

    // Use the larger set as the base ordering
    const [primary, secondary] = keysA.length >= keysB.length ? [keysA, keysB] : [keysB, keysA];

    const seen = new Set(primary);
    const result = [...primary];

    // Insert secondary-only keys after the nearest preceding shared key
    for (let i = 0; i < secondary.length; i++) {
        const key = secondary[i];
        if (!seen.has(key)) {
            let insertIdx = result.length;
            for (let j = i - 1; j >= 0; j--) {
                const prevKey = secondary[j];
                const pos = result.indexOf(prevKey);
                if (pos !== -1) {
                    insertIdx = pos + 1;
                    break;
                }
            }
            result.splice(insertIdx, 0, key);
            seen.add(key);
        }
    }
    return result;
}

function markTodo(value) {
    if (typeof value === "string") {
        return value + " TODO";
    }
    if (Array.isArray(value)) {
        return value.map(v => markTodo(v));
    }
    if (typeof value === "object" && value !== null) {
        const result = {};
        for (const key of Object.keys(value)) {
            result[key] = markTodo(value[key]);
        }
        return result;
    }
    return value;
}

function mergeLocales(a, b) {
    const keys = allKeys(a, b);
    const mergedA = {};
    const mergedB = {};

    for (const key of keys) {
        const inA = a != null && key in a;
        const inB = b != null && key in b;

        if (inA && inB) {
            if (typeof a[key] === "object" && !Array.isArray(a[key]) &&
                typeof b[key] === "object" && !Array.isArray(b[key])) {
                const [subA, subB] = mergeLocales(a[key], b[key]);
                mergedA[key] = subA;
                mergedB[key] = subB;
            } else {
                mergedA[key] = a[key];
                mergedB[key] = b[key];
            }
        } else if (inA && !inB) {
            mergedA[key] = a[key];
            mergedB[key] = markTodo(a[key]);
        } else {
            mergedA[key] = markTodo(b[key]);
            mergedB[key] = b[key];
        }
    }
    return [mergedA, mergedB];
}

// ---------------------------------------------------------------------------
// Serialize: write the locale object back to a .js file
// Produces output with trailing commas on every property (matching project style).
// ---------------------------------------------------------------------------

function escapeString(value) {
    return value
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"')
        .replace(/\n/g, "\\n");
}

function serializeValue(value, indent) {
    if (typeof value === "string") {
        return `"${escapeString(value)}"`;
    }
    if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }
    if (Array.isArray(value)) {
        if (value.length === 0) return "[]";
        const inner = indent + "    ";
        const items = value.map(v => `${inner}${serializeValue(v, inner)}`);
        return `[\n${items.join(",\n")}\n${indent}]`;
    }
    if (typeof value === "object" && value !== null) {
        return serializeObject(value, indent);
    }
    return String(value);
}

function serializeObject(obj, indent) {
    const entries = Object.keys(obj);
    if (entries.length === 0) return "{}";

    const inner = indent + "    ";
    const lines = entries.map(key => {
        const val = serializeValue(obj[key], inner);
        // Use unquoted key if it's a valid JS identifier, otherwise quote it
        const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `"${key}"`;
        return `${inner}${safeKey}: ${val},`;
    });
    return `{\n${lines.join("\n")}\n${indent}}`;
}

function generateFile(varName, obj) {
    const body = serializeObject(obj, "");
    return `const ${varName} = ${body}\n\nexport default ${varName};\n`;
}

// ---------------------------------------------------------------------------
// Diff reporting
// ---------------------------------------------------------------------------

function collectKeys(obj, prefix = "") {
    const keys = [];
    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
        for (const key of Object.keys(obj)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            keys.push(fullKey);
            if (typeof obj[key] === "object" && !Array.isArray(obj[key]) && obj[key] !== null) {
                keys.push(...collectKeys(obj[key], fullKey));
            }
        }
    }
    return keys;
}

function findMissing(source, target, prefix = "") {
    const missing = [];
    if (source && typeof source === "object" && !Array.isArray(source)) {
        for (const key of Object.keys(source)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            if (target == null || !(key in target)) {
                missing.push(fullKey);
            } else if (typeof source[key] === "object" && !Array.isArray(source[key])) {
                missing.push(...findMissing(source[key], target[key], fullKey));
            }
        }
    }
    return missing;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    console.log("Loading locale files...");
    const en = await loadLocale(EN_PATH);
    const nl = await loadLocale(NL_PATH);

    // Report what's missing
    const missingInNl = findMissing(en, nl);
    const missingInEn = findMissing(nl, en);

    if (missingInNl.length === 0 && missingInEn.length === 0) {
        // Check ordering
        const enKeys = collectKeys(en);
        const nlKeys = collectKeys(nl);
        const positionalMismatches = enKeys.filter((item, index) => nlKeys[index] !== item);
        if (positionalMismatches.length === 0) {
            console.log("Locale files are already in sync. No changes needed.");
            return;
        }
        console.log(`Key ordering differs at ${positionalMismatches.length} position(s). Reordering...`);
    } else {
        if (missingInNl.length > 0) {
            console.log(`\nKeys missing in nl.js (${missingInNl.length}):`);
            missingInNl.forEach(k => console.log(`  + ${k}`));
        }
        if (missingInEn.length > 0) {
            console.log(`\nKeys missing in en.js (${missingInEn.length}):`);
            missingInEn.forEach(k => console.log(`  + ${k}`));
        }
    }

    // Merge
    const [mergedEn, mergedNl] = mergeLocales(en, nl);

    // Write
    const enContent = generateFile("en", mergedEn);
    const nlContent = generateFile("nl", mergedNl);

    writeFileSync(EN_PATH, enContent, "utf-8");
    writeFileSync(NL_PATH, nlContent, "utf-8");

    console.log("\nLocale files synchronized successfully.");
    console.log("Search for ' TODO' in the locale files to find values that need translation.");
}

main().catch(err => {
    console.error("Error:", err);
});
