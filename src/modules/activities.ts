import { Module, ModuleTitle } from "./_module";
import { FindCharacterInRoom, GetAttributeFromChatDictionary } from "../util/messaging";
import { activityImages, activityPrerequisites, activityReceived, activityTriggers } from "../util/activities";
import { HookFunction } from "../util/sdk";
import { ACTIVITY_NAME_PREFIX, BELL_SOUND, ICONS } from "../util/constants";

const RecieveBell: ActivityReceived = (source, target, _group, _data) =>
{
    if (
        Player.AudioSettings?.PlayItem
        && (!Player.AudioSettings.PlayItemPlayerOnly
          || source?.MemberNumber === Player.MemberNumber
          || target?.MemberNumber === Player.MemberNumber)
    )
    {
        BELL_SOUND.play();
    }
};

const PAW_TOOLTIP = document.createElement("img");
PAW_TOOLTIP.src = ICONS.PAW;
PAW_TOOLTIP.style.position = "absolute";
PAW_TOOLTIP.style.right = "1%";
PAW_TOOLTIP.style.bottom = "23%";
PAW_TOOLTIP.style.width = "1.4em";
PAW_TOOLTIP.style.height = "1.4em";

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
                    Name: "HasBellCollar",
                    Prerequisite: (_acting, acted, _group) =>
                    {
                        return InventoryGet(acted, "ItemNeck")?.Asset?.Name?.toLocaleLowerCase()?.includes("bell")
                          || InventoryGet(acted, "ItemNeckAccessories")?.Asset?.Name?.toLocaleLowerCase()?.includes("bell")
                          || false;
                    }
                },
                Targets: [{
                    group: "ItemNeck",
                    label: "Flick Bell",
                    actionSelf: "SourceCharacter flicks the bell on PronounPossessive collar.",
                    actionOthers: "SourceCharacter flicks the bell on TargetCharacter's collar."
                }],
                Image: "Assets\\Female3DCG\\ItemNeckAccessories\\Preview\\CollarBell.png",
                OnReceive: RecieveBell
            }, {
                Name: "FlickBell2",
                MaxProgress: 50,
                Prerequisite: ["UseHands"],
                CustomPrerequisite: {
                    Name: "HasBellNipples",
                    Prerequisite: (_acting, acted, _group) =>
                    {
                        return InventoryGet(acted, "ItemNipples")?.Asset?.Name?.toLocaleLowerCase()?.includes("bell") ?? false;
                    }
                },
                Targets: [{
                    group: "ItemNipples",
                    label: "Flick Bell",
                    actionSelf: "SourceCharacter flicks the bells on PronounPossessive nipple clamps.",
                    actionOthers: "SourceCharacter flicks the bells on TargetCharacter's nipple clamps."
                }],
                Image: "Assets\\Female3DCG\\ItemNipples\\Preview\\BellClamps.png",
                OnReceive: RecieveBell
            }, {
                Name: "FlickBell3",
                MaxProgress: 50,
                Prerequisite: ["UseHands"],
                CustomPrerequisite: {
                    Name: "HasBellClit",
                    Prerequisite: (_acting, acted, _group) =>
                    {
                        const clitPiercing = InventoryGet(acted, "ItemVulvaPiercings");
                        return clitPiercing?.Asset?.Name == "RoundClitPiercing" && clitPiercing?.Property?.TypeRecord?.typed == 2;
                    }
                },
                Targets: [{
                    group: "ItemVulvaPiercings",
                    label: "Flick Bell",
                    actionSelf: "SourceCharacter flicks the bell on PronounPossessive clit piercing.",
                    actionOthers: "SourceCharacter flicks the bell on TargetCharacter's clit piercing."
                }],
                Image: "Assets\\Female3DCG\\ItemVulvaPiercings\\Preview\\RoundClitPiercing.png",
                OnReceive: RecieveBell
            }, {
                Name: "FlickBell4",
                MaxProgress: 50,
                Prerequisite: ["UseHands"],
                CustomPrerequisite: {
                    Name: "HasBellNipplesPiercings",
                    Prerequisite: (_acting, acted, _group) =>
                    {
                        return InventoryGet(acted, "ItemNipplesPiercings")?.Asset?.Name?.toLocaleLowerCase()?.includes("bell") ?? false;
                    }
                },
                Targets: [{
                    group: "ItemNipples",
                    label: "Flick Bell",
                    actionSelf: "SourceCharacter flicks the bells on PronounPossessive nipple piercings.",
                    actionOthers: "SourceCharacter flicks the bells on TargetCharacter's nipple piercings."
                }],
                Image: "Assets\\Female3DCG\\ItemNipplesPiercings\\Preview\\BellPiercing.png",
                OnReceive: RecieveBell
            }, {
                Name: "StompOnce",
                MaxProgress: 50,
                Prerequisite: ["UseFeet"],
                CustomPrerequisite: {
                    Name: "HasHooves",
                    Prerequisite: (_acting, acted, _group) =>
                    {
                        return InventoryGet(acted, "ItemBoots")?.Asset?.Name?.toLocaleLowerCase()?.includes("pony")
                          || ["pony", "兽蹄鞋_luzi"].some((keyword) => InventoryGet(acted, "Shoes")?.Asset?.Name?.toLocaleLowerCase()?.includes(keyword));
                    }
                },
                Targets: [{
                    group: "ItemBoots",
                    label: "Stomp Once",
                    actionSelf: "SourceCharacter stomps PronounPossessive hoof on the ground once."
                }],
                Image: "Assets\\Female3DCG\\Shoes\\Preview\\PonyBoots.png"
            }, {
                Name: "StompTwice",
                MaxProgress: 50,
                Prerequisite: ["UseFeet"],
                CustomPrerequisite: {
                    Name: "HasHooves"
                },
                Targets: [{
                    group: "ItemBoots",
                    label: "Stomp Twice",
                    actionSelf: "SourceCharacter stomps PronounPossessive hoof on the ground twice."
                }],
                Image: "Assets\\Female3DCG\\Shoes\\Preview\\PonyBoots.png"
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
                const activityName = GetAttributeFromChatDictionary(data, "ActivityName") as string | undefined;
                if (!activityName?.startsWith(ACTIVITY_NAME_PREFIX)
                  || !(activityName in activityReceived))
                {
                    return;
                }
                const sourceChar = FindCharacterInRoom(GetAttributeFromChatDictionary(data, "SourceCharacter"),
                    { MemberNumber: true, Nickname: false, Name: false }) ?? undefined;
                const targetChar = FindCharacterInRoom(GetAttributeFromChatDictionary(data, "TargetCharacter"),
                    { MemberNumber: true, Nickname: false, Name: false }) ?? undefined;
                const group = GetAttributeFromChatDictionary(data, "FocusGroupName");
                activityReceived[activityName](sourceChar, targetChar, group, data);
            }
        });

        // Draw custom images for activities
        HookFunction(this.Title, "ElementButton.CreateForActivity", 0, (args, next) =>
        {
            const activityName = args[1].Activity.Name;
            const isMPAActivity = Object.keys(activityImages).includes(activityName);
            if (isMPAActivity)
            {
                if (!args[4])
                {
                    args[4] = {};
                }
                args[4].image = activityImages[activityName];
            }

            const buttonElement = next(args);

            if (isMPAActivity)
            {
                buttonElement.appendChild(PAW_TOOLTIP.cloneNode());
            }

            return buttonElement;
        });
    }

    Unload(): void
    {
        super.Unload();
    }
}
