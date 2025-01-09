import { LocalizedText } from "../localization/localization";
import { ExportSettingsToClipboard, ImportSettingsFromClipboard, ResetStorage, SaveStorage } from "../util/storage";
import { ICONS } from "../util/constants";
import { IsDisplaySetting, IsOptionSetting, IsCheckboxSetting, IsTextSetting, IsNumberSetting } from "../util/settingTypes";
import { settings as defaultSettings } from "../util/registerModules";
import { AUTHORITY_GROUP_OPTIONS, AuthorityGroup, AuthorityIsComparisonToCharacter, IsMemberNumberInAuthGroup } from "../util/authority";
import { SendMPAMessage } from "../util/messaging";
import { Module, ModuleTitle } from "./_module";
import { LevelSync } from "./virtualPet";

let settingsEdited = false;
let settingChar: PlayerCharacter | null = null;
export function SetSettingChar(character: PlayerCharacter): void
{
    settingsEdited = false;
    settingChar = character;
}

// Size of the canvas in game
const CANVAS_WIDTH = 2000;
const _CANVAS_HEIGHT = 1000;

// Exit button posistion on canvas
const EXIT_POSISTION = [1815, 75, 90, 90] as const;

// Menu layout values
const BUTTON_MAX_NUMBER = 7;
const BUTTON_WIDTH = 400;
const BUTTON_HEIGHT = 90;
const BUTTON_TOP = 160;
const BUTTON_LEFT = 500;
const BUTTON_GAP = 20;
const BUTTON_TEXT_PADDING = 20;

// Player only buttons
const WIKI_POSITION = [100, 510, 350, 75] as const;
const WIKI_LINK = "https://github.com/MayaTheFoxy/MPA/wiki";
const DISCORD_INVITE = "https://discord.gg/9GHwmHEMAS";
const DISCORD_POSITION = [
    WIKI_POSITION[0],
    WIKI_POSITION[1] + WIKI_POSITION[3] + BUTTON_GAP,
    WIKI_POSITION[2],
    WIKI_POSITION[3]
] as const;
const RESET_POSITION = [
    DISCORD_POSITION[0],
    DISCORD_POSITION[1] + DISCORD_POSITION[3] + BUTTON_GAP,
    DISCORD_POSITION[2],
    DISCORD_POSITION[3]
] as const;
const ALERT_POSITION = [
    RESET_POSITION[0],
    RESET_POSITION[1] - RESET_POSITION[3],
    RESET_POSITION[2]
] as const;
let showSettingsAlert: number = 0;
let settingsAlertText: string = "";
const IMPORT_POSITION = [
    RESET_POSITION[0],
    RESET_POSITION[1] + RESET_POSITION[3] + BUTTON_GAP,
    (RESET_POSITION[2] - BUTTON_GAP) / 2,
    RESET_POSITION[3]
] as const;
const EXPORT_POSITION = [
    RESET_POSITION[0] + ((RESET_POSITION[2] + BUTTON_GAP) / 2),
    RESET_POSITION[1] + RESET_POSITION[3] + BUTTON_GAP,
    (RESET_POSITION[2] - BUTTON_GAP) / 2,
    RESET_POSITION[3]
] as const;
const RESET_CONFIRM_POSITION = [300, 700, 250, 90] as const;
const RESET_CANCEL_POSITION = [1450, 700, 250, 90] as const;
const VERSION_TEXT = [
    WIKI_POSITION[2] / 2 + WIKI_POSITION[0],
    WIKI_POSITION[1] - (BUTTON_GAP * 2),
    WIKI_POSITION[2]
] as const;

// Can add or remove modules depending on if wanting to display them or not
// Order given is the order displayed
function MENU_CATEGORIES(): ModuleTitle[]
{
    if (!settingChar)
    {
        return [];
    }
    // Display settings if you are the Player
    if (settingChar.IsPlayer())
    {
        return [
            ModuleTitle.Authority,
            ModuleTitle.Profile,
            ModuleTitle.Clicker,
            ModuleTitle.VirtualPet,
            ModuleTitle.VirtualPetHUD,
            ModuleTitle.VirtualPetConditions
        ];
    }
    // Display settings if you are an another player
    return [
        ModuleTitle.Authority,
        ModuleTitle.Profile,
        ModuleTitle.Clicker,
        ModuleTitle.VirtualPet,
        ModuleTitle.VirtualPetConditions
    ];
}

