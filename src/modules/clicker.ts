import { bcxAPI, bcxFound, HookFunction } from "../util/sdk";
import { GetAttributeFromChatDictionary, RemoveOOCContentFromMessage } from "../util/messaging";
import { AuthorityGroup, IsMemberNumberInAuthGroup } from "../util/authority";
import { Module, ModuleTitle } from "./_module";
import { IsHardcoreOn } from "./profile";

import clicker1 from "../../assets/clicker1.mp3";
import clicker2 from "../../assets/clicker2.mp3";
import clicker3 from "../../assets/clicker3.mp3";

enum CLICKER_TYPE
{
    NONE,
    CHAT,
    EMOTE,
    ACTION
};

// Clicker sounds to play
// An array of audio files, 1 click in index 0, n+1 clicks in index n
const ALL_CLICKS: HTMLAudioElement[] =
[
    new Audio(clicker1),
    new Audio(clicker2),
    new Audio(clicker3)
];

/**
 * Get the Clicker settings of the Player
 */
const PlayerC: (C?: Character) => MPARecord = (C: Character = Player) =>
{
    return C.MPA?.[ModuleTitle.Clicker] ?? {};
};

/**
 * Get the total number of clicks in a string
 */
function ClickCount(str: string = ""): number
{
    let totalClicks = 0;
    (PlayerC().triggers as string)
        .split(",")
        .map((str: string) => str.trim())
        .filter((str) => str !== "")
        .forEach((trigger) =>
        {
            totalClicks += str.toLocaleLowerCase().match(new RegExp(trigger.toLocaleLowerCase(), "g"))?.length ?? 0;
        });
    return totalClicks;
}

/**
 * Play clicks to the user
 */
function PlayClickerSound(numberOfClicks: number = 0): void
{
    if (
        isNaN(numberOfClicks)
        || numberOfClicks <= 0
        || !PlayerC().enabled
    )
    {
        return;
    }

    ALL_CLICKS[Math.min(numberOfClicks - 1, ALL_CLICKS.length - 1)].play();
}

let bcxHooked = false;
function HookBCXClicker(): void
{
    if (bcxFound() && !bcxHooked)
    {
        bcxAPI()?.on?.("bcxLocalMessage", (data: any) =>
        {
            const message = data?.message as string | undefined;
            const prefix = "[Voice] ";
            if (
                PlayerC().enabled
                && PlayerC().bcxVoice
                && message?.startsWith(prefix)
            )
            {
                PlayClickerSound(ClickCount(message.substring(prefix.length)));
            }
        });
        bcxHooked = true;
    }
}

export class ClickerModule extends Module
{
    // BCX hook only loads once, unknown if can unhook for Unload()
    hasBeenLoaded = false;

    get Title(): ModuleTitle
    {
        return ModuleTitle.Clicker;
    }

    get Activities(): CustomActivity[]
    {
        return [
            {
                Name: "Clicker1",
                MaxProgress: 50,
                Prerequisite: ["UseHands"],
                CustomPrerequisite: {
                    Name: "HoldingClicker",
                    Prerequisite: (acting, _acted, _group) =>
                    {
                        return InventoryGet(acting, "ItemHandheld")?.Asset?.Name?.toLocaleLowerCase()?.includes("remote") ?? false;
                    }
                },
                Targets: [{
                    group: "ItemHands",
                    label: "Click Once",
                    actionSelf: "SourceCharacter presses the button on PronounPossessive clicker."
                }],
                Image: "Icons/AudioOn.png"
            }, {
                Name: "Clicker2",
                MaxProgress: 50,
                Prerequisite: ["UseHands"],
                CustomPrerequisite: {
                    Name: "HoldingClicker"
                },
                Targets: [{
                    group: "ItemHands",
                    label: "Click Twice",
                    actionSelf: "SourceCharacter presses the button on PronounPossessive clicker twice."
                }],
                Image: "Icons/AudioOn.png"
            }, {
                Name: "Clicker3",
                MaxProgress: 50,
                Prerequisite: ["UseHands"],
                CustomPrerequisite: {
                    Name: "HoldingClicker"
                },
                Targets: [{
                    group: "ItemHands",
                    label: "Click Thrice",
                    actionSelf: "SourceCharacter presses the button on PronounPossessive clicker three times."
                }],
                Image: "Icons/AudioOn.png"
            }
        ];
    }

    get Settings(): Setting[]
    {
        return [
            {
                name: "enabled",
                type: "checkbox",
                active: (C) => !IsHardcoreOn(C),
                value: false,
                label: "Enable auditory clicker"
            } as CheckboxSetting, {
                name: "triggers",
                type: "text",
                active: (C) => !!PlayerC(C).enabled,
                value: "~click~",
                label: "Phrases that trigger the click; Separate phrases with a comma",
                width: 384,
                maxChars: null
            } as TextSetting, {
                name: "chat",
                type: "checkbox",
                active: (C) => !!PlayerC(C).enabled,
                value: true,
                label: "Chat can trigger the clicker"
            } as CheckboxSetting, {
                name: "emotes",
                type: "checkbox",
                active: (C) => !!PlayerC(C).enabled,
                value: true,
                label: "Emotes can trigger the clicker"
            } as CheckboxSetting, {
                name: "activities",
                type: "checkbox",
                active: (C) => !!PlayerC(C).enabled,
                value: true,
                label: "Custom activities can trigger the clicker"
            } as CheckboxSetting, {
                name: "selfAuthed",
                type: "checkbox",
                active: (C) => !!PlayerC(C).enabled && PlayerC(C).authedGroup !== "Self",
                value: true,
                label: "Allow your own chat, emotes, & actions to trigger the clicker"
            } as CheckboxSetting, {
                name: "authedGroup",
                type: "option",
                active: (C) => !!PlayerC(C).enabled,
                value: "Friends" as AuthorityGroup,
                options: ["Public", "Friends", "Whitelist", "Lovers", "Owners", "Clubowner", "Self"],
                label: "Who will be able to trigger the clicker",
                loop: false,
                onSet(C)
                {
                    if (PlayerC(C).authedGroup === "Self")
                    {
                        PlayerC(C).selfAuthed = true;
                    }
                }
            } as OptionSetting, {
                name: "bcxVoice",
                type: "checkbox",
                active: (C) => !!PlayerC(C).enabled && bcxFound() && !IsHardcoreOn(C),
                value: true,
                label: "Allow BCX Listen to my voice rule to trigger the clicker; Requires BCX"
            } as CheckboxSetting
        ];
    }

