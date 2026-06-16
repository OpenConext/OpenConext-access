/**
 * find-unused-locales.js
 *
 * Standalone script to detect and remove unused keys in en.js/nl.js.
 * - Scans client/src for every `I18n.t(...)` call.
 * - Resolves static string/ternary keys and dynamic template-literal keys
 *   (e.g. `I18n.t(`navigation.${accessible ? "accessibleApps" : "catalogue"}`)`)
 *   into exact keys or path-matching regexes.
 * - Any locale leaf key that is never referenced is removed.
 * - Calls whose key cannot be statically resolved at all (bare variables,
 *   or template literals whose first segment is itself an interpolation)
 *   are treated as wildcards that mark every key as used, and reported so
 *   they can be manually double-checked.
 *
 * Usage: node find-unused-locales.js
 */

import {readFileSync, writeFileSync, readdirSync, statSync} from "fs";
import {fileURLToPath} from "url";
import {dirname, join, extname} from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SRC_DIR = join(__dirname, "src");
const EN_PATH = join(__dirname, "src/locale/en.js");
const NL_PATH = join(__dirname, "src/locale/nl.js");

// ---------------------------------------------------------------------------
// Locale loading (same approach as sync-locales.js)
// ---------------------------------------------------------------------------

async function loadLocale(filePath) {
    const module = await import(filePath);
    return module.default;
}

function collectLeafKeys(obj, prefix = "") {
    const keys = [];
    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
        for (const key of Object.keys(obj)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            if (typeof obj[key] === "object" && obj[key] !== null && !Array.isArray(obj[key])) {
                keys.push(...collectLeafKeys(obj[key], fullKey));
            } else {
                keys.push(fullKey);
            }
        }
    }
    return keys;
}

function deleteKeyPath(obj, path) {
    const parts = path.split(".");
    const stack = [obj];
    for (let i = 0; i < parts.length - 1; i++) {
        stack.push(stack[i][parts[i]]);
    }
    delete stack[stack.length - 1][parts[parts.length - 1]];
    // Prune now-empty parent objects (but keep top-level locale metadata intact).
    for (let i = stack.length - 2; i >= 0; i--) {
        const parent = stack[i];
        const key = parts[i];
        if (parent[key] && typeof parent[key] === "object" && Object.keys(parent[key]).length === 0) {
            delete parent[key];
        } else {
            break;
        }
    }
}

// ---------------------------------------------------------------------------
// Serialize: write the locale object back to a .js file
// (copied verbatim from sync-locales.js so this script stays self-contained)
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
// Source scanning: find all I18n.t(...) call sites
// ---------------------------------------------------------------------------

function listSourceFiles(dir) {
    const result = [];
    for (const entry of readdirSync(dir)) {
        if (entry === "node_modules" || entry === "dist" || entry === "build") continue;
        const fullPath = join(dir, entry);
        const stats = statSync(fullPath);
        if (stats.isDirectory()) {
            result.push(...listSourceFiles(fullPath));
        } else if ([".js", ".jsx"].includes(extname(entry))) {
            result.push(fullPath);
        }
    }
    return result;
}

// Drop full-line `//` comments so commented-out I18n usages (e.g. a leftover
// `//I18n.translations[...]` debug line) aren't mistaken for live references.
function stripLineComments(source) {
    return source
        .split("\n")
        .map(line => (line.trim().startsWith("//") ? "" : line))
        .join("\n");
}