export const MENU_TITLES: Partial<Record<ModuleTitle, string>> =
{
    [ModuleTitle.VirtualPet]: "Virtual Pet",
    [ModuleTitle.VirtualPetHUD]: "Virtual Pet Hud",
    [ModuleTitle.VirtualPetConditions]: "Virtual Pet Conditions"
};

export let currentMenu: ModuleTitle | null | "RESET_Settings" = null;
let settingsOpen: boolean = false;
let allowResetTime: number = 0;

DrawButton(1520, 720, 200, 80, "Cancel", "White");

function DrawMenuOptions(menuOptions: string[]): void
{
    for (let i = 0; i < menuOptions.length; i++)
    {
        DrawButton(
            BUTTON_LEFT + (BUTTON_WIDTH + BUTTON_GAP) * Math.floor(i / BUTTON_MAX_NUMBER),
            BUTTON_TOP + (BUTTON_HEIGHT + BUTTON_GAP) * (i % BUTTON_MAX_NUMBER),
            BUTTON_WIDTH,
            BUTTON_HEIGHT,
            "",
            "White"
        );
        DrawTextFit(
            LocalizedText(MENU_TITLES[menuOptions[i]] ?? menuOptions[i]),
            (BUTTON_LEFT + BUTTON_TEXT_PADDING) + (BUTTON_WIDTH + BUTTON_GAP) * Math.floor(i / BUTTON_MAX_NUMBER),
            (BUTTON_TOP + Math.floor(BUTTON_HEIGHT / 2)) + (BUTTON_HEIGHT + BUTTON_GAP) * (i % BUTTON_MAX_NUMBER),
            BUTTON_WIDTH - BUTTON_TEXT_PADDING * 2,
            "Black",
            "Gray"
        );
    }
}

function GetClickedMenu(menuOptions: ModuleTitle[]): ModuleTitle | null
{
    for (let i = 0; i < menuOptions.length; i++)
    {
        if (MouseIn(
            BUTTON_LEFT + (BUTTON_WIDTH + BUTTON_GAP) * Math.floor(i / BUTTON_MAX_NUMBER),
            BUTTON_TOP + (BUTTON_HEIGHT + BUTTON_GAP) * (i % BUTTON_MAX_NUMBER),
            BUTTON_WIDTH,
            BUTTON_HEIGHT
        ))
        {
            return menuOptions[i];
        }
    }
    return null;
}

// Options layout
// May not be needed. Will have to use if there are more than 10 settings to display per category
const OPTION_PER_PAGE = 9;
const OPTION_HEIGHT = 64;
const OPTION_TOP = 200;
const OPTION_LEFT = 250;
const OPTION_GAP = 10;
const OPTION_CHECKBOX_SIZE = 64;
const OPTION_BACK_NEXT_WIDTH = 256;
const OPTION_TEXT_WIDTH = 256;
const OPTION_TEXT_MAX_CHARS = 256;
let currentPage: number = 1;
let maxPages: number = 1;

const NEXT_BUTTON_POS = [1635, 75, 90, 90] as const;
const PREV_BUTTON_POS = [NEXT_BUTTON_POS[0] - NEXT_BUTTON_POS[2], NEXT_BUTTON_POS[1], NEXT_BUTTON_POS[2], NEXT_BUTTON_POS[2]] as const;

function DrawPagesButtons(): void
{
    // Asset current page is in correct range
    if (currentPage > maxPages)
    {
        currentPage = maxPages;
    }
    if (currentPage < 1)
    {
        currentPage = 1;
    }

    DrawButton(
        ...NEXT_BUTTON_POS,
        "",
        currentPage >= maxPages ? "#aaaaaa" : "#ffffff",
        "Icons/Next.png",
        "Next Page",
        currentPage >= maxPages
    );
    DrawButton(
        ...PREV_BUTTON_POS,
        "",
        1 >= currentPage ? "#aaaaaa" : "#ffffff",
        "Icons/Prev.png",
        "Previous Page",
        1 >= currentPage
    );
}

