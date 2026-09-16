import "./AddApplicationMemberMenu.scss";
import React, {useState} from "react";
import {Link} from "react-router";
import {
    Button,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@surfnet/curve-react";
import {CaretDownIcon} from "@phosphor-icons/react";
import SelectField from "../components/SelectField.jsx";
import I18n from "../locale/I18n.js";

export const AddApplicationMemberMenu = ({options, organizationId, applicationId, onAdd}) => {
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState(null);

    const openChanged = isOpen => {
        setOpen(isOpen);
        if (!isOpen) {
            setSelected(null);
        }
    }

    const submit = () => {
        if (!selected) {
            return;
        }
        onAdd(selected).then(() => openChanged(false));
    }

    return (
        <DropdownMenu open={open} onOpenChange={openChanged}>
            <DropdownMenuTrigger render={
                <Button size="lg" className="group">
                    {I18n.t("appTeamManagement.addButton")}
                    <CaretDownIcon className="transition-transform group-data-[popup-open]:rotate-180"/>
                </Button>
            }/>
            <DropdownMenuContent align="end" className="add-application-member-content">
                <DropdownMenuGroup className="add-application-member-group">
                    <DropdownMenuLabel className="add-application-member-title">
                        {I18n.t("appTeamManagement.addButton")}
                    </DropdownMenuLabel>
                    {/* Base UI's Menu intercepts keydown events for its own typeahead
                        navigation, which otherwise swallows every keystroke before it
                        reaches react-select's search input. Stop it from bubbling. */}
                    <div onKeyDown={e => e.stopPropagation()}>
                        <SelectField
                            name={I18n.t("appTeamManagement.selectLabel")}
                            value={selected}
                            options={options}
                            placeholder={I18n.t("appTeamManagement.addPlaceHolder")}
                            searchable={true}
                            clearable={false}
                            onChange={setSelected}
                        />
                    </div>
                    <DropdownMenuItem className="add-application-member-invite" render={
                        <Link to={`/invitation/${organizationId}/${applicationId}`}
                              onClick={() => openChanged(false)}>
                            {I18n.t("appTeamManagement.inviteNewUserPre")}
                            <span className="link">{I18n.t("appTeamManagement.inviteNewUserLink")}</span>
                        </Link>
                    }/>
                </DropdownMenuGroup>
                <DropdownMenuSeparator/>
                <div className="add-application-member-actions">
                    <Button variant="outline" size="lg" onClick={() => openChanged(false)}>
                        {I18n.t("forms.cancel")}
                    </Button>
                    <Button size="lg" onClick={submit} disabled={!selected}>
                        {I18n.t("appTeamManagement.addSubmit")}
                    </Button>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
