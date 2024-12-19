import { activityImages, activityPrerequisites, activityTriggers } from "../util/activities";
import { HookFunction } from "../util/sdk";
import { Module, ModuleTitle } from "./_module";

export class ActivitiesModule extends Module
{
    get Title(): ModuleTitle
    {
        return ModuleTitle.Activities;
    }

    Load(): void
    {
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
    }

    Unload(): void
    {
        super.Unload();
    }
}
