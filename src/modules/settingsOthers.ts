import { ArrayToReadableString, FindCharacterInRoom, HookedMessage, MemberNumberToName, MPAMessageContent, MPANotifyPlayer, NotifyPlayer, SendMPAMessage } from "../util/messaging";
import { LocalizedText } from "../localization/localization";
import { ICONS } from "../util/constants";
import { bcxFound, HookFunction } from "../util/sdk";
import { Module, ModuleIsPublic, ModuleTitle } from "./_module";
import { currentMenu, ExitButtonPressed, MENU_TITLES, PreferenceMenuClick, PreferenceMenuRun, SetSettingChar } from "./settings";
import { SaveStorage } from "../util/storage";
import { LevelSync } from "./virtualPet";
import { IsMemberNumberInAuthGroup } from "../util/authority";
import { settings as defaultSettings } from "../util/registerModules";

// Other settings
const MPA_REMOTE = [1700, 765, 90, 90] as const;
// BCX moves the button down by 35 for some reason
const MPA_REMOTE_BCX = [1700, 800, 90, 90] as const;
// Positioning for version text
const VERSION_TEXT_SELF = [
    275,
    900,
    350
] as const;
const VERSION_TEXT_OTHER = [
    VERSION_TEXT_SELF[0],
    VERSION_TEXT_SELF[1] - 50,
    VERSION_TEXT_SELF[2]
] as const;

function ArraysEqual(arr1: any[], arr2: any[]): boolean
{
    if (arr1.length !== arr2.length)
    {
        return false;
    };
    return arr1.every((value, index) => value === arr2[index]);
}

export function ObjectDifferences(oldObj: object, newObj: object): object
{
    const differences = {};

    for (const key in oldObj)
    {
        // Key is missing in newObj
        if (!(key in newObj))
        {
            differences[key] = { old: oldObj[key], new: undefined };
            continue;
        }

        const oldValue = oldObj[key];
        const newValue = newObj[key];

        if (
            Array.isArray(oldValue)
            && Array.isArray(newValue)
        )
        {
            // If both are arrays, compare their contents
            if (!ArraysEqual(oldValue, newValue))
            {
                differences[key] = { old: oldValue, new: newValue };
            }
        }
        else if (
            typeof oldValue === "object"
            && typeof newValue === "object"
            && !Array.isArray(oldValue))
        {
            // If both are objects, recursively check for differences
            const diff = ObjectDifferences(oldValue, newValue);
            if (Object.keys(diff).length > 0)
            {
                differences[key] = diff;
            }
        }
        else if (oldValue !== newValue)
        {
            // If values are different, store the difference
            differences[key] = { old: oldValue, new: newValue };
        }
    }

    // New keys not found in the old object
    for (const key in newObj)
    {
        if (!(key in oldObj))
        {
            differences[key] = { old: undefined, new: newObj[key] };
        }
    }

    return differences;
}

export class SettingsOtherModule extends Module
{
    get Title(): ModuleTitle
    {
        return ModuleTitle.SettingsOther;
    }

