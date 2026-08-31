import React from "react";
import "./InputField.scss";
import {Button} from "@surfnet/curve-react";
import {sanitize} from "../utils/Utils";

export default function UploadButton({
                                         name,
                                         onFileUpload = null,
                                         txt,
                                         acceptFileFormat = "text/csv"
                                     }) {
    let fileInput;

    const onClick = () => {
        fileInput.click();
    };

    return (
        <div className="file-upload-button-container">
            <input type="file"
                   id={`fileUpload_${name}`}
                   ref={ref => fileInput = ref}
                   name={`fileUpload_${name}`}
                   accept={acceptFileFormat}
                   style={{display: "none"}}
                   onChange={onFileUpload}/>
            <Button onClick={onClick}>
                <span dangerouslySetInnerHTML={{__html: sanitize(txt)}}/>
            </Button>
        </div>
    );

}
