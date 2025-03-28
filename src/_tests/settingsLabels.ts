import { IsDisplaySetting } from "../util/settingTypes";
import template from "../localization/template.json";
import { modules } from "../util/registerModules";

export function SettingTest()
{
    // Get all the labels of all the settings
    const labels: string[] = [];
    for (const module of modules)
    {
        module.Settings.forEach((setting) =>
        {
            if (IsDisplaySetting(setting))
            {
                labels.push(setting.label);
            }
        });
    }

    // Ensure all the labels exists in the localization template
    const labelsNotInTemplate: string[] = [];
    for (const label of labels)
    {
        if (!(label in template))
        {
            labelsNotInTemplate.push(label);
        }
    }

    if (labelsNotInTemplate.length === 0)
    {
        console.log("All setting labels are found in the localization template");
    }
    else
    {
        console.log(`The following labels are missing from the localication template:\n"${labelsNotInTemplate.join("\":\"\",\n\"")}":""`);
    }
}
