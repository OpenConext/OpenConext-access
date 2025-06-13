import React from "react";
import "./ClipBoardCopy.scss";
import Duplicate from "@surfnet/sds//icons/functional-icons/duplicate.svg";
import {CopyToClipboard} from "react-copy-to-clipboard";

export default function ClipBoardCopy({txt}) {
    return (
        <CopyToClipboard text={txt}>
            <section
                className={`copy-to-clipboard`}
                onClick={e => {
                    const me = e.target;
                    me.classList.add("copied");
                    setTimeout(() => me.classList.remove("copied"), 1250);
                }}>
                <Duplicate/>
            </section>
        </CopyToClipboard>
    );

}