// globals.d.ts

import { ModuleTitle } from "../src/util/settingTypes";
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
        type: "checkbox" | "option" | "text" | "number" | "record" | "custom";
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
    interface CustomSetting extends DisplayedSetting
    {
        type: "custom";
        /**
         * @param C The Character who you are viewing the settings for
         * @param hasPermission If the user has permission to edit the settings
         */
        OnClick: (C: PlayerCharacter, hasPermission: boolean) => void;
        /**
         * @param C The Character who you are viewing the settings for
         * @param hasPermission If the user has permission to edit the settings
         */
        OnExit: (C: PlayerCharacter, hasPermission?: boolean) => void;
        /**
         * @param C The Character who you are viewing the settings for
         * @param hasPermission If the user has permission to edit the settings
         */
        OnLoad: (C: PlayerCharacter, hasPermission?: boolean) => void;
        /**
         * @param C The Character who you are viewing the settings for
         * @param hasPermission If the user has permission to edit the settings
         */
        OnRun: (C: PlayerCharacter, hasPermission?: boolean) => void;
    }

    // Cumlative settings of all modules
    type MPACategorySettings = Record<string, Setting>;
    type MPASettings = Record<keyof typeof ModuleTitle, MPACategorySettings>;

    // Storage of the settings as records, trimming everything but value
    type MPARecord = Record<string, any>;
    type MPARecords = Record<keyof typeof ModuleTitle, MPARecord> 
        & {
            version: string,
            lastOnline: number
        };

    // Type used to create an activity
    type AcitivityTrigger = (target: Character | undefined) => void;
    type ActivityReceived = (source: Character | undefined, target: Character| undefined, group: AssetGroupItemName, data: ServerChatRoomMessage) => void;
    type Prerequisite = (acting: Character, acted: Character, group: AssetGroup) => boolean;
    type NewPrerequisite = 
    {
        Name: string;
        Prerequisite?: (acting: Character, acted: Character, group: AssetGroup) => boolean;
    };
    type AllowedPrerequisites = ActivityPrerequisite | NewPrerequisites;
    interface CustomTarget
    {
        group: AssetGroupItemName;
        label: string;
        actionSelf?: string;
        actionOthers?: string;
    }
    interface CustomActivity extends Omit<Activity, "Name" | "ActivityID" | "Target" | "MaxProgress">
    {
        Name: string;
        Targets: CustomTarget[];
        Image: string;
        OnTrigger?: AcitivityTrigger;
        OnReceive?: ActivityReceived;
        CustomPrerequisite?: NewPrerequisite | NewPrerequisite[];
        MaxProgress?: number;
    }

    interface MPALocalStorage
    {
        lastOnline: number;
    }
}

export {};
