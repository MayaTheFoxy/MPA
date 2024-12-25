import { LocalizedText } from "../localization/localization";

type NewPrerequisites = "HoldingClicker" | "HasBowl" | "UseTongueNoMouth" | "HasBell";

/** Stores the activity name and the image location or base 64 image for that activity */
export const activityImages: Record<string, string> = {};
/** When an activity happens, run this callback function */
export const activityTriggers: Record<string, AcitivityTrigger> = {};
/** Custom prerequisites for activities */
export const activityPrerequisites: Record<NewPrerequisites, Prerequisite> =
{
    HoldingClicker: (acting, _acted, _group) =>
    {
        return InventoryGet(acting, "ItemHandheld")?.Asset?.Name?.toLocaleLowerCase()?.includes("remote") ?? false;
    },
    HasBowl: (acting, _acted, _group) =>
    {
        return InventoryGet(acting, "ItemDevices")?.Asset?.Name === "PetBowl";
    },
    UseTongueNoMouth: (acting, _acted, _group) =>
    {
        return !acting.CanTalk() && !acting.IsMouthBlocked();
    },
    HasBell: (_acting, acted, _group) =>
    {
        return InventoryGet(acted, "ItemNeck")?.Asset?.Name === "LeatherCollarBell"
          || InventoryGet(acted, "ItemNeckAccessories")?.Asset?.Name === "CollarBell";
    }
};

/**
 * Create a new custom activity for the Player to use
 */
export function CreateActivity(customActivity: CustomActivity): void
{
    // Create the activity BC uses
    const activity: Activity = {
        Name: `MPA_${customActivity.Name}` as ActivityName,
        ActivityID: Math.max(...ActivityFemale3DCG.map((x) => x.ActivityID ?? -1)) + 1,
        MaxProgress: customActivity.MaxProgress ?? 50,
        // MaxProgressSelf: customActivity.MaxProgressSelf ?? customActivity.MaxProgress,
        Prerequisite: customActivity.Prerequisite,
        Target: []
    };

    // The lookup table for the activity
    customActivity.Targets.forEach((target) =>
    {
        // Acitivity can be used on self
        if (target.actionSelf)
        {
            if (!activity.TargetSelf)
            {
                activity.TargetSelf = [];
            }
            (activity.TargetSelf as AssetGroupItemName[])?.push(target.group);
            ActivityDictionary?.push([`Label-ChatSelf-${target.group}-${activity.Name}`, LocalizedText(target.label)]);
            ActivityDictionary?.push([`ChatSelf-${target.group}-${activity.Name}`, LocalizedText(target.actionSelf)]);
        }

        // Activity can be used on others
        if (target.actionOthers)
        {
            activity.Target.push(target.group);
            ActivityDictionary?.push([`Label-ChatOther-${target.group}-${activity.Name}`, LocalizedText(target.label)]);
            ActivityDictionary?.push([`ChatOther-${target.group}-${activity.Name}`, LocalizedText(target.actionOthers)]);
        }
    });

    // Image the activity will use
    activityImages[activity.Name] = customActivity.Image;

    // On activity trigger support
    if (customActivity.OnTrigger)
    {
        activityTriggers[activity.Name] = customActivity.OnTrigger;
    }

    ActivityFemale3DCG.push(activity);
    ActivityFemale3DCGOrdering.push(activity.Name);
}

/**
 * Create many custom activities for the Player to use
 */
export function CreateActivities(customActivities: CustomActivity[]): void
{
    customActivities.forEach((activity) =>
    {
        CreateActivity(activity);
    });
}

/**
 * Remove activity, disallowing the Player to use it
 * @param customActivity - Only Name and Targets matter for this function
 */
export function RemoveActivity(customActivity: CustomActivity): void
{
    const activityName = `MPA_${customActivity.Name}`;

    // The lookup table for the activity
    customActivity.Targets.forEach((target) =>
    {
        // Acitivity can be used on self
        if (target.actionSelf)
        {
            ActivityDictionary = ActivityDictionary?.filter((x) => !(x[0] === `Label-ChatSelf-${target.group}-${activityName}` || x[0] === `ChatSelf-${target.group}-${activityName}`)) ?? null;
        }

        // Activity can be used on others
        if (target.actionOthers)
        {
            ActivityDictionary = ActivityDictionary?.filter((x) => !(x[0] === `Label-ChatOther-${target.group}-${activityName}` || x[0] === `ChatOther-${target.group}-${activityName}`)) ?? null;
        }
    });

    // Image the activity will use
    delete activityImages[activityName];

    // On activity trigger support
    delete activityTriggers[activityName];

    // Done
    ActivityFemale3DCG = ActivityFemale3DCG.filter((x) => x.Name !== activityName);
    ActivityFemale3DCGOrdering = ActivityFemale3DCGOrdering.filter((x) => x !== activityName);
}

/**
 * Remove activities, disallowing the Player to use them
 * @param customActivity - Only Name and Targets matter for this function
 */
export function RemoveActivities(customActivities: CustomActivity[]): void
{
    customActivities.forEach((activity) =>
    {
        RemoveActivity(activity);
    });
}
