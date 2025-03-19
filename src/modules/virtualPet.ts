import { Module, ModuleTitle } from "./_module";
import { BED_BAD, BED_NORMAL, BED_PERFECT } from "../util/constants";
import { HookFunction } from "../util/sdk";
import { SaveStorage } from "../util/storage";
import { GetAttributeFromChatDictionary } from "../util/messaging";
import { RecordSync } from "./dataSync";
import { IsHardcoreOn } from "./profile";

const MAX_SETTING_TIME_HOURS = 168;

const PlayerVP: (C?: Character) => MPARecord = (C: Character = Player) =>
{
    return C.MPA?.[ModuleTitle.VirtualPet] ?? {};
};

// const CHARACTERS_MOVING = ["ServerMoveRight", "ServerSwap", "ServerMoveLeft"];

const BOWL_CONSUME_RECOVERY = 0.67;
const ITEM_CONUME_RECOVERY = 0.33;

const ACTIVITIES_FOOD_GAIN = ["LSCG_Eat", "ThrowItem"];
const ACTIVITIES_WATER_GAIN = ["LSCG_FunnelPour", "LSCG_Quaff"];

const EMOTICONS_SLEEP = ["Sleep", "Afk", "Fork", "Coding", "Read"];

const AFFECTION_ACTIVITY_LOVE = ["Pet", "TakeCare", "LSCG_Nuzzle", "Caress", "LSCG_Hug", "Scratch"];
const AFFECTION_ACTIVITY_LIKE = ["Kiss", "MassageHands", "Lick", "Nibble", "Cuddle", "Grope"];
const AFFECTION_ACTIVITY_MASO = ["Spank", "Slap", "Bite", "Pinch", "Pull", "ShockItem", "SpankItem"];
const AFFECTION_LOVE_BASE = 0.05;
const AFFECTION_LIKE_BASE = 0.03;
const AFFECTION_MASO_BASE = -0.04;

const AFFECTION_ZONE_AFFECTION: Partial<Record<AssetGroupItemName, number>> = {
    ItemArms: 1,
    ItemBoots: 0.8,
    ItemBreast: 1.5,
    ItemButt: 1.5,
    ItemEars: 2.5,
    ItemFeet: 0.8,
    ItemHands: 1,
    ItemHead: 3,
    ItemLegs: 1,
    ItemMouth: 2,
    ItemNeck: 1.2,
    ItemNipples: 1.5,
    ItemNose: 1.7,
    ItemPelvis: 1.3,
    ItemTorso: 1,
    ItemVulva: 2,
    ItemVulvaPiercings: 2.5
};

const MIN_OFFLINE_DRAIN_LEVEL = 0.2;

const LAST_ONLINE_INTERVAL_MS = 10000;
let lastOnlineInterval: number;

export const IsSleepingExpression = (char: Character): boolean =>
{
    return (
        char.Appearance.find((x) => x.Asset.Group.Name === "Eyes")?.Property?.Expression === "Closed"
        && char.Appearance.find((x) => x.Asset.Group.Name === "Eyes2")?.Property?.Expression === "Closed"
        && EMOTICONS_SLEEP.includes(char.Appearance.find((x) => x.Asset.Group.Name === "Emoticon")?.Property?.Expression ?? "")
    );
};
export const IsBedMultiplier = (char: Character): number =>
{
    const device = InventoryGet(char, "ItemDevices")?.Asset.Name ?? "";
    return (
        BED_PERFECT.includes(device) ? 10 : BED_NORMAL.includes(device) ? 5 : BED_BAD.includes(device) ? 2 : 1
    );
};

let playerSleepingExpression = false;
let playerBedMultiplier = 1;

export type VirtualPetStatCategory = "food" | "water" | "sleep" | "affection";
export type VirtualPetHourCategories = `${VirtualPetStatCategory}Hours`;
export interface VirtualPetStat
{
    stat: VirtualPetStatCategory;
    level: number;
}

function SleepChangeCheck(sync: boolean = true): void
{
    if (
        PlayerVP().enabled
        && PlayerVP().sleepHours !== 0
        && (playerSleepingExpression !== IsSleepingExpression(Player)
          || playerBedMultiplier !== IsBedMultiplier(Player))
    )
    {
        // if a change in sleeping expression or bed multiplier, sync levels
        if (sync)
        {
            LevelSync();
        }
        playerSleepingExpression = IsSleepingExpression(Player);
        playerBedMultiplier = IsBedMultiplier(Player);
    }
}

