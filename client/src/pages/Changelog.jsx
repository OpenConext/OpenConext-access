import React, {useEffect, useState} from "react";
import ReactMarkdown from "react-markdown";
import {changelog, info} from "../api";
import {useAppStore} from "../stores/AppStore";
import I18n from "../locale/I18n";
import {mainMenuItems} from "../utils/MenuItems.js";
import {formatLongDate} from "../utils/Date.js";
import "./Changelog.scss";

const stripLeadingTitle = lines => {
    const index = lines.findIndex(line => /^#\s+/.test(line));
    return index === -1 ? lines : lines.filter((line, i) => i !== index);
};

const withNoChangesNotices = lines => {
    const result = [];
    lines.forEach((line, i) => {
        result.push(line);
        if (/^##\s+/.test(line)) {
            const sectionLines = [];
            for (let j = i + 1; j < lines.length && !/^##\s+/.test(lines[j]); j++) {
                sectionLines.push(lines[j]);
            }
            const sectionHasContent = sectionLines.some(l => l.trim() !== "");
            if (!sectionHasContent) {
                result.push("");
                result.push(`_${I18n.t("changelog.noChanges")}_`);
            }
        }
    });
    return result;
};

const prepareMarkdown = markdown => {
    if (!markdown) {
        return "";
    }
    const lines = withNoChangesNotices(stripLeadingTitle(markdown.split("\n")));
    return lines.join("\n");
};

const Changelog = () => {

    const [markdown, setMarkdown] = useState("");
    const [version, setVersion] = useState("");
    const [date, setDate] = useState("");

    useAppStore.setState({
        breadcrumbPaths: [
            {path: "/home", value: I18n.t("breadCrumb.home"), menuItemName: mainMenuItems.home},
            {value: I18n.t("breadCrumb.changelog")}
        ]
    });

    useEffect(() => {
        changelog().then(res => setMarkdown(res.markdown));
        info().then(res => {
            setVersion(res.git.build.version);
            setDate(formatLongDate(res.git.build.time));
        });
    }, []);

    return (
        <div className="changelog-outer-container">
            <div className="changelog-header-container">
                <div className="top-header">
                    <h1 className="text-[length:var(--text-2xl-font-size)]">{I18n.t("changelog.title")}</h1>
                </div>
                <p>{I18n.t("changelog.info", {version: version, date: date})}</p>
            </div>
            <div className="changelog">
                <div className="changelog-card">
                    <ReactMarkdown>{prepareMarkdown(markdown)}</ReactMarkdown>
                </div>
            </div>
        </div>
    );

};
export default Changelog;
