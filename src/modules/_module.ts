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
