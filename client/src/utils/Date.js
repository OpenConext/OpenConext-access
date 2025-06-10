import I18n from "../locale/I18n";
import {isEmpty} from "./Utils";

export const dateFromEpoch = (epoch, needsMultiplier = true) => {
    if (isEmpty(epoch)) {
        return "-";
    }
    const options = {month: "long", day: "numeric", year: "numeric"};
    const dateTimeFormat = new Intl.DateTimeFormat(`${I18n.locale}-${I18n.locale.toUpperCase()}`, options)
    return dateTimeFormat.format(new Date(needsMultiplier ? epoch * 1000 : epoch));
}
