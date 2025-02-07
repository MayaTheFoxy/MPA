import { RemoveHooks } from "../util/sdk";
import { CreateActivities, RemoveActivities } from "../util/activities";
import { AddDataSyncListeners, HookedMessage, RemoveDataSyncListeners } from "../util/messaging";

export enum ModuleTitle
{
    Unknown = "Unknown",
    Authority = "Authority",
    Activities = "Activities",
    Clicker = "Clicker",
    Settings = "Settings",
    VirtualPet = "VirtualPet",
    VirtualPetHUD = "VirtualPetHud",
    VirtualPetConditions = "VirtualPetConditions",
    DataSync = "DataSync",
    Profile = "Profile",
    SettingsOther = "SettingsOther",
    Private = "Private"
}

export const ModuleTitlePublicity: Partial<Record<ModuleTitle, boolean>> = {
    [ModuleTitle.Unknown]: false,
    [ModuleTitle.Authority]: true,
    [ModuleTitle.Activities]: true,
    [ModuleTitle.Clicker]: true,
    [ModuleTitle.Settings]: true,
    [ModuleTitle.VirtualPet]: true,
    [ModuleTitle.VirtualPetHUD]: false,
    [ModuleTitle.VirtualPetConditions]: true,
    [ModuleTitle.DataSync]: true,
    [ModuleTitle.Profile]: true,
    [ModuleTitle.SettingsOther]: true,
    [ModuleTitle.Private]: false
};

/**
 * Check if a module is public, allowing the data to be shared with others
 *
 * @param moduleTitle The module to check
 * @returns
 */
export function ModuleIsPublic(moduleTitle: ModuleTitle): boolean
{
    return ModuleTitlePublicity[moduleTitle] ?? true;
}

export abstract class Module
{
    get Title(): ModuleTitle
    {
        return ModuleTitle.Unknown;
    }

    get Activities(): CustomActivity[]
    {
        return [];
    }

    get Settings(): Setting[]
    {
        return [];
    }

    get SyncListeners(): HookedMessage[]
    {
        return [];
    }

    Load(): void
    {
        CreateActivities(this.Activities);
        AddDataSyncListeners(this.SyncListeners);
    }

    Unload(): void
    {
        RemoveHooks(this.Title);
        RemoveActivities(this.Activities);
        RemoveDataSyncListeners(this.Title);
    }

    Reload(): void
    {
        this.Unload();
        this.Load();
    }
}
