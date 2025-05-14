import I18n from "../locale/I18n";
import "./ApplicationConnectionHeader.scss"
import {stopEvent} from "../utils/Utils.js";

export const ApplicationConnectionHeader = ({tabNames, application, tab, setTab}) => {

    const doNavigate = (e, tabName) => {
        stopEvent(e);
        setTab(tabName);
    }

    return (
        <div className="application-connection-header-container">
            <h1>{application.name}</h1>
            <div className="application-connection-header">

                {tabNames.map(tabName => <a key={tabName}
                                            href={`/${tabName}`}
                                            className={tabName === tab ? "active" : ""}
                                            onClick={e => doNavigate(e, tabName)}>
                    {I18n.t(`connection.${tabName}`)}
                </a>)}
            </div>
        </div>
    );
}