function StatModifier(stat: VirtualPetStatCategory, sourceChar?: Character): number
{
    let modifier = 1;

    // From owners, +50%
    if (sourceChar?.IsOwner())
    {
        modifier += 0.5;
    }
    // lovers +35%
    else if (sourceChar?.IsLoverOfPlayer())
    {
        modifier += 0.35;
    }
    // subs +25%
    else if (sourceChar?.IsFamilyOfPlayer())
    {
        modifier += 0.25;
    }

    // Hard to eat or drink while ring gagged
    if (stat === "food" || stat === "water")
    {
        if (!Player.CanTalk())
        {
            modifier -= 0.5;
        }
    }

    // 3% bonus for each restraint worn
    modifier += 0.03 * Player.Appearance.filter((x) => x.Asset.DynamicGroupName.startsWith("Item")).length;

    // 50% bonus for being on all fours
    if (Player.PoseMapping.BodyFull === "AllFours")
    {
        modifier += 0.5;
    }

    // Food and water modifies affection gain
    if (
        stat === "affection"
        && Player.MPA[ModuleTitle.VirtualPetConditions].enabled
        && Player.MPA[ModuleTitle.VirtualPetConditions].foodNOW
    )
    {
        const nums: number[] = [];
        if (PlayerVP().foodHours !== 0)
        {
            nums.push(GetCharacterCurrentStatValue(Player, "food"));
        }
        if (PlayerVP().waterHours !== 0)
        {
            nums.push(GetCharacterCurrentStatValue(Player, "water"));
        }
        if (nums.length !== 0)
        {
            modifier *= nums.reduce((sum, num) => sum + num, 0) / nums.length / 0.75;
        }
    }

    return Math.max(0, modifier);
}

function VerifyValidStat(stat: VirtualPetStatCategory): boolean
{
    const level = PlayerVP().levels[stat];
    PlayerVP().levels[stat] = Math.min(Math.max(level, 0), 1);
    return 0 <= level && level <= 1;
}

function HourToMS(hours: number)
{
    return hours * 60 * 60 * 1000;
}

export function CalculateCurrentValue(value: number, duration: number, lastUpdated: number, lastOnline?: number, firstRunCheck: boolean = false, C: Character = Player): number
{
    /** How long in ms has elasped since now or last online */
    const diff: number = (lastOnline ? lastOnline : Date.now()) - lastUpdated;
    const currentValue = Math.max(0, Math.min(value - (diff / HourToMS(duration)), 1));
    // Max drain down to 20% while offline
    if (firstRunCheck && value > MIN_OFFLINE_DRAIN_LEVEL && currentValue < MIN_OFFLINE_DRAIN_LEVEL)
    {
        const diff2: number = PlayerVP(C).levels.lastOnline - lastUpdated;
        const newValue2 = Math.max(0, Math.min(value - (diff2 / HourToMS(duration)), 1));
        return Math.min(MIN_OFFLINE_DRAIN_LEVEL, newValue2);
    }
    return currentValue;
}

export function GetCharacterCurrentStatValue(character: Character, stat: VirtualPetStatCategory): number
{
    const charStats = character?.MPA?.[ModuleTitle.VirtualPet];
    if (!charStats)
    {
        return -1;
    }

    if (stat === "sleep")
    {
        const lvl = (IsSleepingExpression(character) || IsBedMultiplier(character) !== 1) ?
            charStats.levels.sleep + (Date.now() - charStats.levels.lastUpdated) / (charStats.sleepHours * 60 * 60 * 1000) * IsBedMultiplier(character) * (IsSleepingExpression(character) ? 5 : 1) :
            CalculateCurrentValue(charStats.levels.sleep, charStats.sleepHours, charStats.levels.lastUpdated);
        return Math.max(0, Math.min(1, lvl));
    }

    return CalculateCurrentValue(charStats.levels[stat], charStats[`${stat}Hours`], charStats.levels.lastUpdated);
}

