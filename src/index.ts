import { RegisterModules } from "@/util/registerModules";
import { BuildAllCommands } from "@/commands/buildAllCommands";
import { MPA_VERSION } from "@/util/constants";

// Testing for Localization, ensuring all fields in the template
// import { SettingTest } from "./_tests/settingsLabels";
// SettingTest();
// import { ActivitiesTest } from "./_tests/activitiesText";
// ActivitiesTest();

console.log("Loading Maya's Petplay Additions");

BuildAllCommands();
RegisterModules();
window.MPA = {
    version: MPA_VERSION,
    menuLoaded: false
};
