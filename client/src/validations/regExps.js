import {isEmpty} from "../utils/Utils.js";

export const validEmailRegExp = /^[+a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.?[a-zA-Z]*$/;///^\S+@\S+$/;

export const validUrlRegExp = /(https?|ssh|ftp):\/\/(((www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.?[a-z]{0,63})|(localhost))\b([-a-zA-Z0-9@:%_+.~#?&/=]*)/i

export const isValidUrl = url => {
    //We allow for empty URL's, enforcing required is different responsibility
    return isEmpty(url.trim()) || (validUrlRegExp.test(value) && (url.startsWith("https")
        || (url.startsWith("http://localhost") || url.startsWith("http://127.0.0.1"))))
}