function DrawSubMenuOptions(subMenu: ModuleTitle): void
{
    // Shouldn't be needed but acts as failsafe and makes typescript happy
    if (!settingChar) { return; }

    // Settings have to be displayable and have a value exist in the stored settings
    const settingsToDisplay = Object.entries(defaultSettings[subMenu] ?? {})
        .filter(([key, setting]) => IsDisplaySetting(setting) && (key in (settingChar?.MPA[subMenu] ?? {})));

    // Next and previous option buttons
    if (maxPages !== 1)
    {
        DrawPagesButtons();
    }

    settingsToDisplay.slice((currentPage - 1) * OPTION_PER_PAGE, currentPage * OPTION_PER_PAGE).forEach((val, i) =>
    {
        const [settingName, setting] = val as [string, DisplayedSetting];

        const disabledSetting = !setting.active(settingChar!)
          || (
              `others${subMenu}` in settingChar!.MPA[ModuleTitle.Authority]
              && `self${subMenu}` in settingChar!.MPA[ModuleTitle.Authority]
              && !IsMemberNumberInAuthGroup(
                  Player.MemberNumber ?? -1,
                  settingChar!.MPA[ModuleTitle.Authority][`others${subMenu}`] as AuthorityGroup,
                  settingChar!.MPA[ModuleTitle.Authority][`self${subMenu}`] as boolean,
                  settingChar!
              )
          )
          || (
              !Player.CanInteract() && (
                  (settingChar?.MemberNumber === Player.MemberNumber
                  && !Player.MPA[ModuleTitle.Authority].boundAccessSelf)
                  || (settingChar?.MemberNumber !== Player.MemberNumber
                  && !Player.MPA[ModuleTitle.Authority].boundAccessOthers)
              )
          );

        if (IsCheckboxSetting(setting))
        {
            DrawCheckbox(
                OPTION_LEFT,
                OPTION_TOP + (i * (OPTION_GAP + OPTION_HEIGHT)),
                OPTION_CHECKBOX_SIZE,
                OPTION_CHECKBOX_SIZE,
                LocalizedText(setting.label)
                    .replaceAll("TargetCharacter", (settingChar?.Nickname || settingChar?.Name) ?? "")
                    .replaceAll("TargetPronounPossessive", settingChar?.GetPronouns() === "SheHer" ? "her" : "his"),
                !!settingChar!.MPA[subMenu][settingName],
                disabledSetting,
                "Black"
            );
        }
        else if (IsOptionSetting(setting))
        {
            const index = setting.options.indexOf(settingChar!.MPA[subMenu][settingName] as string);
            const optLen = setting.options.length;

            // Can't decrease authority beyond if the player is not of that rank
            const profileOrExcludes = (subMenu !== ModuleTitle.Authority) || !AUTHORITY_GROUP_OPTIONS.includes(settingChar!.MPA[subMenu][settingName]);
            const prevDisabled = !(profileOrExcludes || AuthorityIsComparisonToCharacter(settingChar!.MPA[subMenu][settingName] as AuthorityGroup, ">=", Player.MemberNumber ?? -1, settingChar!));
            const nextDisabled = !(profileOrExcludes || AuthorityIsComparisonToCharacter(settingChar!.MPA[subMenu][settingName] as AuthorityGroup, ">", Player.MemberNumber ?? -1, settingChar!))
              && settingChar!.MPA[subMenu][settingName] !== "Self";

            DrawBackNextButton(
                OPTION_LEFT,
                OPTION_TOP + (i * (OPTION_GAP + OPTION_HEIGHT)),
                OPTION_BACK_NEXT_WIDTH,
                OPTION_HEIGHT,
                LocalizedText(settingChar!.MPA[subMenu][settingName] as string),
                !(disabledSetting || (prevDisabled && nextDisabled)) ? "#ffffff" : "#aaaaaa",
                "",
                () => LocalizedText(prevDisabled ? "" : (setting.loop ? setting.options[(index - 1 + optLen) % optLen] : index > 0 ? setting.options[index - 1] : "")),
                () => LocalizedText(nextDisabled ? "" : (setting.loop ? setting.options[(index + 1 + optLen) % optLen] : index + 1 < optLen ? setting.options[index + 1] : "")),
                disabledSetting || (prevDisabled && nextDisabled)
            );
            DrawTextFit(
                LocalizedText(setting.label)
                    .replaceAll("TargetCharacter", (settingChar?.Nickname || settingChar?.Name) ?? "")
                    .replaceAll("TargetPronounPossessive", settingChar?.GetPronouns() === "SheHer" ? "her" : "his"),
                OPTION_LEFT + OPTION_BACK_NEXT_WIDTH + (OPTION_GAP * 2),
                OPTION_TOP + (i * (OPTION_GAP + OPTION_HEIGHT) + Math.ceil(OPTION_HEIGHT / 2)),
                CANVAS_WIDTH - (OPTION_LEFT * 2) - OPTION_BACK_NEXT_WIDTH,
                "Black",
                "Gray"
            );
        }
        else if (IsTextSetting(setting) || IsNumberSetting(setting))
        {
            const id = ElementName(subMenu, settingName);
            ElementPositionFixed(
                id,
                OPTION_LEFT,
                OPTION_TOP + (i * (OPTION_GAP + OPTION_HEIGHT)),
                setting.width ?? OPTION_TEXT_WIDTH,
                OPTION_HEIGHT
            );
            if (disabledSetting)
            {
                ElementSetAttribute(id, "disabled", "true");
            }
            else
            {
                ElementRemoveAttribute(id, "disabled");
            }
            DrawTextFit(
                LocalizedText(setting.label)
                    .replaceAll("TargetCharacter", (settingChar?.Nickname || settingChar?.Name) ?? "")
                    .replaceAll("TargetPronounPossessive", settingChar?.GetPronouns() === "SheHer" ? "her" : "his"),
                OPTION_LEFT + (setting.width ?? OPTION_TEXT_WIDTH) + (OPTION_GAP * 2),
                OPTION_TOP + (i * (OPTION_GAP + OPTION_HEIGHT)) + Math.ceil(OPTION_HEIGHT / 2),
                CANVAS_WIDTH - (OPTION_LEFT * 2) - (setting.width ?? OPTION_TEXT_WIDTH),
                "Black",
                "Gray"
            );
        }
    });
}

