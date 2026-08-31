import "./ImageField.scss";
import {useRef, useState} from "react";
import NotFoundImage from "../icons/image-not-found.svg"
import {srcUrl} from "../utils/Image.js";
import I18n from "../locale/I18n";
import {isEmpty, sanitize} from "../utils/Utils.js";
import {Button} from "@surfnet/curve-react";
import DOMPurify from "dompurify";
import ConfirmationDialog from "./ConfirmationDialog.jsx";
import ReactCrop, {centerCrop, makeAspectCrop} from "react-image-crop";
import 'react-image-crop/dist/ReactCrop.css'
import {detect} from "detect-browser";
import ErrorIndicator from "./ErrorIndicator.jsx";

const browser = detect();

export const ImageField = ({imageSource, onChange}) => {

    const imageRef = useRef(null);
    const inputRef = useRef(null);

    const [error, setError] = useState(null);
    const [source, setSource] = useState(imageSource);
    const [original, setOriginal] = useState(imageSource);
    const [isSvg, setIsSvg] = useState(null);
    const [completedCrop, setCompletedCrop] = useState(null);
    const [crop, setCrop] = useState(null);
    const [showDialog, setShowDialog] = useState(false);
    const [croppedOnce, setCroppedOnce] = useState(false);
    const [busy, setBusy] = useState(false);

    const onSelectFile = e => {
        const files = e.target.files;
        if (files && files[0]) {
            const file = files[0];
            if (file.size > 2 * 1024 * 1000) {
                setError(I18n.t("connection.logo.imageToLarge"));
            } else {
                setError(null);
                const reader = new FileReader();
                reader.onloadend = () => {
                    let res = reader.result;
                    const svg = res.indexOf("svg+xml") > -1;
                    if (svg) {
                        res = DOMPurify.sanitize(res);
                    }
                    const base64 = res.split(',')[1]; // Remove data URL prefix
                    //To preserve the original
                    setOriginal(source);
                    setSource(base64);
                    setIsSvg(svg);
                    setShowDialog(true);
                }
                reader.readAsDataURL(files[0]);
            }
        }
    }

    const onCropComplete = () => {
        if (!croppedOnce && browser.name === "safari") {
            setCroppedOnce(true);
            setTimeout(() => onCropComplete(), 750);
        }
        if (imageRef.current && completedCrop.width && completedCrop.height) {
            setBusy(true);
            const image = imageRef.current;
            const scaleX = image.naturalWidth / image.width;
            const scaleY = image.naturalHeight / image.height;

            const cropWidth = completedCrop.width * scaleX;
            const cropHeight = completedCrop.height * scaleY;

            const outputSize = Math.max(cropWidth, cropHeight);
            const canvas = new OffscreenCanvas(outputSize, outputSize);

            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, outputSize, outputSize);

            ctx.drawImage(
                image,
                completedCrop.x * scaleX, // source x
                completedCrop.y * scaleY, // source y
                cropWidth,
                cropHeight,
                (outputSize - cropWidth) / 2, // dest x
                (outputSize - cropHeight) / 2, // dest y
                cropWidth,
                cropHeight
            );
            const options = {type: "image/jpeg", quality: 1};
            canvas.convertToBlob(options).then(blob => {
                if (!blob) {
                    return;
                }
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64data = reader.result;
                    const base64 = base64data.split(',')[1]; // Remove data URL prefix
                    setSource(base64);
                    onChange(base64);
                    setBusy(false);
                    setShowDialog(false);
                    //Reset crops to ensure they are initialized on second file choice
                    setCrop(null);
                    setCompletedCrop(null);
                }
                reader.readAsDataURL(blob);
            });


        }
    };

    const onButtonClick = () => {
        inputRef.current.value = null;
        inputRef.current.click()
    }

    const onInternalCancel = () => {
        setShowDialog(false);
        setSource(original);
        setCrop(null);
        setCompletedCrop(null);
    };

    const centerAspectCrop = (mediaWidth, mediaHeight, aspect) => {
        return centerCrop(makeAspectCrop({
            unit: "%",
            width: 100
        }, aspect, mediaWidth, mediaHeight), mediaWidth, mediaHeight)
    }

    const onImageLoaded = event => {
        const image = event.target;
        imageRef.current = image;
        const {width, height} = image;
        const newCrop = centerAspectCrop(width, height, 1);
        setCrop(newCrop);
    };

    return (
        <div className="image-field-container">
            {showDialog &&
                <ConfirmationDialog confirm={() => onCropComplete()}
                                    confirmationTxt={I18n.t("connection.logo.confirm")}
                                    cancel={() => onInternalCancel()}
                                    disabledConfirm={busy}
                                    confirmationHeader={I18n.t("connection.logo.header")}>

                    <ReactCrop
                        crop={crop}
                        onChange={(_, percentCrop) => setCrop(percentCrop)}
                        onComplete={c => setCompletedCrop(c)}
                        aspect={1}
                        minHeight={100}
                    >
                        <img
                            src={srcUrl(source, isSvg ? "svg+xml" : "jpeg")}
                            onLoad={onImageLoaded}
                            ref={imageRef}
                            alt="Crop me"
                        />
                    </ReactCrop>
                </ConfirmationDialog>}
            <div className="image-field">
                {source &&
                    <img alt="Crop me"
                         src={srcUrl(source, "jpeg")}
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
                <Button onClick={onButtonClick}>
                    <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t(`connection.logo.${isEmpty(imageSource) ? "add" : "edit"}`))}}/>
                </Button>
                <ul>
                    {I18n.translations[I18n.locale].connection.logo.disclaimers.map((disclaimer, index) =>
                        <li key={index}>{disclaimer}</li>
                    )}
                </ul>
                {error && <ErrorIndicator standalone={true} msg={error}/>}
            </div>
        </div>
    );
}
