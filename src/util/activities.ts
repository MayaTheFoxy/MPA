import { LocalizedText } from "@/localization/localization";
import { ACTIVITY_NAME_PREFIX } from "@/util/constants";

/** Stores the activity name and the image location or base 64 image for that activity */
export const activityImages: Record<string, string> = {};
/** When an activity is used by the Player, run this callback function */
export const activityTriggers: Record<string, ActivityTrigger> = {};
/** Custom prerequisites for activities */
export const activityPrerequisites: Record<string, Prerequisite> = {};
/** When an activity happens, run this callback function */
export const activityReceived: Record<string, ActivityReceived> = {};

/**
 * Adds a key value pair to BCs Lookup Activity Dictionary
 */
function AddActivityDictionary(key: string, value: string): void
{
    ActivityDictionaryLoad().cache[key] = value;
}

/**
 * Removes key from BCs Lookup Activity Dictionary
 * @returns If removed something or not
 */
function RemoveActivityDictionary(key: string): boolean
{
    const dict = ActivityDictionaryLoad().cache; 
    let ret = false;
    if (dict[key] !== undefined)
    {
        ret = true;
    }
    delete dict[key];
    return ret;
}

/**
 * Create a new custom activity for the Player to use
 */
export function CreateActivity(customActivity: CustomActivity): void
{
    // Create the activity BC uses
    const activity: Activity = {
        Name: `${ACTIVITY_NAME_PREFIX}${customActivity.Name}` as ActivityName,
        ActivityID: Math.max(...ActivityFemale3DCG.map((x) => x.ActivityID ?? -1)) + 1,
        MaxProgress: customActivity.MaxProgress ?? 50,
        // MaxProgressSelf: customActivity.MaxProgressSelf ?? customActivity.MaxProgress,
        Prerequisite: customActivity.Prerequisite,
        Target: []
    };

    // Add custom activities to the record for checking when an activity is called later
    if (customActivity.CustomPrerequisite)
    {
        let customPrerequisites = customActivity.CustomPrerequisite;
        if (!Array.isArray(customPrerequisites))
        {
            customPrerequisites = [customPrerequisites];
        }
        customPrerequisites.forEach((newPrerequisite) =>
        {
            activity.Prerequisite.push(newPrerequisite.Name as ActivityPrerequisite);
            if (!(newPrerequisite.Name in activityPrerequisites)
              && newPrerequisite.Prerequisite)
            {
                activityPrerequisites[newPrerequisite.Name] = newPrerequisite.Prerequisite;
            }
        });
    }

    // Only add the name and label once
    let nameAdded = false;
    // The lookup table for the activity
    customActivity.Targets.forEach((target) =>
    {
        if (!nameAdded)
        {
            AddActivityDictionary(`Activity${activity.Name}`, LocalizedText(target.label));
            nameAdded = true;
        }

        // Activity can be used on self
        if (target.actionSelf)
        {
            if (!activity.TargetSelf)
            {
                activity.TargetSelf = [];
            }
            (activity.TargetSelf as AssetGroupItemName[])?.push(target.group);
            AddActivityDictionary(`Label-ChatSelf-${target.group}-${activity.Name}`, LocalizedText(target.label));
            AddActivityDictionary(`ChatSelf-${target.group}-${activity.Name}`, LocalizedText(target.actionSelf));
        }

        // Activity can be used on others
        if (target.actionOthers)
        {
            activity.Target.push(target.group);
            AddActivityDictionary(`Label-ChatOther-${target.group}-${activity.Name}`, LocalizedText(target.label));
            AddActivityDictionary(`ChatOther-${target.group}-${activity.Name}`, LocalizedText(target.actionOthers));
        }
    });

    // Image the activity will use
    activityImages[activity.Name] = customActivity.Image;

    // On activity trigger support
    if (customActivity.OnTrigger)
    {
        activityTriggers[activity.Name] = customActivity.OnTrigger;
    }

    // On activity received support
    if (customActivity.OnReceive)
    {
        activityReceived[activity.Name] = customActivity.OnReceive;
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
    const activityName = `${ACTIVITY_NAME_PREFIX}${customActivity.Name}`;

    // The lookup table for the activity
    customActivity.Targets.forEach((target) =>
    {
        // Activity can be used on self
        if (target.actionSelf)
        {
            RemoveActivityDictionary(`Label-ChatSelf-${target.group}-${activityName}`);
            RemoveActivityDictionary(`ChatSelf-${target.group}-${activityName}`);
        }

        // Activity can be used on others
        if (target.actionOthers)
        {
            RemoveActivityDictionary(`Label-ChatOther-${target.group}-${activityName}`);
            RemoveActivityDictionary(`ChatOther-${target.group}-${activityName}`);
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
