import { Module, ModuleTitle } from "./_module";
import { FindCharacterInRoom, GetAttributeFromChatDictionary } from "../util/messaging";
import { activityImages, activityPrerequisites, activityReceived, activityTriggers } from "../util/activities";
import { HookFunction } from "../util/sdk";
import { ACTIVITY_NAME_PREFIX, BELL_SOUND } from "../util/constants";

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
                Prerequisite: ["UseHands"],
                CustomPrerequisite: {
                    Name: "HasBell",
                    Prerequisite: (_acting, acted, _group) =>
                    {
                        return InventoryGet(acted, "ItemNeck")?.Asset?.Name === "LeatherCollarBell"
                          || InventoryGet(acted, "ItemNeckAccessories")?.Asset?.Name === "CollarBell";
                    }
                },
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
                },
                OnReceive: (source, target, _group, _data) =>
                {
                    if (
                        source?.MemberNumber !== Player.MemberNumber
                        && Player.AudioSettings?.PlayItem
                        && (target?.MemberNumber === Player.MemberNumber
                        || !Player.AudioSettings.PlayItemPlayerOnly)
                    )
                    {
                        BELL_SOUND.play();
                    }
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
            if (activityName?.startsWith(ACTIVITY_NAME_PREFIX))
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

        // Activity on received
        HookFunction(ModuleTitle.Clicker, "ChatRoomMessage", 0, (args, next) =>
        {
            next(args);
            const data = args[0];
            if (
                data.Type === "Activity"
            )
            {
                const activityName = GetAttributeFromChatDictionary(data, "ActivityName") as string;
                if (!activityName.startsWith(ACTIVITY_NAME_PREFIX)
                  || !(activityName in activityReceived))
                {
                    return;
                }
                const sourceChar = FindCharacterInRoom(GetAttributeFromChatDictionary(data, "SourceCharacter"),
                    { MemberNumber: true, NickName: false, Name: false }) ?? undefined;
                const targetChar = FindCharacterInRoom(GetAttributeFromChatDictionary(data, "TargetCharacter"),
                    { MemberNumber: true, NickName: false, Name: false }) ?? undefined;
                const group = GetAttributeFromChatDictionary(data, "FocusGroupName");
                activityReceived[activityName](sourceChar, targetChar, group, data);
            }
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
    }

    Unload(): void
    {
        super.Unload();
    }
}
