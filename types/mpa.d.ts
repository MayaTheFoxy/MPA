// globals.d.ts

import { ModuleTitle } from "../src/util/settingTypes";
import { type NewPrerequisites } from "../src/modules/activities";
import { type MPAMessageContent } from "../src/util/messaging";

interface MPAWindow
{
    version: string;
    menuLoaded: boolean;
}

declare global
{
    interface Window
    {
        MPA: MPAWindow;
    }
    interface ExtensionSettings
    {
        MPA: string;
    }

    // Other characters may or may not have the addon
    interface Character
    {
        MPA?: MPARecords;
    }
    interface PlayerCharacter
    {
        MPA: MPARecords;
    }

    // Settings of MPA
    interface Setting
    {
        name: string;
        type: "checkbox" | "option" | "text" | "number" | "record";
        value: any;
    }
    interface DisplayedSetting extends Setting
    {
        active: (C: Character) => boolean;
        label: string;
    }
    interface CheckboxSetting extends DisplayedSetting
    {
        type: "checkbox";
        value: boolean;
        onSet?: (C: Character, value: boolean, prevValue: boolean) => void;
    }
    interface OptionSetting extends DisplayedSetting
    {
        type: "option";
        options: string[];
        value: string;
        loop: boolean;
        onSet?: (C: Character, value: string, prevValue: string) => void;
    }
    interface TextSetting extends DisplayedSetting
    {
        type: "text";
        value: string;
        width: number | null;
        maxChars: number | null;
    }
    interface NumberSetting extends DisplayedSetting
    {
        type: "number";
        value: number;
        width: number | null;
        min: number;
        max: number;
        step: number | null;
    }

    // Cumlative settings of all modules
    type MPACategorySettings = Record<string, Setting>;
    type MPASettings = Record<keyof typeof ModuleTitle, MPACategorySettings>;

    // Storage of the settings as records, trimming everything but value
    type MPARecord = Record<string, any>;
    type MPARecords = Record<keyof typeof ModuleTitle | "version", MPARecord>;

    // Type used to create an activity
    type AcitivityTrigger = (target: Character | undefined) => void;
    type Prerequisite = (acting: Character, acted: Character, group: AssetGroup) => boolean;
    type AllowedPrerequisites = ActivityPrerequisite | NewPrerequisites;
    interface CustomTarget
    {
        group: AssetGroupItemName;
        label: string;
        actionSelf?: string;
        actionOthers?: string;
    }
    interface CustomActivity extends Omit<Activity, "Name" | "ActivityID" | "Target" | "Prerequisite" | "MaxProgress">
    {
        Name: string;
        Targets: CustomTarget[];
        Image: string;
        OnTrigger?: AcitivityTrigger;
        Prerequisite: AllowedPrerequisites[];
        MaxProgress?: number;
    }
}

export {};
