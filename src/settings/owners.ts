import { AUTHORITY_GROUP_OPTIONS, AuthorityGroup, IsMemberNumberInAuthGroup } from "../util/authority";
import { ModuleTitle } from "../modules/_module";
import { LocalizedText } from "../localization/localization";
import { CANVAS_WIDTH, ClickedPagesButtons, DrawPagesButtons, OPTION_BACK_NEXT_WIDTH, OPTION_GAP, OPTION_HEIGHT, OPTION_TOP, OwnerAdded, OwnerRemoved, SetSettingsEdited } from "../modules/settings";
import { MemberNumberToName } from "../util/messaging";

const id = "MPA_ownerIdEntry";

function PlayerAuth(C: PlayerCharacter)
{
    return C.MPA[ModuleTitle.Authority];
}

function GetSettings(C: PlayerCharacter)
{
    return PlayerAuth(C)?.[OWNERS_CUSTOM_SETTINGS.name];
}

const OPTION_OTHERS = 900;

const ADD_CHECKBOX = [250, 200, 64, 64] as const;
const REM_CHECKBOX = [250, 274, 64, 64] as const;
const ADD_OWNER_BUTTON = [250, 348, 128, 64] as const;
const OWNER_TEXTBOX = [388, 348, 256, 64] as const;

let curPage = 1;
let maxPages = 1;

const MAX_ENTRIES_PER_COLUMN = 14;
const OWNER_X_START = 250;
const OWNER_Y_START = 412;

function DrawEntries(C: PlayerCharacter): void
{
    const settings = GetSettings(C);
    const pageResults: number[] = settings.owners.slice(MAX_ENTRIES_PER_COLUMN * (curPage - 1), MAX_ENTRIES_PER_COLUMN * curPage);

    const removeDisabled = !IsMemberNumberInAuthGroup(Player.MemberNumber ?? -1, settings.othersRemove, settings.selfRemove, C);

    pageResults.forEach((owner, index) =>
    {
        MainCanvas.textAlign = "center";

        let disabled = removeDisabled;
        // Allow removing self even if not have perms
        if (owner === Player.MemberNumber)
        {
            disabled = false;
        }
        DrawButton(
            OWNER_X_START + (index % 2 == 0 ? 0 : 750),
            OWNER_Y_START + OPTION_GAP + ((OPTION_GAP + OPTION_HEIGHT) * Math.floor(index / 2)),
            OPTION_HEIGHT,
            OPTION_HEIGHT,
            "X",
            disabled ? "Gray" : "White",
            "",
            LocalizedText("Remove Owner"),
            disabled
        );

        MainCanvas.textAlign = "left";
        DrawTextFit(
            `${MemberNumberToName(owner)} (${owner})`,
            OWNER_X_START + OPTION_GAP + OPTION_HEIGHT + (index % 2 == 0 ? 0 : 750),
            OWNER_Y_START + (Math.floor(index / 2) * (OPTION_GAP + OPTION_HEIGHT)) + Math.ceil((OPTION_HEIGHT) / 2) + OPTION_GAP,
            600,
            "Black",
            "Gray"
        );
    });
}

/**
 * @param C
 * @returns Early return
 */
function ClickedEntries(C: PlayerCharacter): boolean
{
    const settings = GetSettings(C);
    const removeDisabled = !IsMemberNumberInAuthGroup(Player.MemberNumber ?? -1, settings.othersRemove, settings.selfRemove, C);
    const pageResults: number[] = settings.owners.slice(MAX_ENTRIES_PER_COLUMN * (curPage - 1), MAX_ENTRIES_PER_COLUMN * curPage);

    // Can't remove so this do nothing
    if (removeDisabled && !pageResults.includes(Player.MemberNumber ?? -1))
    {
        return false;
    }

    for (const [index, owner] of pageResults.entries())
    {
        if (MouseIn(
            OWNER_X_START + (index % 2 == 0 ? 0 : 750),
            OWNER_Y_START + OPTION_GAP + ((OPTION_GAP + OPTION_HEIGHT) * Math.floor(index / 2)),
            OPTION_HEIGHT,
            OPTION_HEIGHT
        ) && (!removeDisabled || owner === Player.MemberNumber))
        {
            const index = settings.owners.indexOf(owner);
            if (index !== -1)
            {
                OwnerRemoved(settings.owners?.[index]);
                settings.owners.splice(index, 1);
                maxPages = settings.owners.length / MAX_ENTRIES_PER_COLUMN;

                // Removed last item on the list, set to previous page
                if (pageResults.length === 1 && curPage > 1)
                {
                    curPage--;
                }

                return true; // Found entry, skip rest
            }
        }
    };

    return false;
}