export function LevelSync(pushToStorage: boolean = true, recordSync: boolean = true, firstSync: boolean = false): void
{
    // Virtual pet is not enabled so do nothing
    if (!PlayerVP().enabled)
    {
        PlayerVP().levels.lastUpdated = Date.now();
        PlayerVP().levels.lastOnline = Date.now();
        return;
    }

    const update: number = PlayerVP().levels.lastUpdated ?? Date.now();
    const online: number | undefined = !PlayerVP().offlineDrain ? PlayerVP().levels.lastOnline : undefined;

    const food = PlayerVP().foodHours;
    if (food !== 0)
    {
        PlayerVP().levels.food = CalculateCurrentValue(PlayerVP().levels.food, food, update, online, firstSync);
    }
    const water = PlayerVP().waterHours;
    if (water !== 0)
    {
        PlayerVP().levels.water = CalculateCurrentValue(PlayerVP().levels.water, water, update, online, firstSync);
    }
    const sleep = PlayerVP().sleepHours;
    if (sleep !== 0)
    {
        if ((firstSync && !online)
          || playerSleepingExpression
          || playerBedMultiplier !== 1)
        {
            const durationToUse = firstSync ? (Date.now() - PlayerVP().levels.lastOnline) - (PlayerVP().levels.lastOnline - update) : Date.now() - update;
            const newSleep = PlayerVP().levels.sleep + (durationToUse) / HourToMS(sleep) * playerBedMultiplier * (playerSleepingExpression ? 5 : 1);
            PlayerVP().levels.sleep = Math.max(0, Math.min(1, newSleep));
        }
        else
        {
            PlayerVP().levels.sleep = CalculateCurrentValue(PlayerVP().levels.sleep, sleep, update, online, firstSync);
        }
    }
    const affection = PlayerVP().affectionHours;
    if (affection !== 0)
    {
        PlayerVP().levels.affection = CalculateCurrentValue(PlayerVP().levels.affection, affection, update, online, firstSync);
    }
    PlayerVP().levels.lastUpdated = Date.now();
    PlayerVP().levels.lastOnline = Date.now();
    // Save to local storage
    if (pushToStorage)
    {
        SaveStorage(false);
    }
    // Sync new stats with others
    if (recordSync)
    {
        RecordSync(ModuleTitle.VirtualPet, "levels");
    }
}

/**
 * @param stat - Stat to modify
 * @param amount - Must be between -1 and 1
 * @param applyModifier - If apply the "Pet like" modifier
 * @param storagePush - If saving to storage
 */
export function ModifyStat(stat: VirtualPetStatCategory, amount: number, applyModifier = true, storagePush = true, sourceChar?: Character): void
{
    if (amount < -1 && amount > 1)
    {
        return;
    }

    // Calculate the current stats based on drain and then apply modifications after changing those values first
    LevelSync(false, false, false);

    PlayerVP().levels[stat] += amount * ((applyModifier && amount > 0) ? StatModifier(stat, sourceChar) : 1);
    VerifyValidStat(stat);

    // Save to local storage
    if (storagePush)
    {
        SaveStorage(false);
    }
    // Sync new stats with others
    RecordSync(ModuleTitle.VirtualPet, "levels");
}

export class VirtualPetModule extends Module
{
    get Title(): ModuleTitle
    {
        return ModuleTitle.VirtualPet;
    }