function GetClickedOption(subMenu: ModuleTitle): void
{
    // Shouldn't be needed but acts as failsafe and makes typescript happy
    if (!settingChar) { return; }

    // Settings have to be displayable and have a value exist in the stored settings
    const settingsToDisplay = Object.entries(defaultSettings[subMenu] ?? {})
        .filter(([key, setting]) => IsDisplaySetting(setting) && (key in (settingChar?.MPA[subMenu] ?? {})));

    // Loop through all the options and check if the click occured in the type's corresponding click zone
    settingsToDisplay.slice((currentPage - 1) * OPTION_PER_PAGE, currentPage * OPTION_PER_PAGE).forEach((val, i) =>
    {
        const [settingName, setting] = val as [string, DisplayedSetting];

        const disabledSetting = !setting.active(settingChar!)
          || (
              `others${subMenu}` in settingChar!.MPA[ModuleTitle.Authority]
              && `self${subMenu}` in settingChar!.MPA[ModuleTitle.Authority]
              && !IsMemberNumberInAuthGroup(
                  Player.MemberNumber ?? -1,
                  settingChar!.MPA[ModuleTitle.Authority][`others${subMenu}`] as AuthorityGroup,
                  settingChar!.MPA[ModuleTitle.Authority][`self${subMenu}`] as boolean,
                  settingChar!
              )
          )
          || (
              !Player.CanInteract() && (
                  (settingChar?.MemberNumber === Player.MemberNumber
                  && !Player.MPA[ModuleTitle.Authority].boundAccessSelf)
                  || (settingChar?.MemberNumber !== Player.MemberNumber
                  && !Player.MPA[ModuleTitle.Authority].boundAccessOthers)
              )
          );

        if (IsCheckboxSetting(setting))
        {
            if (
                MouseIn(
                    OPTION_LEFT,
                    OPTION_TOP + (i * (OPTION_GAP + OPTION_HEIGHT)),
                    OPTION_CHECKBOX_SIZE,
                    OPTION_CHECKBOX_SIZE
                )
                && !disabledSetting
            )
            {
                settingChar!.MPA[subMenu][settingName] = !settingChar!.MPA[subMenu][settingName];
                if (setting.onSet)
                {
                    setting.onSet(settingChar!, settingChar!.MPA[subMenu][settingName], !settingChar!.MPA[subMenu][settingName]);
                }
                settingsEdited = true;
            }
        }
        else if (IsOptionSetting(setting))
        {
            const index = setting.options.indexOf(settingChar!.MPA[subMenu][settingName] as string);
            const optLen = setting.options.length;
            // Back arrow
            if (
                MouseIn(
                    OPTION_LEFT,
                    OPTION_TOP + (i * (OPTION_GAP + OPTION_HEIGHT)),
                    Math.floor(OPTION_BACK_NEXT_WIDTH / 2),
                    OPTION_HEIGHT
                )
                && !disabledSetting
                && (setting.loop
                || index > 0)
                // Can't decrease authority beyond if the player is not of that rank
                && (subMenu !== ModuleTitle.Authority
                || !AUTHORITY_GROUP_OPTIONS.includes(settingChar!.MPA[subMenu][settingName])
                || AuthorityIsComparisonToCharacter(settingChar!.MPA[subMenu][settingName] as AuthorityGroup, ">=", Player.MemberNumber ?? -1, settingChar!))
            )
            {
                const prevValue = settingChar!.MPA[subMenu][settingName];
                settingChar!.MPA[subMenu][settingName] = setting.options[(index - 1 + optLen) % optLen];
                if (setting.onSet)
                {
                    setting.onSet(settingChar!, setting.options[(index - 1 + optLen) % optLen], prevValue);
                }
                settingsEdited = true;
            }
            // Next arrow
            else if (
                MouseIn(
                    OPTION_LEFT + Math.floor(OPTION_BACK_NEXT_WIDTH / 2),
                    OPTION_TOP + (i * (OPTION_GAP + OPTION_HEIGHT)),
                    Math.ceil(OPTION_BACK_NEXT_WIDTH / 2),
                    OPTION_HEIGHT
                )
                && !disabledSetting
                && (setting.loop
                || index + 1 < setting.options.length)
                // Can't increase authority beyond what the player who is setting it is
                && (subMenu !== ModuleTitle.Authority
                || !AUTHORITY_GROUP_OPTIONS.includes(settingChar!.MPA[subMenu][settingName])
                || AuthorityIsComparisonToCharacter(settingChar!.MPA[subMenu][settingName] as AuthorityGroup, ">", Player.MemberNumber ?? -1, settingChar!))
            )
            {
                const prevValue = settingChar!.MPA[subMenu][settingName];
                settingChar!.MPA[subMenu][settingName] = setting.options[(index + 1 + optLen) % optLen];
                if (setting.onSet)
                {
                    setting.onSet(settingChar!, setting.options[(index + 1 + optLen) % optLen], prevValue);
                }
                settingsEdited = true;
            }
        }
    });
}

