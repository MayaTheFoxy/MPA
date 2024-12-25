import { LocalizedText } from "../localization/localization";
import { settings as currentSettings } from "./registerModules";
import { AwaitPlayer } from "./sdk";
import { SettingSync } from "../modules/dataSync";
import { ModuleTitle } from "../modules/_module";
import { MPA_VERSION } from "./constants";
import { LevelSync } from "../modules/virtualPet";

function MPAUpdateCheck(settings: MPARecords): void
{
    if ((settings.version as any) !== MPA_VERSION)
    {
        ServerAccountBeep({
            MemberNumber: Player.MemberNumber ?? -1,
            MemberName: LocalizedText("MPA"),
            ChatRoomSpace: "X",
            ChatRoomName: LocalizedText("MPA Updated"),
            Private: false,
            BeepType: "",
            Message: "MPA has been updated."
        });
        (settings.version as any) = MPA_VERSION;
        SaveStorage(false);
    }
}

export async function LoadStorage(): Promise<void>
{
    // Ensure the player is loaded before attempting to read the extention settings
    await AwaitPlayer();

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
            if (settingName in settings[settingTitle])
            {
                continue;
            }
            settings[settingTitle][settingName] = set.value;
        }
    });

    // Check and notify if there is an update
    MPAUpdateCheck(settings);

    Player.MPA = settings;
    return;
}

export function SaveStorage(syncWithOthers: boolean = true): void
{
    // Prune self from owner list if added
    Player.MPA[ModuleTitle.Authority].owners =
        (Player.MPA[ModuleTitle.Authority].owners as string).split(",")
            .filter((val) => Number(val) !== Player.MemberNumber).join(",");
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