    get Activities(): CustomActivity[]
    {
        return [
            {
                Name: "BowlEat",
                Targets: [{
                    group: "ItemMouth",
                    label: "Eat From Bowl",
                    actionSelf: "SourceCharacter eats from PronounPossessive bowl."
                }],
                Image: "Assets/Female3DCG/ItemDevices/Preview/PetBowl.png",
                Prerequisite: ["UseMouth"],
                CustomPrerequisite: {
                    Name: "HasBowl",
                    Prerequisite: (acting, _acted, _group) =>
                    {
                        return InventoryGet(acting, "ItemDevices")?.Asset?.Name === "PetBowl";
                    }
                },
                OnTrigger: () =>
                {
                    if (PlayerVP().enabled && PlayerVP().foodHours !== 0)
                    {
                        ModifyStat("food", BOWL_CONSUME_RECOVERY, true);
                    }
                }
            }, {
                Name: "BowlDrink",
                Targets: [{
                    group: "ItemMouth",
                    label: "Drink From Bowl",
                    actionSelf: "SourceCharacter drinks from PronounPossessive bowl."
                }],
                Image: "Assets/Female3DCG/ItemDevices/Preview/PetBowl.png",
                Prerequisite: ["UseMouth"],
                CustomPrerequisite: {
                    Name: "HasBowl"
                },
                OnTrigger: () =>
                {
                    if (PlayerVP().enabled && PlayerVP().waterHours !== 0)
                    {
                        ModifyStat("water", BOWL_CONSUME_RECOVERY, true);
                    }
                }
            }, {
                Name: "BowlEat2",
                Targets: [{
                    group: "ItemMouth",
                    label: "Eat From Bowl",
                    actionSelf: "SourceCharacter puts PronounPossessive head into PronounPossessive bowl in order to eat with the gag, making a mess."
                }],
                Image: "Assets/Female3DCG/ItemDevices/Preview/PetBowl.png",
                Prerequisite: [],
                CustomPrerequisite: [
                    { Name: "HasBowl" },
                    {
                        Name: "UseTongueNoMouth",
                        Prerequisite: (acting, _acted, _group) =>
                        {
                            return !acting.CanTalk() && !acting.IsMouthBlocked();
                        }
                    }
                ],
                OnTrigger: () =>
                {
                    if (PlayerVP().enabled && PlayerVP().foodHours !== 0)
                    {
                        ModifyStat("food", BOWL_CONSUME_RECOVERY, true);
                    }
                }
            }, {
                Name: "BowlDrink2",
                Targets: [{
                    group: "ItemMouth",
                    label: "Drink From Bowl",
                    actionSelf: "SourceCharacter puts PronounPossessive head into PronounPossessive bowl in order to drink with the gag, making a mess."
                }],
                Image: "Assets/Female3DCG/ItemDevices/Preview/PetBowl.png",
                Prerequisite: [],
                CustomPrerequisite: [
                    { Name: "HasBowl" },
                    { Name: "UseTongueNoMouth" }
                ],
                OnTrigger: () =>
                {
                    if (PlayerVP().enabled && PlayerVP().waterHours !== 0)
                    {
                        ModifyStat("water", BOWL_CONSUME_RECOVERY, true);
                    }
                }
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
                label: "Become a virtual pet! Requiring: food, water, sleep, and affection"
            } as CheckboxSetting, {
                name: "foodHours" as VirtualPetHourCategories,
                type: "number",
                value: 4,
                active: (C) => !!PlayerVP(C).enabled,
                label: "How many hours until you are completely out of food; 0 to disable",
                width: 128,
                min: 0,
                max: MAX_SETTING_TIME_HOURS,
                step: 0.1
            } as NumberSetting, {
                name: "waterHours" as VirtualPetHourCategories,
                type: "number",
                value: 4,
                active: (C) => !!PlayerVP(C).enabled,
                label: "How many hours until you are completely out of water; 0 to disable",
                width: 128,
                min: 0,
                max: MAX_SETTING_TIME_HOURS,
                step: 0.1
            } as NumberSetting, {
                name: "sleepHours" as VirtualPetHourCategories,
                type: "number",
                value: 8,
                active: (C) => !!PlayerVP(C).enabled,
                label: "How many hours until you are completely out of sleep; 0 to disable",
                width: 128,
                min: 0,
                max: MAX_SETTING_TIME_HOURS,
                step: 0.1
            } as NumberSetting, {
                name: "affectionHours" as VirtualPetHourCategories,
                type: "number",
                value: 4,
                active: (C) => !!PlayerVP(C).enabled,
                label: "How many hours until you are completely out of affection; 0 to disable",
                width: 128,
                min: 0,
                max: MAX_SETTING_TIME_HOURS,
                step: 0.1
            } as NumberSetting, {
                name: "offlineDrain",
                type: "checkbox",
                value: true,
                active: (C) => !!PlayerVP(C).enabled,
                label: "Stats drain even when logged out of the club"
            } as CheckboxSetting, {
                name: "noHands",
                type: "checkbox",
                active: (C) => !!PlayerVP(C).enabled && !IsHardcoreOn(C),
                value: true,
                label: "Allow eating or drinking from items in your OWN hands"
            } as CheckboxSetting, {
                name: "masochist",
                type: "checkbox",
                active: (C) => !!PlayerVP(C).enabled,
                value: false,
                label: "Masochist pet; Abuse raises affection"
            } as CheckboxSetting, {
                name: "levels",
                type: "record",
                value: {
                    food: 1,
                    water: 1,
                    sleep: 1,
                    affection: 1,
                    lastUpdated: Date.now(),
                    lastOnline: Date.now()
                }
            } as Setting
        ];
    }

