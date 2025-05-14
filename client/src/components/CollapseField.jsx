import {useState} from "react";
import "./CollapseField.scss"
import CaretUp from "../icons/caret_up.svg";
import CaretDown from "../icons/caret_down.svg";
import {Checkbox} from "@surfnet/sds";

export const CollapseField = ({title, info, children, checkRequired, name, checkValue}) => {

    const [collapse, setCollapse] = useState(false)

    return (
        <div className="collapse-field">
            <div className="collapse-field-inner">
                {checkRequired && <Checkbox name={name}
                                            value={checkValue}
                                            onChange={e => checkRequired(e)}
                />}
                <div className="collapse-field-switch"
                     onClick={() => setCollapse(!collapse)}>
                    <span className={`${collapse ? "collapsed" : "open"}`}>
                        {title}
                    </span>
                    {collapse ? <CaretUp/> : <CaretDown/>}
                </div>

            </div>
            {(collapse && info) && <p className="collapsed"
                                      dangerouslySetInnerHTML={{__html: info}}/>}
            {(collapse && !info) && <div className="collapsed">
                {children}
            </div>}
        </div>
    );
}
