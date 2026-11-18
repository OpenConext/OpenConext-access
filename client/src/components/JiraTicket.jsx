import {isEmpty} from "../utils/Utils.js";

//Jira is not accessible for users, so the key is only displayed as text and never linked
export const JiraTicket = ({ticketKey}) => {
    return isEmpty(ticketKey) ? "-" : <span>{ticketKey}</span>;
}
