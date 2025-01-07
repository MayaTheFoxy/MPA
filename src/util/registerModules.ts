import { Module } from "../modules/_module";
import { LoadStorage } from "./storage";
import { DataSyncModule } from "../modules/dataSync";
import { SettingsModule } from "../modules/settings";
import { ActivitiesModule } from "../modules/activities";
import { ClickerModule } from "../modules/clicker";
import { VirtualPetModule } from "../modules/virtualPet";
import { VirtualPetHUDModule } from "../modules/virtualPetHUD";
import { VirtualPetConditionsModule } from "../modules/virtualPetConditions";
import { ProfileModule } from "../modules/profile";
import { SettingsOtherModule } from "../modules/settingsOthers";
import { AuthorityModule } from "../modules/authority";
import { PrivateModule } from "../modules/private";

let modulesRegistered = false;

export const modules: Module[] = [
    new DataSyncModule(),
    new SettingsModule(),
    new ActivitiesModule(),
    new ClickerModule(),
    new VirtualPetModule(),
    new VirtualPetHUDModule(),
    new VirtualPetConditionsModule(),
    new ProfileModule(),
    new SettingsOtherModule(),
    new AuthorityModule(),
    new PrivateModule()
];

export const settings: Partial<MPASettings> = {};

export async function RegisterModules(): Promise<void>
{
    // No duplicate module registering
    if (modulesRegistered) { return; }

    modules.forEach((module) =>
    {
        // Get all the settings
        const modSet = module.Settings;
        const newSettings = {};
        modSet.forEach((set) =>
        {
            newSettings[set.name] = set;
        });
        if (Object.keys(newSettings).length !== 0)
        {
            settings[module.Title] = newSettings;
        }
    });
    await LoadStorage();

    // Load the modules
    modules.forEach((module) =>
    {
        module.Load();
    });
    modulesRegistered = true;
}