    Load(): void
    {
        super.Load();

        // Login level sync
        SleepChangeCheck(false);
        LevelSync(true, false, true);
        lastOnlineInterval = setInterval(() =>
        {
            if (Player.MemberNumber)
            {
                Player.MPA[this.Title].levels.lastOnline = Date.now();
                SaveStorage(false);
            }
        }, LAST_ONLINE_INTERVAL_MS);

        // Noms and drinks
        HookFunction(this.Title, "ChatRoomMessage", 0, (args, next) =>
        {
            const data = args[0];
            const activityName = GetAttributeFromChatDictionary(data, "ActivityName");
            if (
                !PlayerVP().enabled
                || (!PlayerVP().noHands
                  && GetAttributeFromChatDictionary(data, "SourceCharacter") === Player.MemberNumber)
                || data.Type !== "Activity"
                || GetAttributeFromChatDictionary(data, "TargetCharacter") !== Player.MemberNumber
                || !["ItemMouth", "ItemHands"].includes(GetAttributeFromChatDictionary(data, "FocusGroupName"))
                || !activityName
            )
            {
                return next(args);
            }

            // Get activity and check prerequisites
            const activity = ActivityFemale3DCG.find((x) => x.Name === activityName);

            if (
                PlayerVP().foodHours !== 0
                && (activity?.Prerequisite?.includes("Needs-EatItem")
                  || ACTIVITIES_FOOD_GAIN.some((x) => activity?.Name === x))
            )
            {
                ModifyStat("food", ITEM_CONUME_RECOVERY, true);
            }

            if (
                PlayerVP().waterHours !== 0
                && (activity?.Prerequisite?.includes("Needs-SipItem")
                  || ACTIVITIES_WATER_GAIN.some((x) => activity?.Name === x))
            )
            {
                ModifyStat("water", ITEM_CONUME_RECOVERY, true);
            }

            return next(args);
        });

        // Sleep
        HookFunction(this.Title, "CharacterRefresh", 0, (args, next) =>
        {
            if (args[0].MemberNumber === Player.MemberNumber)
            {
                SleepChangeCheck();
            }
            return next(args);
        });

        // Affection
        HookFunction(this.Title, "ChatRoomMessage", 0, (args, next) =>
        {
            const data = args[0];
            const activityName = GetAttributeFromChatDictionary(data, "ActivityName");
            if (
                !PlayerVP().enabled
                || PlayerVP().affectionHours === 0
                || data.Type !== "Activity"
                || GetAttributeFromChatDictionary(data, "TargetCharacter") !== Player.MemberNumber
                || GetAttributeFromChatDictionary(data, "SourceCharacter") === Player.MemberNumber
                || !activityName
            )
            {
                return next(args);
            }

            const group = GetAttributeFromChatDictionary(data, "FocusGroupName") as string ?? "";
            const groupMult = AFFECTION_ZONE_AFFECTION[group] ?? 1;
            if (AFFECTION_ACTIVITY_LOVE.includes(activityName))
            {
                ModifyStat("affection", AFFECTION_LOVE_BASE * groupMult);
            }
            else if (AFFECTION_ACTIVITY_LIKE.includes(activityName))
            {
                ModifyStat("affection", AFFECTION_LIKE_BASE * groupMult);
            }
            else if (AFFECTION_ACTIVITY_MASO.includes(activityName))
            {
                ModifyStat("affection", (PlayerVP().masochist ? -1 : 1) * AFFECTION_MASO_BASE * groupMult);
            }
            return next(args);
        });
    }

    Unload(): void
    {
        super.Unload();
        clearInterval(lastOnlineInterval);
    }
}