    get SyncListeners(): HookedMessage[]
    {
        return [
            {
                module: this.Title,
                message: "SettingPutRequest",
                action: function (sender: Character, content: MPAMessageContent): void
                {
                    const orginalSettings = structuredClone(Player.MPA);
                    const vpEnabled = Player.MPA[ModuleTitle.VirtualPet].enabled;
                    const differences = ObjectDifferences(Player.MPA, content.settings);
                    // Don't change any private records from incoming sources
                    Object.keys(differences).forEach((moduleTitle) =>
                    {
                        if (!ModuleIsPublic(moduleTitle as ModuleTitle))
                        {
                            delete differences[moduleTitle];
                        }
                    });
                    const changedSettings: string[] = [];

                    // Delete the VP levels as they will be synced with the player instead
                    if (differences?.[ModuleTitle.VirtualPet]?.levels)
                    {
                        delete differences[ModuleTitle.VirtualPet].levels;
                        if (Object.keys(differences[ModuleTitle.VirtualPet]).length === 0)
                        {
                            delete differences[ModuleTitle.VirtualPet];
                        }
                    }
                    LevelSync(false, false, false);

                    // !!!!!!!!!!!!!!!!!!!!!!!
                    // Do Authority querys first
                    // !!!!!!!!!!!!!!!!!!!!!!!
                    const previousAuthority = JSON.parse(JSON.stringify(Player.MPA?.[ModuleTitle.Authority]));
                    const newAuthority = differences[ModuleTitle.Authority];
                    if (newAuthority)
                    {
                        delete differences[ModuleTitle.Authority];

                        let ownerOverride: any = null;
                        if (newAuthority?.newOwners?.owners)
                        {
                            ownerOverride = newAuthority.newOwners.owners;
                            delete newAuthority.newOwners.owners;
                        }

                        // Validate that authority can be changed based on current authority first
                        if (IsMemberNumberInAuthGroup(sender.MemberNumber ?? -1, previousAuthority[`others${ModuleTitle.Authority}`]))
                        {
                            changedSettings.push(LocalizedText(ModuleTitle.Authority));
                            for (const entry in newAuthority)
                            {
                                if (newAuthority[entry].new !== undefined && newAuthority[entry].old !== undefined)
                                {
                                    Player.MPA[ModuleTitle.Authority][entry] = newAuthority[entry].new;
                                }
                                // Sub setting object (new owners only for now)
                                else
                                {
                                    for (const subentry in newAuthority[entry])
                                    {
                                        if (newAuthority[entry][subentry].new !== undefined && newAuthority[entry][subentry].old !== undefined)
                                        {
                                            Player.MPA[ModuleTitle.Authority][entry][subentry] = newAuthority[entry][subentry].new;
                                        }
                                    }
                                }
                            }
                        }
                        if (ownerOverride)
                        {
                            // Owner changes
                            const previousOwners = ((orginalSettings?.[ModuleTitle.Authority]?.newOwners?.owners as number[]) ?? []).sort();
                            const pendingOwners: number[] = ownerOverride.new;
                            let ownerOutput = "";

                            // Owners added
                            if (IsMemberNumberInAuthGroup(sender.MemberNumber ?? -1, orginalSettings?.[ModuleTitle.Authority]?.newOwners?.othersAdd ?? "None"))
                            {
                                for (const owner of pendingOwners.filter((x) => !previousOwners.includes(x)))
                                {
                                    Player.MPA[ModuleTitle.Authority]?.newOwners?.owners?.push(owner);

                                    ownerOutput += LocalizedText("SourceCharacter added TargetCharacter (TargetMemberNumber) as MPA owner.")
                                        .replace("SourceCharacter", sender.Nickname || sender.Name)
                                        .replaceAll("TargetCharacter", MemberNumberToName(owner))
                                        .replaceAll("TargetMemberNumber", owner.toString());
                                    ownerOutput += "\n";

                                    if (owner !== sender.MemberNumber
                                      && FindCharacterInRoom(owner, { Nickname: false, Name: false }))
                                    {
                                        SendMPAMessage({ message: "ownerAdded" }, owner);
                                    }
                                }
                            }

                            // Owners removed
                            if (IsMemberNumberInAuthGroup(sender.MemberNumber ?? -1, orginalSettings?.[ModuleTitle.Authority]?.newOwners?.othersRemove ?? "None"))
                            {
                                for (const owner of previousOwners.filter((x) => !pendingOwners.includes(x)))
                                {
                                    const filtered = Player.MPA[ModuleTitle.Authority]?.newOwners?.owners?.filter((x: number) => x !== owner);
                                    if (filtered)
                                    {
                                        Player.MPA[ModuleTitle.Authority].newOwners.owners = filtered;
                                    }

                                    ownerOutput += LocalizedText("SourceCharacter removed TargetCharacter (TargetMemberNumber) as MPA owner.")
                                        .replace("SourceCharacter", sender.Nickname || sender.Name)
                                        .replaceAll("TargetCharacter", MemberNumberToName(owner))
                                        .replaceAll("TargetMemberNumber", owner.toString());
                                    ownerOutput += "\n";

                                    if (owner !== sender.MemberNumber
                                      && FindCharacterInRoom(owner, { Nickname: false, Name: false }))
                                    {
                                        SendMPAMessage({ message: "ownerRemoved" }, owner);
                                    }
                                }
                            }

                            // Allow self removal (if not have perms)
                            if (!pendingOwners.includes(sender.MemberNumber as number) && Player.MPA[ModuleTitle.Authority]?.newOwners?.owners?.includes(sender.MemberNumber))
                            {
                                const filtered = Player.MPA[ModuleTitle.Authority]?.newOwners?.owners?.filter((x: number) => x !== sender.MemberNumber);
                                if (filtered)
                                {
                                    Player.MPA[ModuleTitle.Authority].newOwners.owners = filtered;
                                }

                                ownerOutput += LocalizedText("SourceCharacter removed TargetCharacter (TargetMemberNumber) as MPA owner.")
                                    .replace("SourceCharacter", sender.Nickname || sender.Name)
                                    .replaceAll("TargetCharacter", MemberNumberToName(sender.MemberNumber ?? -1))
                                    .replaceAll("TargetMemberNumber", (sender.MemberNumber as number).toString());
                                ownerOutput += "\n";
                            }

                            // Owners have changed
                            if (ownerOutput !== "")
                            {
                                NotifyPlayer(ownerOutput.trimEnd());
                                // Make sure owners always sorted
                                Player.MPA[ModuleTitle.Authority]?.newOwners?.owners.sort((a, b) => a - b); ;
                            }
                        }
                    }

                    for (const title in differences)
                    {
                        // Validate that any settings can be changed with EITHER the old or new authority
                        // Sender is not authorized to change the settings, ignore and warn in console
                        if (!(IsMemberNumberInAuthGroup(sender.MemberNumber ?? -1, previousAuthority[`others${title}`] ?? "None")
                          || IsMemberNumberInAuthGroup(sender.MemberNumber ?? -1, Player.MPA?.[ModuleTitle.Authority]?.[`others${title}`] ?? "None"))
                        )
                        {
                            console.warn(`MPA: ${sender.Nickname || sender.Name} (${sender.MemberNumber}) tried to illegally modify your ${title} settings!`);
                            continue;
                        }

                        changedSettings.push(LocalizedText(MENU_TITLES[title as ModuleTitle] ?? title));

                        const moduleDiff = differences[title];
                        for (const entry in moduleDiff)
                        {
                            if (moduleDiff[entry].new !== undefined && moduleDiff[entry].old !== undefined)
                            {
                                Player.MPA[title as ModuleTitle][entry] = moduleDiff[entry].new;
                            }
                        }
                    }

                    // If hardcore is set, make sure its settings are set
                    if (Player.MPA[ModuleTitle.Profile].hardcore)
                    {
                        (defaultSettings[ModuleTitle.Profile]?.hardcore as any)?.onSet(Player);
                    }

                    // Catch Virtual Pet levels up to date if it was turned on / off
                    if (vpEnabled !== Player.MPA[ModuleTitle.VirtualPet].enabled)
                    {
                        Player.MPA[ModuleTitle.VirtualPet].levels.lastUpdated = Date.now();
                    }

                    if (changedSettings.length !== 0)
                    {
                        MPANotifyPlayer(
                            LocalizedText("SourceCharacter just updated your SettingsArray settings.")
                                .replace("SourceCharacter", sender.Nickname || sender.Name)
                                .replace("SettingsArray", ArrayToReadableString(changedSettings))
                        );
                    }

                    // LevelSync(false, false, false);
                    SaveStorage(true);
                }
            }, {
                module: this.Title,
                message: "EditingSettings",
                action: function (sender: Character, _content: MPAMessageContent): void
                {
                    if (Player.MPA[ModuleTitle.Authority].settingsNotify)
                    {
                        NotifyPlayer(LocalizedText("SourceCharacter is accessing your MPA settings.").replace("SourceCharacter", sender.Nickname || sender.Name), 30000);
                    }
                }
            }, {
                module: this.Title,
                message: "ownerAdded",
                action: function (sender: Character, _content: MPAMessageContent): void
                {
                    NotifyPlayer(LocalizedText("You have been added as an MPA owner for SourceCharacter.").replace("SourceCharacter", sender.Nickname || sender.Name));
                }
            }, {
                module: this.Title,
                message: "ownerRemoved",
                action: function (sender: Character, _content: MPAMessageContent): void
                {
                    NotifyPlayer(LocalizedText("You have been removed as an MPA owner for SourceCharacter.").replace("SourceCharacter", sender.Nickname || sender.Name));
                }
            }
        ];
    }