    Load(): void
    {
        super.Load();

        // Chat, whisper, emote, and action triggers
        HookFunction(ModuleTitle.Clicker, "ChatRoomMessage", 0, (args, next) =>
        {
            const data = args[0];
            // If clicker is not enabled or invalid data, skip
            // Message sender not authed, skip
            if (
                !PlayerC().enabled
                || !args[0]?.Type
                || !args[0]?.Content
                || !args[0]?.Sender
                || !IsMemberNumberInAuthGroup(data.Sender!, PlayerC().authedGroup as AuthorityGroup, PlayerC().selfAuthed as boolean))
            {
                return next(args);
            }

            let clicks: number = 0;
            let clickType: CLICKER_TYPE = CLICKER_TYPE.NONE;
            const searchTag = `MISSING ACTIVITY DESCRIPTION FOR KEYWORD ${data.Content}`;
            switch (data.Type)
            {
                // Count the clicks in an emote or chat
                case "Chat":
                case "Whisper":
                    clicks = ClickCount(RemoveOOCContentFromMessage(data.Content));
                    clickType = CLICKER_TYPE.CHAT;
                    break;

                case "Emote":
                    clicks = ClickCount(RemoveOOCContentFromMessage(data.Content));
                    clickType = CLICKER_TYPE.EMOTE;
                    break;

                // Count the clicks in an action, (support custom actions)
                case "Action":
                    // Beeps
                    if (data.Content == "Beep")
                    {
                        clicks = ClickCount((data?.Dictionary?.filter((x) => (x as TextDictionaryEntry).Tag == "Beep")[0] as TextDictionaryEntry)?.Text ?? "");
                    }
                    // MBCH actions
                    else if (data.Dictionary?.reduce((acc, curr) => acc || ((curr as any).Tag === "MISSING TEXT IN \"Interface.csv\": " && (curr as any).Text === "\u200c"), false))
                    {
                        clicks = ClickCount(data.Content);
                    }
                    // BCX actions
                    else
                    {
                        clicks = ClickCount((data?.Dictionary?.filter((x) => (x as TextDictionaryEntry).Tag == `MISSING TEXT IN "Interface.csv": ${data?.Content}`)[0] as TextDictionaryEntry)?.Text ?? "");
                    }
                    clickType = CLICKER_TYPE.ACTION;
                    break;

                // Count the clicks in an activity
                case "Activity":
                    // Echo custom actions
                    if (data?.Dictionary?.some((item) => (item as TextDictionaryEntry)?.Tag === searchTag))
                    {
                        clicks = ClickCount((data?.Dictionary?.filter((x) => (x as TextDictionaryEntry).Tag === searchTag)[0] as TextDictionaryEntry)?.Text ?? "");
                    }
                    clickType = CLICKER_TYPE.ACTION;
                    break;

                default:
                    break;
            }

            if (clicks !== 0
              && ((clickType === CLICKER_TYPE.CHAT && PlayerC().chat)
                || (clickType === CLICKER_TYPE.EMOTE && PlayerC().emotes)
                || (clickType === CLICKER_TYPE.ACTION && PlayerC().activities)))
            {
                // Play the clicks if needed
                PlayClickerSound(clicks);
            }

            return next(args);
        });

        // Hand clicker activity trigger
        HookFunction(ModuleTitle.Clicker, "ChatRoomMessage", 0, (args, next) =>
        {
            next(args);
            const data = args[0];
            // For some reason _a.find is not defined
            // I don't know why, or why not
            // Bug is Schrödinger's bug, it only exists when I don't observe it
            // Logging the data object and the bug vanishes...
            // Edit: Made framework to handle finding attributes from ChatMessageDictionary. No issues..... so far...
            const activityName = GetAttributeFromChatDictionary(data, "ActivityName") as string;
            if (
                PlayerC().enabled
                && data.Type === "Activity"
                && activityName?.startsWith("MPA_Clicker")
                && IsMemberNumberInAuthGroup(data.Sender!, PlayerC().authedGroup as AuthorityGroup, PlayerC().selfAuthed as boolean)
            )
            {
                PlayClickerSound(Number(activityName.slice(-1)));
            }
        });

        // Hook into BCX listen to voice, may not be loaded right away, wait 15 seconds
        if (!this.hasBeenLoaded)
        {
            HookBCXClicker();
            const inverval = setInterval(() =>
            {
                if (bcxHooked)
                {
                    clearInterval(inverval);
                }
                else
                {
                    HookBCXClicker();
                }
            }, 60000);
        }
        this.hasBeenLoaded = true;
    }

    Unload(): void
    {
        super.Unload();
    }
}
