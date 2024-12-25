import { GetAttributeFromChatDictionary } from "../util/messaging";
import { activityImages, activityPrerequisites, activityTriggers } from "../util/activities";
import { HookFunction } from "../util/sdk";
import { Module, ModuleTitle } from "./_module";

const BELL_SOUND = new Audio("Audio\\BellMedium.mp3");

export class ActivitiesModule extends Module
{
    get Title(): ModuleTitle
    {
        return ModuleTitle.Activities;
    }

    get Activities(): CustomActivity[]
    {
        return [
            {
                Name: "FlickBell",
                MaxProgress: 50,
                Prerequisite: ["UseHands", "HasBell"],
                Targets: [{
                    group: "ItemNeck",
                    label: "Flick Bell",
                    actionSelf: "SourceCharacter flicks the bell on PronounPossessive collar."
                }, {
                    group: "ItemNeck",
                    label: "Flick Bell",
                    actionOthers: "SourceCharacter flicks the bell on TargetCharacter's collar."
                }],
                Image: "Assets\\Female3DCG\\ItemNeckAccessories\\Preview\\CollarBell.png",
                OnTrigger: () =>
                {
                    if (Player?.AudioSettings?.PlayItem)
                    {
                        BELL_SOUND.play();
                    }
                    return;
                }
            }
        ];
    }

    Load(): void
    {
        super.Load();

        // Prerequisite handling
        HookFunction(this.Title, "ActivityCheckPrerequisite", 1, (args, next) =>
        {
            const [prereq, acting, acted, group] = args;
            if (Object.keys(activityPrerequisites).includes(prereq))
            {
                return activityPrerequisites[prereq](acting, acted, group);
            }
            return next(args);
        });

        // Activity ontriggers
        HookFunction(this.Title, "ServerSend", 1, (args, next) =>
        {
            const data = args[1] as ServerChatRoomMessage;
            if (args[0] !== "ChatRoomChat" || data?.Type !== "Activity")
            {
                return next(args);
            }
            // @ts-ignore - TS not finding type automatically, it exists
            const activityName = data?.Dictionary?.find((x) => x.ActivityName)?.ActivityName as string | undefined;
            if (activityName?.startsWith("MPA_"))
            {
                data?.Dictionary?.push({
                    Tag: "MISSING ACTIVITY DESCRIPTION FOR KEYWORD " + data.Content,
                    Text: ActivityDictionaryText(data.Content)
                });

                if (Object.keys(activityTriggers).includes(activityName))
                {
                    const targetNumber = (data?.Dictionary?.find((x) => (x as TargetCharacterDictionaryEntry).TargetCharacter) as TargetCharacterDictionaryEntry)?.TargetCharacter ?? -1;
                    const target = ChatRoomCharacter?.find((c) => c.MemberNumber === targetNumber);
                    activityTriggers[activityName](target);
                }
            }

            return next(args);
        });

        // Draw custom images for activities
        HookFunction(this.Title, "ElementButton.CreateForActivity", 0, (args, next) =>
        {
            const activityName = args[1].Activity.Name;
            if (Object.keys(activityImages).includes(activityName))
            {
                if (!args[4])
                {
                    args[4] = {};
                }
                args[4].image = activityImages[activityName];
            }
            return next(args);
        });

        // Bell when other triggers
        HookFunction(ModuleTitle.Clicker, "ChatRoomMessage", 0, (args, next) =>
        {
            next(args);
            const data = args[0];
            if (
                data.Type === "Activity"
                && GetAttributeFromChatDictionary(data, "ActivityName") === "MPA_FlickBell"
                && GetAttributeFromChatDictionary(data, "SourceCharacter") !== Player.MemberNumber
                && Player.AudioSettings?.PlayItem
                && (GetAttributeFromChatDictionary(data, "TargetCharacter") === Player.MemberNumber
                || !Player.AudioSettings?.PlayItemPlayerOnly)
            )
            {
                BELL_SOUND.play();
            }
        });
    }

    Unload(): void
    {
        super.Unload();
    }
}