    Load(): void
    {
        super.Load();

        // Prio has to be 1 more than LSCG or BCX hooks
        const hookPriority = 12;
        HookFunction(this.Title, "InformationSheetRun", hookPriority, (args, next) =>
        {
            // LSCG or BCX subscreens open instead
            if (window.bcx?.inBcxSubscreen() || window.LSCG_REMOTE_WINDOW_OPEN)
            {
                return next(args);
            }

            // MPA Settings are open
            if (window.MPA.menuLoaded)
            {
                const char = InformationSheetSelection;
                if (char?.MPA && !char.IsPlayer() && currentMenu == null)
                {
                    DrawTextFit(
                        `${LocalizedText("Your Version")}: ${Player.MPA.version}`,
                        ...VERSION_TEXT_SELF,
                        "Black",
                        "Gray"
                    );
                    DrawTextFit(
                        `${LocalizedText("TargetCharacter's Version")}: ${char?.MPA.version}`.replace("TargetCharacter", char?.Nickname || char?.Name),
                        ...VERSION_TEXT_OTHER,
                        "Black",
                        "Gray"
                    );
                }
                PreferenceMenuRun();
                return;
            }

            next(args);
            // Draw the remote into settings button if applicable
            const char = InformationSheetSelection;
            if (char?.MPA && !char.IsPlayer())
            {
                const access = ServerChatRoomGetAllowItem(Player, char);
                DrawButton(
                    ...((bcxFound() ? MPA_REMOTE_BCX : MPA_REMOTE) as readonly [number, number, number, number]),
                    "",
                    access ? "#ffffff" : "#aaaaaa",
                    ICONS.PAW,
                    LocalizedText(access ? "MPA" : "MPA: No BC item permission"),
                    false
                );
            }
        });

        HookFunction(this.Title, "InformationSheetClick", hookPriority, (args, next) =>
        {
            // LSCG or BCX subscreens open instead
            if (window.bcx?.inBcxSubscreen() || window.LSCG_REMOTE_WINDOW_OPEN)
            {
                return next(args);
            }

            if (window.MPA.menuLoaded)
            {
                return PreferenceMenuClick();
            }

            const char = InformationSheetSelection;
            if (
                MouseIn(...((bcxFound() ? MPA_REMOTE_BCX : MPA_REMOTE) as readonly [number, number, number, number]))
                && char?.MPA
                && !char.IsPlayer()
                && ServerChatRoomGetAllowItem(Player, char)
            )
            {
                window.MPA.menuLoaded = true;
                // MPA is defined from check above, so other character is same as self in structure
                SetSettingChar(char as PlayerCharacter);
                SendMPAMessage({ message: "EditingSettings" }, char.MemberNumber);
            }
            else
            {
                return next(args);
            }
        });

        HookFunction(this.Title, "InformationSheetExit", hookPriority, (args, next) =>
        {
            if (window.MPA.menuLoaded)
            {
                ExitButtonPressed();
                return;
            }
            return next(args);
        });
    }

    Unload(): void
    {
        super.Unload();
    }
}
