import { LocalizedText } from "../localization/localization";
import { settings as currentSettings } from "./registerModules";
import { AwaitInChatRoom, AwaitPlayer, Sleep } from "./sdk";
import { SettingSync } from "../modules/dataSync";
import { ModuleTitle } from "../modules/_module";
import { MPA_VERSION } from "./constants";
import { LevelSync } from "../modules/virtualPet";
import { NotifyPlayer } from "./messaging";
import { LoadLocalStorage, ResetLocalStorage } from "./localStorage";

const CHANGELOG_RAW_STABLE = "https://raw.githubusercontent.com/MayaTheFoxy/MPA/refs/heads/main/CHANGELOG.md";
const CHANGELOG_RAW_DEV = "https://raw.githubusercontent.com/MayaTheFoxy/MPA/refs/heads/dev/CHANGELOG.md";

const CHANGELOG_STABLE = "https://github.com/MayaTheFoxy/MPA/blob/main/CHANGELOG.md";
const CHANGELOG_DEV = "https://github.com/MayaTheFoxy/MPA/blob/dev/CHANGELOG.md";

const VERSION_STABLE_REGEX = /^\d+\.\d+\.\d+$/;
// const VERSION_DEV_REGEX = /^\d+\.\d+\.\d+\.\d+$/;

/**
 * Fetch the changelog from the repo
 * @returns
 */
async function FetchLatestChangelog(): Promise<void>
{
    const isStable = VERSION_STABLE_REGEX.test(MPA_VERSION);
    const url = isStable ? CHANGELOG_RAW_STABLE : CHANGELOG_RAW_DEV;
    try
    {
        const response = await fetch(url);
        if (!response.ok)
        {
            console.warn(`MPA: Failed to fetch CHANGELOG.md: ${response.statusText}`);
        }

        const changelog = await response.text();
        // Use a regular expression to extract the latest release section
        const matches = /# (\d+\.\d+\.\d+(?:\.\d+)?)+\n([\s\S]*?)(?=\n# |$)/.exec(changelog);

        if (matches)
        {
            const version = matches[1];

            if (version === MPA_VERSION)
            {
                const changes = matches[2].trim();
                while (true)
                {
                    await AwaitInChatRoom();
                    await Sleep(100);
                    if (ChatRoomCharacter.length > 0)
                    {
                        NotifyPlayer(`<b style='text-align:center;width:100%;display:block'>MPA Updated</b>
Current MPA Version: ${MPA_VERSION}
Changes from previous version:
${changes}
<a href="${isStable ? CHANGELOG_STABLE : CHANGELOG_DEV}" target="_blank">See Full Changelog</a>`);
                        break;
                    }
                }
                return;
            }
        }
        console.warn("MPA: Could not get the latest MPA Changelogs");
    }
    catch (error)
    {
        console.error(`Error: ${error}`);
    }
}

function MPAUpdateCheck(settings: MPARecords): void
{
    if ((settings.version as any) !== MPA_VERSION)
    {
        const isStable = VERSION_STABLE_REGEX.test(MPA_VERSION);
        ServerAccountBeep({
            MemberNumber: Player.MemberNumber ?? -1,
            MemberName: LocalizedText("MPA"),
            ChatRoomSpace: "X",
            ChatRoomName: LocalizedText("MPA Updated"),
            Private: false,
            BeepType: "",
            Message: `MPA has been updated. See the changelog here:\n${isStable ? CHANGELOG_STABLE : CHANGELOG_DEV}`
        });
        (settings.version as any) = MPA_VERSION;
        SaveStorage(false);
        FetchLatestChangelog();
    }
}

