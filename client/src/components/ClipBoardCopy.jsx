import React, {useState} from "react";
import "./ClipBoardCopy.scss";
import Duplicate from "@surfnet/sds//icons/functional-icons/duplicate.svg";
import I18n from "../locale/I18n";

export default function ClipBoardCopy({txt}) {
    const [copied, setCopied] = useState(false);

    return (
        <>
            <section
                className="copy-to-clipboard"
                onClick={e => {
                    navigator.clipboard.writeText(txt)
                        .then(() => {
                            const me = e.target;
                            me.classList.add("copied");
                            setCopied(true);
                            setTimeout(() => {
                                me.classList.remove("copied");
                                setCopied(false);
                            }, 1560);
                        })
                }}>
                <Duplicate/>
            </section>
            <div className={`copied ${copied ? "" : "hidden"}`}>{I18n.t("forms.copied")}</div>
        </>
    );

}