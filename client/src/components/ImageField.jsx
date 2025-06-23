import "./ImageField.scss";
import {useRef, useState} from "react";
import NotFoundImage from "../icons/image-not-found.svg"
import {srcUrl} from "../utils/Image.js";
import I18n from "../locale/I18n";
import {isEmpty} from "../utils/Utils.js";
import {Button} from "@surfnet/sds"
import DOMPurify from "dompurify";

export const ImageField = ({imageSource, onChange}) => {

    const imageRef = useRef(null);
    const inputRef = useRef(null);

    const [error, setError] = useState(null);
    const [source, setSource] = useState(imageSource);
    const [isSvg, setIsSvg] = useState(null);

    const onSelectFile = e => {
        debugger;
        const files = e.target.files;
        if (files && files[0]) {
            const file = files[0];
            if (file.size > 2 * 1024 * 1000) {
                setError(I18n.t("connection.logo.imageToLarge"));
            } else {
                const reader = new FileReader();
                reader.onloadend = () => {
                    debugger
                    let res = reader.result;
                    const svg = res.indexOf("svg+xml") > -1;
                    if (svg) {
                        res = DOMPurify.sanitize(res);
                    }
                    const base64 = res.split(',')[1]; // Remove data URL prefix
                    setSource(base64);
                    setIsSvg(svg);
                }
                reader.readAsDataURL(files[0]);
            }
        }
    }

    const onButtonClick = () => {
        inputRef.current.value = null;
        inputRef.current.click()
    }

    return (
        <div className="image-field-container">
            <div className="image-field">
                {source &&
                    <img alt="Crop me"
                         src={srcUrl(source, isSvg ? "svg+xml" : "jpeg")}
                         ref={imageRef}
                        // onLoad={this.onImageLoaded}
                    />}
                {!source && <NotFoundImage/>}
            </div>
            <div className="edit-options">
                <input type="file"
                       ref={inputRef}
                       name={`fileUpload`}
                       accept="image/png, image/jpeg, image/jpg, image/svg+xml, image/webp"
                       onChange={onSelectFile}
                />
                <Button txt={I18n.t(`connection.logo.${isEmpty(imageSource) ? "add" : "edit"}`)}
                        onClick={onButtonClick}/>
                <ul>
                    {I18n.translations[I18n.locale].connection.logo.disclaimers.map((disclaimer, index) =>
                        <li key={index}>{disclaimer}</li>
                    )}
                </ul>
            </div>
        </div>
    );
}
