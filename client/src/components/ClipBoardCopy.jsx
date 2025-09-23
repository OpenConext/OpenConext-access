import React, {useState} from "react";
import "./ClipBoardCopy.scss";
import Duplicate from "@surfnet/sds//icons/functional-icons/duplicate.svg";
import {CopyToClipboard} from "react-copy-to-clipboard";
import I18n from "../locale/I18n";

export default function ClipBoardCopy({txt}) {
    const [copied, setCopied] = useState(false);

    return (
        <>
            <CopyToClipboard text={txt}>
                <section
                    className="copy-to-clipboard"
                    onClick={e => {
                        const me = e.target;
                        me.classList.add("copied");
                        setCopied(true);
                        setTimeout(() => {
                            me.classList.remove("copied");
                            setCopied(false);
                        }, 1250);
                    }}>
                    <Duplicate/>
                </section>
            </CopyToClipboard>
            <div className={`copied ${copied ? "" : "hidden"}`}>{I18n.t("forms.copied")}</div>
        </>
    );

}