export function ExitButtonPressed(): void
{
    if (currentMenu === null)
    {
        if (window.MPA.menuLoaded)
        {
            window.MPA.menuLoaded = false;
        }
        PreferenceMenuExit();
    }
    else if (currentMenu === "RESET_Settings")
    {
        currentMenu = null;
    }
    else
    {
        // Save all text fields to their respective setting
        UpdateAndDeleteHTMLElements(currentMenu);
        currentPage = 1;
        maxPages = 1;
        currentMenu = null;
    }
}

export function PreferenceMenuClick(): void
{
    if (MouseIn(...EXIT_POSISTION))
    {
        ExitButtonPressed();
        return;
    }

    if (settingChar?.MemberNumber === Player.MemberNumber && currentMenu === null)
    {
        if (MouseIn(...WIKI_POSITION))
        {
            window.open(WIKI_LINK, "_blank")?.focus();
            return;
        }
        if (MouseIn(...DISCORD_POSITION))
        {
            window.open(DISCORD_INVITE, "_blank")?.focus();
            return;
        }
        if (MouseIn(...RESET_POSITION))
        {
            currentMenu = "RESET_Settings";
            allowResetTime = Date.now() + 10000;
            return;
        }
        if (MouseIn(...IMPORT_POSITION))
        {
            ImportSettingsFromClipboard().then(() =>
            {
                settingsAlertText = "Settings imported from clipboard";
            },
            () =>
            {
                settingsAlertText = "Failed to import settings";
            }).finally(() => showSettingsAlert = Date.now() + 5000);
            return;
        }
        if (MouseIn(...EXPORT_POSITION))
        {
            ExportSettingsToClipboard().then(() =>
            {
                settingsAlertText = "Settings copied to clipboard";
            },
            () =>
            {
                settingsAlertText = "Failed to export settings";
            }).finally(() => showSettingsAlert = Date.now() + 5000);
            return;
        }
    }

    // Get the submenu clicked options
    if (currentMenu === null && GetClickedMenu(MENU_CATEGORIES()) !== null)
    {
        currentMenu = GetClickedMenu(MENU_CATEGORIES());
        currentPage = 1;
        maxPages = Math.ceil(Object.entries(defaultSettings[currentMenu ?? ""] ?? {})
            .filter(([key, setting]) => IsDisplaySetting(setting) && (key in (settingChar?.MPA[currentMenu ?? ""] ?? {})))
            .length / OPTION_PER_PAGE);
        CreateHTMLElements(currentMenu);
    }
    if (currentMenu === "RESET_Settings")
    {
        ResetMenuClick();
        return;
    }
    // Get option of the current menu
    if (currentMenu !== null)
    {
        // Next and previous buttons
        // Only check if setting page needs it
        if (Object.entries(defaultSettings[currentMenu ?? ""] ?? {})
            .filter(([key, setting]) => IsDisplaySetting(setting) && (key in (settingChar?.MPA[currentMenu ?? ""] ?? {})))
            .length > OPTION_PER_PAGE
        )
        {
            if (MouseIn(...NEXT_BUTTON_POS) && currentPage < maxPages)
            {
                UpdateAndDeleteHTMLElements(currentMenu);
                currentPage++;
                CreateHTMLElements(currentMenu);
                return;
            }
            if (MouseIn(...PREV_BUTTON_POS) && currentPage > 1)
            {
                UpdateAndDeleteHTMLElements(currentMenu);
                currentPage--;
                CreateHTMLElements(currentMenu);
                return;
            }
        }
        GetClickedOption(currentMenu);
    }

    return;
}

