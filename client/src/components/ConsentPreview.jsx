import React from "react";
import I18n from "../locale/I18n.js";
import {isEmpty} from "../utils/Utils.js";
import DOMPurify from "dompurify";

const WIDTH = 368;
const WARNING_TOP = 515;
const WARNING_BASE_HEIGHT = 34;
const WARNING_LINE_HEIGHT = 18;
const WARNING_CHARS_PER_LINE = 40;
const BUTTONS_OFFSET = 20;
const BOTTOM_OFFSET = 101;

const t = key => I18n.t(`consent.preview.${key}`);

const font = {fontFamily: "'Source Sans 3', 'Source Sans Pro', Arial, sans-serif"};

//HTML in the translations is limited to bold text and links, wrapped by the browser inside a foreignObject
const InfoText = ({x, y, width, height, html}) => (
    <foreignObject x={x} y={y} width={width} height={height}>
        <div xmlns="http://www.w3.org/1999/xhtml"
             style={{...font, fontSize: "10px", lineHeight: "12px", color: "#1f2933"}}
             dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(html, {ADD_ATTR: ["style"]})}}/>
    </foreignObject>
);

//Vector example of the SURFconext consent screen. The warning (custom message) is only shown when there is one
export const ConsentPreview = ({warning}) => {
    const message = (warning || "").trim();
    const hasWarning = !isEmpty(message);
    const lines = Math.ceil(message.length / WARNING_CHARS_PER_LINE);
    const warningHeight = WARNING_BASE_HEIGHT + Math.max(lines, 1) * WARNING_LINE_HEIGHT;
    const buttonsTop = hasWarning ? WARNING_TOP + warningHeight + BUTTONS_OFFSET : WARNING_TOP;
    const height = buttonsTop + BOTTOM_OFFSET;

    const row = (y, label, value) => <g>
        <text x="130" y={y} textAnchor="end" fontSize="12" fill="#1f2933" {...font}>{label}</text>
        <text x="140" y={y} fontSize="12" fontWeight="600" fill="#111827" {...font}>{value}</text>
    </g>;

    const infoIcon = y => <g>
        <circle cx="46" cy={y} r="17" fill="#e9edf2" stroke="#d3dae3"/>
        <rect x="39" y={y - 7} width="14" height="14" rx="2" fill="none" stroke="#3f7fc4" strokeWidth="1.5"/>
        <path d={`M42 ${y - 2}h8M42 ${y + 2}h8`} stroke="#3f7fc4" strokeWidth="1.2"/>
    </g>;

    return (
        <svg className="consent-preview" width={WIDTH} height={height} viewBox={`0 0 ${WIDTH} ${height}`}
             xmlns="http://www.w3.org/2000/svg" role="img" aria-label={I18n.t("consent.example")}>
            <rect width={WIDTH} height={height} rx="10" fill="#f4f6f8" stroke="#e1e5ea"/>
            <path d={`M0 10a10 10 0 0 1 10-10h${WIDTH - 20}a10 10 0 0 1 10 10v34H0z`} fill="#1e4e9e"/>
            <text x="22" y="29" fontSize="14" fill="#ffffff" {...font}>{t("loginTitle")}</text>
            <rect y="44" width={WIDTH} height="48" fill="#fbe24b"/>
            <text x="22" y="73" fontSize="14.5" fill="#1f2933" {...font}>{t("consentQuestion")}</text>
            <text x="22" y="121" fontSize="19" fill="#2a8a3e" {...font}>{I18n.t("consent.preview.willReceive", {name: "OpenConext Profile"})}</text>

            <rect x="22" y="143" width="324" height="119" rx="4" fill="#ffffff" stroke="#6b7280" strokeWidth="2"/>
            {row(170, t("displayName"), "John Doe")}
            <path d="M23 184h322M23 212h322" stroke="#e5e7eb"/>
            {row(198, t("fullName"), "John Doe")}
            {row(226, t("email"), "j.doe@example.com")}
            <path d="M23 240h322" stroke="#e5e7eb"/>
            <rect x="23" y="240" width="322" height="21" fill="#e3e7ec"/>
            <rect x="30" y="244" width="14" height="12" rx="2" fill="#111827"/>
            <text x="52" y="254" fontSize="9" fill="#1f2933" {...font}>{t("providedBy")} <tspan fontWeight="700">OpenConext Mujina IDP</tspan></text>
            <text x="338" y="254" fontSize="9" textAnchor="end" fill="#6b7280" textDecoration="underline" {...font}>{t("somethingIncorrect")}</text>

            <rect x="22" y="310" width="324" height="83" rx="4" fill="#ffffff" stroke="#c4cad3" strokeWidth="1.5"/>
            <text x="78" y="334" textAnchor="end" fontSize="10" fill="#1f2933" {...font}>{t("identifier")}</text>
            <text x="84" y="334" fontSize="10" fontWeight="600" fill="#111827" {...font}>urn:collab:person:example.com:sjkldhfkdsahfiuh</text>
            <text x="84" y="348" fontSize="10" fontWeight="600" fill="#111827" {...font}>w948hruf</text>
            <rect x="23" y="368" width="322" height="24" fill="#e3e7ec"/>
            <text x="30" y="384" fontSize="9" fontWeight="700" fill="#2f78c4" {...font}>SURFconext</text>
            <text x="86" y="384" fontSize="9" fill="#1f2933" {...font}>{t("providedBy")} <tspan fontWeight="700">SURFconext TEST2</tspan></text>
            <text x="338" y="384" fontSize="9" textAnchor="end" fill="#2f78c4" fontWeight="600" {...font}>{t("explanation")}</text>

            {infoIcon(424)}
            <InfoText x={72} y={412} width={270} height={36} html={t("infoSp")}/>
            {infoIcon(478)}
            <InfoText x={72} y={460} width={270} height={48} html={t("infoIdp")}/>

            {hasWarning && <g>
                <rect x="22" y={WARNING_TOP} width="324" height={warningHeight} rx="4" fill="#fbdca4" stroke="#f0a030"/>
                <circle cx="42" cy={WARNING_TOP + 20} r="7" fill="#f0a030"/>
                <text x="42" y={WARNING_TOP + 24} textAnchor="middle" fontSize="10" fontWeight="700" fill="#ffffff" {...font}>!</text>
                <text x="56" y={WARNING_TOP + 24} fontSize="12" fontWeight="700" fill="#1f2933" {...font}>{I18n.t("consent.previewWarningTitle")}</text>
                <foreignObject x="56" y={WARNING_TOP + 30} width="280" height={warningHeight - 30}>
                    <div xmlns="http://www.w3.org/1999/xhtml"
                         style={{...font, fontSize: "12px", lineHeight: `${WARNING_LINE_HEIGHT}px`, color: "#1f2933", wordBreak: "break-word"}}>
                        {message}
                    </div>
                </foreignObject>
            </g>}

            <rect x="22" y={buttonsTop} width="324" height="34" rx="4" fill="#2f78c4"/>
            <text x={WIDTH / 2} y={buttonsTop + 22} textAnchor="middle" fontSize="13" fontWeight="600" fill="#ffffff" {...font}>{t("agree")}</text>
            <text x={WIDTH / 2} y={buttonsTop + 68} textAnchor="middle" fontSize="12.5" fontWeight="700" fill="#2f78c4" {...font}>{t("decline")}</text>
        </svg>
    );
}