export async function LoadStorage(): Promise<void>
{
    // Ensure the player is loaded before attempting to read the extention settings
    await AwaitPlayer();
    LoadLocalStorage();

    const settings: MPARecords = JSON.parse(LZString.decompressFromBase64(Player.ExtensionSettings?.MPA ?? "") ?? "{}") ?? {};

    Object.entries(currentSettings).forEach((category) =>
    {
        const [settingTitle, categorySettings] = category as [ModuleTitle, MPACategorySettings];
        for (const [settingName, set] of Object.entries(categorySettings))
        {
            // Create the place for data if it does not exist
            if (!(settingTitle in settings))
            {
                settings[settingTitle] = {};
            }
            // Setting already set
            // Verify it is good data
            if (settingName in settings[settingTitle])
            {
                // If current value is not in the options
                if (
                    (currentSettings?.[settingTitle]?.[settingName]?.type === "checkbox"
                      && typeof settings[settingTitle][settingName] !== "boolean")
                    || (currentSettings?.[settingTitle]?.[settingName]?.type === "number"
                      && isNaN(settings[settingTitle][settingName]))
                    || ("options" in (currentSettings?.[settingTitle]?.[settingName] ?? {})
                      && !((currentSettings?.[settingTitle]?.[settingName] as OptionSetting)?.options ?? []).includes(settings[settingTitle][settingName]))
                )
                {
                    settings[settingTitle][settingName] = set.value;
                    console.warn(`MPA: Invalid setting of "${settings[settingTitle][settingName]}" at ${settingTitle}->${settingName}, resetting to default`);
                }
                continue;
            }
            settings[settingTitle][settingName] = set.value;
        }
    });

    // Port old onwers to new owners
    if (settings[ModuleTitle.Authority].newOwners.owners.length === 0 && settings[ModuleTitle.Authority].owners !== "")
    {
        settings[ModuleTitle.Authority].newOwners.owners = ((settings[ModuleTitle.Authority].owners ?? "") as string).split(",").map((x) => Number(x));
    }

    // Check and notify if there is an update
    MPAUpdateCheck(settings);

    Player.MPA = settings;
    return;
}

export function SaveStorage(syncWithOthers: boolean = true): void
{
    if (!Player.MPA || !Player.ExtensionSettings)
    {
        return;
    }
    // Prune self from owner list if added
    Player.MPA[ModuleTitle.Authority].newOwners.owners = Player.MPA[ModuleTitle.Authority].newOwners.owners.filter((val) => Number(val) !== Player.MemberNumber);
    Player.ExtensionSettings.MPA = LZString.compressToBase64(JSON.stringify(Player.MPA));
    ServerPlayerExtensionSettingsSync("MPA");
    if (syncWithOthers)
    {
        SettingSync(false);
    }
}

export async function ResetStorage(): Promise<void>
{
    delete (Player.ExtensionSettings as any).MPA;
    Player.ExtensionSettings.MPA = LZString.compressToBase64(JSON.stringify({ version: MPA_VERSION }));
    await LoadStorage();
    ResetLocalStorage();
    SaveStorage();
    return;
}

export async function ExportSettingsToClipboard(): Promise<void>
{
    return navigator.clipboard.writeText(LZString.compressToBase64(JSON.stringify(Player.MPA)));
}

export async function ImportSettingsFromClipboard(): Promise<void>
{
    return new Promise((resolve, reject) =>
    {
        navigator.clipboard.readText().then((text) =>
        {
            try
            {
                const newSettings: MPARecords = JSON.parse(LZString.decompressFromBase64(text ?? "") ?? "{}");
                // Create a locally copy to modify in case it fails and need to revert
                // Transaction happens or not at all
                const currentSettings: MPARecords = JSON.parse(JSON.stringify(Player.MPA));

                // Virtual pet levels will be replaced anyway, set current time so now to not interfer with syncing later
                currentSettings[ModuleTitle.VirtualPet].levels.lastUpdated = Date.now();
                currentSettings[ModuleTitle.VirtualPet].levels.lastOnline = Date.now();

                for (const key in newSettings)
                {
                    if (newSettings[key] !== undefined)
                    {
                        // Only update the value if the newRecord key exists and is not undefined
                        currentSettings[key as keyof MPARecords] = newSettings[key];
                    }
                }

                // Verify new settings are good
                // If bad data  return reject();

                // Set the levels update so that they retain the same value when saved after syncing again
                currentSettings[ModuleTitle.VirtualPet].levels.lastUpdated = Date.now() - (currentSettings[ModuleTitle.VirtualPet].levels.lastOnline - currentSettings[ModuleTitle.VirtualPet].levels.lastUpdated);
                currentSettings[ModuleTitle.VirtualPet].levels.lastOnline = Date.now();
                Player.MPA = currentSettings;
                LevelSync(false, false, false);

                SaveStorage(true);
            }
            catch (error)
            {
                console.warn(error);
                return reject();
            }

            return resolve();
        }, () => reject());
    });
}
