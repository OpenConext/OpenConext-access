import I18n from "../locale/I18n";
import {isEmpty} from "./Utils";

const formatDate = (date, longMonth = true) => {
    const options = {month: longMonth ? "long" : "short", day: "numeric", year: "numeric"};
    const dateTimeFormat = new Intl.DateTimeFormat(`${I18n.locale}-${I18n.locale.toUpperCase()}`, options)
    return dateTimeFormat.format(date);
}

export const dateFromEpoch = (epoch, needsMultiplier = true, longMonth = true) => {
    if (isEmpty(epoch)) {
        return "-";
    }
    const date = new Date(needsMultiplier ? epoch * 1000 : epoch);
    return formatDate(date, longMonth);
}

export const formatShortDate = (isoString) => {
    return formatDate(new Date(isoString));
}