function ResetMenuClick(): void
{
    if (MouseIn(...RESET_CONFIRM_POSITION) && Date.now() > allowResetTime)
    {
        ResetStorage();
        currentMenu = null;
        allowResetTime = 0;
    }

    if (MouseIn(...RESET_CANCEL_POSITION))
    {
        currentMenu = null;
        allowResetTime = 0;
    }
}

function ResetMenuRun(): void
{
    const prevTextAlign = MainCanvas.textAlign;
    MainCanvas.textAlign = "center";

    DrawText(
        LocalizedText("WARNING: Are you sure you want to reset your MPA settings and data back to default?"),
        CANVAS_WIDTH / 2,
        250,
        "#000000",
        "#aaaaaa"
    );
    DrawText(
        // A little homage to BCX and LSCG for being great open source references on this project
        LocalizedText("This action can not be undone!"),
        CANVAS_WIDTH / 2,
        400,
        "#ff0000",
        "#aaaaaa"
    );
    DrawText(
        LocalizedText("Export and save your settings BEFORE confirming if you are unsure."),
        CANVAS_WIDTH / 2,
        550,
        "#696969",
        "#aaaaaa"
    );

    const now = Date.now();
    if (now <= allowResetTime)
    {
        DrawButton(
            ...RESET_CONFIRM_POSITION,
            `${LocalizedText("Confirm")} (${Math.floor((allowResetTime - now) / 1000)})`,
            "#aaaaaa",
            undefined,
            undefined,
            true
        );
    }
    else
    {
        DrawButton(
            ...RESET_CONFIRM_POSITION,
            LocalizedText("Confirm"),
            "#ff0000"
        );
    }

    DrawButton(
        ...RESET_CANCEL_POSITION,
        LocalizedText("Cancel"),
        "White"
    );

    MainCanvas.textAlign = prevTextAlign;
}