// Find every `I18n.translations[<locale-expr>]` access and follow the
// subsequent `.identifier` / `["literal"]` chain to build a dotted path
// (e.g. `I18n.translations[I18n.locale].landing.info` -> "landing.info").
// Stops and reports a wildcard prefix once it hits a non-literal `[...]`
// access (e.g. `[menuItem.name]`), since the remaining suffix can't be
// resolved statically.
function extractTranslationsPaths(source) {
    const results = [];
    const startRegex = /I18n\.translations\[[^\]]*\]/g;
    let match;
    while ((match = startRegex.exec(source)) !== null) {
        let i = match.index + match[0].length;
        const segments = [];
        let truncated = false;
        while (i < source.length) {
            if (source[i] === ".") {
                const idMatch = /^\.([a-zA-Z_$][a-zA-Z0-9_$]*)/.exec(source.slice(i));
                if (!idMatch) break;
                // A trailing `.identifier(` is a method call (e.g. `.map(`, `.find(`,
                // `.toUpperCase()`), not a further locale path segment - stop here.
                const afterIdent = source.slice(i + idMatch[0].length).trimStart();
                if (afterIdent.startsWith("(")) break;
                segments.push(idMatch[1]);
                i += idMatch[0].length;
                continue;
            }
            if (source[i] === "[") {
                const litMatch = /^\[(['"])((?:\\.|(?!\1).)*)\1\]/.exec(source.slice(i));
                if (litMatch) {
                    segments.push(litMatch[2]);
                    i += litMatch[0].length;
                    continue;
                }
                truncated = true;
                break;
            }
            break;
        }
        if (segments.length > 0) {
            results.push({path: segments.join("."), truncated});
        }
    }
    return results;
}

// Extract the raw text of the first argument of every `I18n.t(` call in source,
// scanning from the opening paren to its balanced closing paren so that nested
// parens/template literals/strings/regex literals inside the argument don't
// confuse the boundary.
function extractCallArgs(source) {
    const args = [];
    const callRegex = /I18n\.t\(/g;
    let match;
    while ((match = callRegex.exec(source)) !== null) {
        let i = match.index + match[0].length;
        let depth = 1;
        let argEnd = -1;
        let firstArgEnd = -1;
        while (i < source.length) {
            const ch = source[i];
            if (ch === "`") {
                i++;
                while (i < source.length && source[i] !== "`") {
                    if (source[i] === "\\") i++;
                    else if (source[i] === "$" && source[i + 1] === "{") {
                        // skip nested expression inside ${...}, tracking its own depth
                        i += 2;
                        let exprDepth = 1;
                        while (i < source.length && exprDepth > 0) {
                            if (source[i] === "{") exprDepth++;
                            else if (source[i] === "}") exprDepth--;
                            i++;
                        }
                        continue;
                    }
                    i++;
                }
                i++;
                continue;
            }
            if (ch === '"' || ch === "'") {
                const quote = ch;
                i++;
                while (i < source.length && source[i] !== quote) {
                    if (source[i] === "\\") i++;
                    i++;
                }
                i++;
                continue;
            }
            if (ch === "(") {
                depth++;
                i++;
                continue;
            }
            if (ch === ")") {
                depth--;
                i++;
                if (depth === 0) {
                    argEnd = i - 1;
                    break;
                }
                continue;
            }
            if (ch === "," && depth === 1 && firstArgEnd === -1) {
                firstArgEnd = i;
            }
            i++;
        }
        if (argEnd === -1) continue;
        const fullArgs = source.slice(match.index + match[0].length, argEnd);
        const firstArg = firstArgEnd === -1 ? fullArgs : source.slice(match.index + match[0].length, firstArgEnd);
        args.push(firstArg.trim());
    }
    return args;
}

// ---------------------------------------------------------------------------
// Classify each extracted key expression into exact keys / regex patterns
// ---------------------------------------------------------------------------

const STRING_LITERAL_RE = /^(['"])((?:\\.|(?!\1).)*)\1$/;
const TERNARY_OF_STRINGS_RE = /^.+\?\s*(['"])((?:\\.|(?!\1).)*)\1\s*:\s*(['"])((?:\\.|(?!\3).)*)\3$/;

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Convert a backtick-delimited template literal body into a path-matching regex.
// Each ${...} interpolation becomes a single-segment wildcard ([^.]+).
// Returns null if the first segment is wholly an interpolation (unbounded prefix).
// Every ${...} interpolation is assumed to substitute exactly one path
// segment (true for all observed usages, e.g. `${tab.name}`, `${modelName}`).
function templateToRegex(body) {
    const parts = [];
    let i = 0;
    let current = "";
    while (i < body.length) {
        if (body[i] === "$" && body[i + 1] === "{") {
            if (current !== "") {
                parts.push({literal: current});
                current = "";
            }
            i += 2;
            let depth = 1;
            while (i < body.length && depth > 0) {
                if (body[i] === "{") depth++;
                else if (body[i] === "}") depth--;
                if (depth > 0) i++;
            }
            i++; // skip closing }
            parts.push({wildcard: true});
        } else {
            current += body[i];
            i++;
        }
    }
    if (current !== "") parts.push({literal: current});

    // Use `*` (not `+`): a ternary interpolation like `${cond ? "External" : ""}`
    // can resolve to an empty string, so the wildcard must allow zero chars too.
    const regexStr = parts
        .map(p => (p.literal !== undefined ? escapeRegex(p.literal) : "[^.]*"))
        .join("");
    return new RegExp(`^${regexStr}$`);
}

// Key expressions that are impossible to resolve statically (bare variables
// holding a runtime value) but whose value is known from reading the call
// site. `link.locale` is set to "applicationDetail.entityCategory" by the
// `externalLink({locale: "applicationDetail.entityCategory", ...})` call in
// pages/ApplicationDetail.jsx, so I18n.t(link.locale) - and the companion
// `I18n.t(`${link.locale}.${attribute...}`)` template - resolve to that prefix.
const HARDCODED_KEY_PREFIXES = {
    "link.locale": "applicationDetail.entityCategory",
};

function classifyKeyExpression(expr, location, unresolved) {
    if (Object.prototype.hasOwnProperty.call(HARDCODED_KEY_PREFIXES, expr)) {
        const prefix = HARDCODED_KEY_PREFIXES[expr];
        return {type: "regex", value: new RegExp(`^${escapeRegex(prefix)}(\\..+)?$`)};
    }

    const stringMatch = expr.match(STRING_LITERAL_RE);
    if (stringMatch) {
        return {type: "exact", value: stringMatch[2]};
    }

    const ternaryMatch = expr.match(TERNARY_OF_STRINGS_RE);
    if (ternaryMatch) {
        return {type: "exactList", values: [ternaryMatch[2], ternaryMatch[4]]};
    }

    if (expr.startsWith("`") && expr.endsWith("`")) {
        const body = expr.slice(1, -1);
        const regex = templateToRegex(body);
        if (regex) {
            return {type: "regex", value: regex};
        }
        unresolved.push({location, expr, reason: "unbounded dynamic prefix"});
        return {type: "wildcard"};
    }

    unresolved.push({location, expr, reason: "non-literal key expression"});
    return {type: "wildcard"};
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    console.log("Loading locale files...");
    const en = await loadLocale(EN_PATH);
    const nl = await loadLocale(NL_PATH);
    const leafKeys = collectLeafKeys(en);
    console.log(`Found ${leafKeys.length} leaf keys in en.js.`);

    console.log("Scanning client/src for I18n.t( usages...");
    const sourceFiles = listSourceFiles(SRC_DIR);
    const exactKeys = new Set();
    const regexPatterns = [];
    const unresolved = [];

    // Some call sites build the I18n.t() key from a bare variable holding a
    // dotted prefix, e.g. `externalLink({locale: "applicationDetail.entityCategory", ...})`
    // followed elsewhere by `I18n.t(link.locale)` / `I18n.t(\`${link.locale}.x\`)`.
    // Such prefixes can't be tied to a specific I18n.t call statically, so treat
    // everything under them as used rather than flagging false positives.
    const localePropRegex = /\blocale:\s*(['"`])([\w.]+)\1/g;

    for (const file of sourceFiles) {
        const rawSource = readFileSync(file, "utf-8");
        const source = stripLineComments(rawSource);
        const relFile = file.slice(__dirname.length + 1);

        let propMatch;
        while ((propMatch = localePropRegex.exec(source)) !== null) {
            regexPatterns.push(new RegExp(`^${escapeRegex(propMatch[2])}(\\..+)?$`));
        }

        for (const {path, truncated} of extractTranslationsPaths(source)) {
            if (truncated) {
                regexPatterns.push(new RegExp(`^${escapeRegex(path)}(\\..+)?$`));
            } else {
                exactKeys.add(path);
            }
        }

        const argExprs = extractCallArgs(source);
        for (const expr of argExprs) {
            const classification = classifyKeyExpression(expr, relFile, unresolved);
            if (classification.type === "exact") {
                exactKeys.add(classification.value);
            } else if (classification.type === "exactList") {
                classification.values.forEach(v => exactKeys.add(v));
            } else if (classification.type === "regex") {
                regexPatterns.push(classification.value);
            }
            // "wildcard" classifications are unresolvable and only logged below;
            // they do not suppress detection of unrelated unused keys.
        }
    }

    console.log(`Resolved ${exactKeys.size} exact key(s) and ${regexPatterns.length} dynamic pattern(s).`);
    if (unresolved.length > 0) {
        console.log(`\n${unresolved.length} call(s) could not be statically resolved — review manually, their keys are NOT marked as used:`);
        unresolved.forEach(u => console.log(`  ! ${u.location}: I18n.t(${u.expr})  [${u.reason}]`));
    }

    const isUsed = key => {
        if (exactKeys.has(key)) return true;
        return regexPatterns.some(re => re.test(key));
    };

    const unusedKeys = leafKeys.filter(key => !isUsed(key));

    if (unusedKeys.length === 0) {
        console.log("\nNo unused keys found. Nothing to remove.");
        return;
    }

    console.log(`\nRemoving ${unusedKeys.length} unused key(s):`);
    unusedKeys.forEach(k => console.log(`  - ${k}`));

    for (const key of unusedKeys) {
        deleteKeyPath(en, key);
        deleteKeyPath(nl, key);
    }

    writeFileSync(EN_PATH, generateFile("en", en), "utf-8");
    writeFileSync(NL_PATH, generateFile("nl", nl), "utf-8");

    console.log("\nLocale files updated. Run `git diff client/src/locale` to review the removal patch.");
}

main().catch(err => {
    console.error("Error:", err);
});