export const OWNERS_CUSTOM_SETTINGS: CustomSetting =
{
    type: "custom",
    OnClick: function (C: PlayerCharacter, hasPermission: boolean): void
    {
        // Pages of owners
        const result = ClickedPagesButtons(curPage, maxPages);
        if (result === true)
        {
            curPage++;
            return;
        }
        else if (result === false)
        {
            curPage--;
            return;
        }

        const authSettings = PlayerAuth(C);
        const settings = GetSettings(C);

        if (ClickedEntries(C))
        {
            SetSettingsEdited(true);
            return;
        }

        // Add owner button
        if (IsMemberNumberInAuthGroup(Player.MemberNumber ?? -1, settings.othersAdd, settings.selfAdd, C)
          && MouseIn(...ADD_OWNER_BUTTON))
        {
            const value = Number(ElementValue(id));
            if (ElementValue(id) !== "" && !isNaN((value)) && !settings.owners.includes(value) && value !== C.MemberNumber)
            {
                settings.owners.push(value);
                settings.owners.sort((a, b) => a - b);
                OwnerAdded(value);
                ElementValue(id, "");
                maxPages = settings.owners.length / MAX_ENTRIES_PER_COLUMN;
                SetSettingsEdited(true);
            }
            return;
        }

        // Self add
        if (hasPermission
          && MouseIn(...ADD_CHECKBOX))
        {
            settings.selfAdd = !settings.selfAdd;
            SetSettingsEdited(true);
            return;
        }
        // Self remove
        if (hasPermission
          && MouseIn(...REM_CHECKBOX))
        {
            settings.selfRemove = !settings.selfRemove;
            SetSettingsEdited(true);
            return;
        }

        const addIndex = AUTHORITY_GROUP_OPTIONS.indexOf(settings.othersAdd);
        // Add other previous
        if (hasPermission
          && MouseIn(900, 200, 128, 64)
          && addIndex > 0
          && IsMemberNumberInAuthGroup(Player.MemberNumber ?? -1, authSettings.othersAuthority as AuthorityGroup, authSettings.selfProfile, C)
          && IsMemberNumberInAuthGroup(Player.MemberNumber ?? -1, AUTHORITY_GROUP_OPTIONS[addIndex], authSettings.selfProfile, C)
        )
        {
            settings.othersAdd = AUTHORITY_GROUP_OPTIONS[addIndex - 1];
            SetSettingsEdited(true);
            return;
        }
        // Add other next
        if (hasPermission
          && MouseIn(1028, 200, 128, 64)
          && addIndex + 1 < AUTHORITY_GROUP_OPTIONS.length
          && IsMemberNumberInAuthGroup(Player.MemberNumber ?? -1, authSettings.othersAuthority as AuthorityGroup, authSettings.selfProfile, C)
          && IsMemberNumberInAuthGroup(Player.MemberNumber ?? -1, AUTHORITY_GROUP_OPTIONS[addIndex + 1], authSettings.selfProfile, C)
        )
        {
            settings.othersAdd = AUTHORITY_GROUP_OPTIONS[addIndex + 1];
            SetSettingsEdited(true);
            return;
        }

        const remIndex = AUTHORITY_GROUP_OPTIONS.indexOf(settings.othersRemove);
        // Add other previous
        if (hasPermission
          && MouseIn(900, 274, 128, 64)
          && remIndex > 0
          && IsMemberNumberInAuthGroup(Player.MemberNumber ?? -1, authSettings.othersAuthority as AuthorityGroup, authSettings.selfProfile, C)
          && IsMemberNumberInAuthGroup(Player.MemberNumber ?? -1, AUTHORITY_GROUP_OPTIONS[remIndex], authSettings.selfProfile, C)
        )
        {
            settings.othersRemove = AUTHORITY_GROUP_OPTIONS[remIndex - 1];
            SetSettingsEdited(true);
            return;
        }
        // Add other next
        if (hasPermission
          && MouseIn(1028, 274, 128, 64)
          && remIndex + 1 < AUTHORITY_GROUP_OPTIONS.length
          && IsMemberNumberInAuthGroup(Player.MemberNumber ?? -1, authSettings.othersAuthority as AuthorityGroup, authSettings.selfProfile, C)
          && IsMemberNumberInAuthGroup(Player.MemberNumber ?? -1, AUTHORITY_GROUP_OPTIONS[remIndex + 1], authSettings.selfProfile, C)
        )
        {
            settings.othersRemove = AUTHORITY_GROUP_OPTIONS[remIndex + 1];
            SetSettingsEdited(true);
            return;
        }
    },
    OnExit: function (_C: PlayerCharacter, _hasPermission?: boolean): void
    {
        ElementRemove(id);
    },
    OnLoad: function (C: PlayerCharacter, _hasPermission?: boolean): void
    {
        const settings = GetSettings(C);
        maxPages = settings.owners.length / MAX_ENTRIES_PER_COLUMN;

        ElementCreateInput(id, "number", "");
        ElementSetAttribute(id, "min", "0");
        ElementSetAttribute(id, "inputmode", "numeric");
        ElementPositionFixed(
            id,
            ...OWNER_TEXTBOX
        );
    },
    OnRun: function (C: PlayerCharacter, hasPermission?: boolean): void
    {
        const prevTextAlign = MainCanvas.textAlign;
        MainCanvas.textAlign = "left";

        const authSettings = PlayerAuth(C);
        const settings = GetSettings(C);

        // Player allowed to add owners
        DrawCheckbox(
            ...ADD_CHECKBOX,
            LocalizedText("SourceCharacter can add owners").replace("SourceCharacter", C.Nickname || C.Name),
            !!C!.MPA[ModuleTitle.Authority]["newOwners"].selfAdd,
            !hasPermission,
            "Black"
        );

        // Player allowed to remove owners
        DrawCheckbox(
            ...REM_CHECKBOX,
            LocalizedText("SourceCharacter can remove owners").replace("SourceCharacter", C.Nickname || C.Name),
            !!C!.MPA[ModuleTitle.Authority]["newOwners"].selfRemove,
            !hasPermission,
            "Black"
        );

        // Others can add or remove
        for (const option of [false, true])
        {
            const newIndex = Number(option);

            // Others allowed to add owners
            const otherOption = settings[option ? "othersRemove" : "othersAdd"] as AuthorityGroup;
            const index = AUTHORITY_GROUP_OPTIONS.indexOf(otherOption);
            const optLen = AUTHORITY_GROUP_OPTIONS.length;

            const prevDisabled = index === 0
              || !IsMemberNumberInAuthGroup(Player.MemberNumber ?? -1, authSettings.othersAuthority as AuthorityGroup, authSettings.selfProfile, C)
              || !IsMemberNumberInAuthGroup(Player.MemberNumber ?? -1, AUTHORITY_GROUP_OPTIONS[index], authSettings.selfProfile, C);
            const nextDisabled = index === AUTHORITY_GROUP_OPTIONS.length - 1
              || !IsMemberNumberInAuthGroup(Player.MemberNumber ?? -1, authSettings.othersAuthority as AuthorityGroup, authSettings.selfProfile, C)
              || !IsMemberNumberInAuthGroup(Player.MemberNumber ?? -1, AUTHORITY_GROUP_OPTIONS[index + 1], authSettings.selfProfile, C);
            // Has permissions of profile and current level

            DrawBackNextButton(
                OPTION_OTHERS,
                OPTION_TOP + (newIndex * (OPTION_GAP + OPTION_HEIGHT)),
                OPTION_BACK_NEXT_WIDTH,
                OPTION_HEIGHT,
                LocalizedText(otherOption),
                !(!hasPermission || (prevDisabled && nextDisabled)) ? "#ffffff" : "#aaaaaa",
                "",
                () => LocalizedText(prevDisabled ? "" : (index > 0 ? AUTHORITY_GROUP_OPTIONS[index - 1] : "")),
                () => LocalizedText(nextDisabled ? "" : (index + 1 < optLen ? AUTHORITY_GROUP_OPTIONS[index + 1] : "")),
                !hasPermission
            );
            DrawTextFit(
                LocalizedText(option ? "Allow others to remove owners" : "Allow others to add owners"),
                OPTION_OTHERS + OPTION_BACK_NEXT_WIDTH + (OPTION_GAP * 2),
                OPTION_TOP + (newIndex * (OPTION_GAP + OPTION_HEIGHT) + Math.ceil(OPTION_HEIGHT / 2)),
                CANVAS_WIDTH - OPTION_OTHERS - OPTION_BACK_NEXT_WIDTH,
                "Black",
                "Gray"
            );
        }

        ElementPositionFixed(
            id,
            ...OWNER_TEXTBOX
        );

        DrawPagesButtons(curPage, maxPages);

        DrawEntries(C);

        MainCanvas.textAlign = "center";
        const canAddOwner = IsMemberNumberInAuthGroup(Player.MemberNumber ?? -1, settings.othersAdd, settings.selfAdd, C);
        DrawButton(
            ...ADD_OWNER_BUTTON,
            "Add",
            canAddOwner ? "White" : "Gray",
            "",
            "",
            !canAddOwner
        );

        MainCanvas.textAlign = prevTextAlign;
    },
    active: function (_C: Character): boolean
    {
        return true;
    },
    label: "Owners",
    name: "newOwners",
    value: { owners: [], selfAdd: true, selfRemove: true, othersAdd: "Clubowner", othersRemove: "Clubowner" }
};