export function PreferenceMenuRun(): void
{
    if (currentMenu === "RESET_Settings")
    {
        ResetMenuRun();
        return;
    }

    const prevTextAlign = MainCanvas.textAlign;
    DrawButton(...EXIT_POSISTION, "", "White", "Icons/Exit.png");
    MainCanvas.textAlign = "center";
    DrawText(`${LocalizedText("Maya's Petplay Additions")}${currentMenu ? ` - ${settingChar?.Nickname || settingChar?.Name}'s ${LocalizedText(MENU_TITLES[currentMenu] ?? currentMenu)}` : ""}`, 1000, 125, "Black", "Gray");

    // Wiki, Reset, import and export but only while Player
    if (settingChar?.MemberNumber === Player.MemberNumber && currentMenu === null)
    {
        if (showSettingsAlert >= Date.now())
        {
            MainCanvas.textAlign = "left";
            DrawTextFit(
                settingsAlertText,
                ...ALERT_POSITION,
                "Black",
                "Gray"
            );
        }
        MainCanvas.textAlign = "center";
        DrawButton(
            ...WIKI_POSITION,
            LocalizedText("Wiki"),
            "#ffffff",
            "",
            LocalizedText("Open the MPA wiki in a new tab")
        );
        DrawButton(
            ...DISCORD_POSITION,
            "Discord",
            "#ffffff",
            ICONS.DISCORD,
            "Join the MPA discord!"
        );
        DrawButton(
            ...RESET_POSITION,
            LocalizedText("RESET"),
            "#ff2e2eaa",
            "",
            LocalizedText("Reset all your settings back to default")
        );
        DrawButton(
            ...IMPORT_POSITION,
            LocalizedText("Import"),
            "#ffffff",
            "",
            LocalizedText("Import the settings copied to your clipboard")
        );
        DrawButton(
            ...EXPORT_POSITION,
            LocalizedText("Export"),
            "#ffffff",
            "",
            LocalizedText("Export your current settings to the clipboard")
        );
        DrawTextFit(
            `${LocalizedText("Version")}: ${Player.MPA.version}`,
            ...VERSION_TEXT,
            "Black",
            "Gray"
        );
    }

    MainCanvas.textAlign = "left";
    if (currentMenu === null)
    {
        // Draw all the buttons to access the submenus
        DrawMenuOptions(MENU_CATEGORIES());
    }
    else
    {
        // Draw the options in the submenu
        DrawSubMenuOptions(currentMenu);
    }
    MainCanvas.textAlign = prevTextAlign;
    return;
}

function PreferenceMenuExit(): boolean | void
{
    // Shouldn't be needed but acts as failsafe and makes typescript happy
    if (!settingChar) { return; }

    if (settingsEdited)
    {
        if (settingChar.MemberNumber === Player.MemberNumber)
        {
            LevelSync(false, false, false);
            SaveStorage(true);
        }
        else
        {
            SendMPAMessage(
                {
                    message: "SettingPutRequest",
                    settings: settingChar.MPA
                },
                settingChar.MemberNumber
            );
        }
    }
    if (settingChar.MemberNumber === Player.MemberNumber)
    {
        PreferenceSubscreenExtensionsClear();
    }
    settingsEdited = false;
    settingChar = null;
    settingsOpen = false;
}

/**
 * Called once when the Preference Menu loads up after opening
 */
function PreferenceMenuLoad(): void
{
    // Shouldn't be needed but acts as failsafe and makes typescript happy
    if (!settingChar) { return; }
    settingsOpen = true;
}

function PlayerPreferenceMenuLoad(): void
{
    settingsEdited = false;
    settingChar = Player;
    PreferenceMenuLoad();
}

/**
 * Get the string with an MPA identifier in front
 */
export function ElementName(title: ModuleTitle | string, setting: string): string
{
    return `MPA_OPTION_${title}${setting}`;
}

/**
 * Create and hide all the HTML elements that are needed for the Preference Setting page
 */
function CreateHTMLElements(subMenu: ModuleTitle | null, page: number = currentPage): void
{
    if (!subMenu) { return; }
    // Shouldn't be needed but acts as failsafe and makes typescript happy
    if (!settingChar) { return; }

    Object.entries(defaultSettings[subMenu] ?? {}).slice((page - 1) * OPTION_PER_PAGE, page * OPTION_PER_PAGE).forEach((set) =>
    {
        const [settingName, setting] = set;
        const id = ElementName(subMenu, settingName);
        if (IsTextSetting(setting))
        {
            ElementCreateInput(id, "text", settingChar!.MPA[subMenu][settingName] as string, setting.maxChars ?? OPTION_TEXT_MAX_CHARS);
        }
        else if (IsNumberSetting(setting))
        {
            ElementCreateInput(id, "number", settingChar!.MPA[subMenu][settingName].toString());
            ElementSetAttribute(id, "min", setting.min.toString());
            ElementSetAttribute(id, "max", setting.max.toString());
            ElementSetAttribute(id, "inputmode", "decimal");
            if (setting.step)
            {
                ElementSetAttribute(id, "step", setting.step.toString());
            }
        }
    });
}
/**
 * Update the setting values to reflect those in the html elements and delete them after
 */
function UpdateAndDeleteHTMLElements(subMenu: ModuleTitle, page: number = currentPage): void
{
    // Shouldn't be needed but acts as failsafe and makes typescript happy
    if (!settingChar) { return; }

    // Update the virtual pet stats based on current values so the level doesn't jump around
    if (subMenu === ModuleTitle.VirtualPet)
    {
        LevelSync(false, false, false);
    }

    Object.entries(defaultSettings[subMenu] ?? {}).slice((page - 1) * OPTION_PER_PAGE, page * OPTION_PER_PAGE).forEach((set) =>
    {
        const [settingName, setting] = set;
        const id = ElementName(subMenu, settingName);
        if (IsTextSetting(setting))
        {
            if (settingChar!.MPA[subMenu][settingName] !== ElementValue(id))
            {
                settingChar!.MPA[subMenu][settingName] = ElementValue(id);
                settingsEdited = true;
            }
            ElementRemove(id);
        }
        if (IsNumberSetting(setting))
        {
            if (settingChar!.MPA[subMenu][settingName] !== Number(ElementValue(id)))
            {
                settingChar!.MPA[subMenu][settingName] = Number(ElementValue(id));
                settingsEdited = true;
            }
            ElementRemove(id);
        }
    });
}

export class SettingsModule extends Module
{
    get Title(): ModuleTitle
    {
        return ModuleTitle.Settings;
    }

    Load(): void
    {
        // Add settings to the extension options
        PreferenceRegisterExtensionSetting({
            Identifier: "MPA",
            ButtonText: LocalizedText("MPA Settings"),
            Image: ICONS.PAW,
            click: PreferenceMenuClick,
            run: PreferenceMenuRun,
            exit: PreferenceMenuExit,
            load: PlayerPreferenceMenuLoad
        });

        // When pressing escape, only go to main menu if in sub menu
        function EscapeHandler(event: KeyboardEvent): void
        {
            if (
                (event.key === "Escape" || event.key === "Esc")
                && settingsOpen
            )
            {
                if (currentMenu === null)
                {
                    PreferenceMenuExit();
                }
                else if (currentMenu === "RESET_Settings")
                {
                    allowResetTime = 0;
                }
                else
                {
                    UpdateAndDeleteHTMLElements(currentMenu);
                    currentPage = 1;
                    maxPages = 1;
                }
                currentMenu = null;
                event.stopPropagation();
            }
        }
        document.addEventListener("keypress", EscapeHandler, true);
        document.addEventListener("keydown", EscapeHandler, true);
    }

    Unload(): void
    {
        // Unload being empty is wanted, never unload settings
    }

    Reload(): void
    {
        // Reload being empty is wanted, never reload settings
    }
}
