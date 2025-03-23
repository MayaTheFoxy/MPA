import { ORGASM_ACTIVITY_REGEX } from "../util/constants";
import { RandomElement } from "../util/general";
import { GetAttributeFromChatDictionary, SendAction } from "../util/messaging";
import { HookFunction } from "../util/sdk";
import { Module, ModuleTitle } from "./_module";
import { IsHardcoreOn } from "./profile";
import { GetCharacterCurrentStatValue, ModifyStat, VirtualPetStatCategory } from "./virtualPet";

const PlayerVP: (C?: Character) => MPARecord = (C: Character = Player) =>
{
    return C.MPA?.[ModuleTitle.VirtualPet] ?? {};
};

const PlayerVPC: (C?: Character) => MPARecord = (C: Character = Player) =>
{
    return C.MPA?.[ModuleTitle.VirtualPetConditions] ?? {};
};

/**
 * Check if a condition is currently enforced, checking if enabled and if it relies on a VP stat, that the stat is set
 */
function ConditionIsEnforced(condition: string, vpStatNeedToBeEnabled?: VirtualPetStatCategory): boolean
{
    if (!PlayerVPC().enabled || !(PlayerVPC()[condition]))
    {
        return false;
    }
    return (!vpStatNeedToBeEnabled || (PlayerVP().enabled && PlayerVP()?.[`${vpStatNeedToBeEnabled}Hours`] !== 0));
};

/** [Skill, postive or negative corrlation] */
const AFFECTION_SKILLS: [SkillType, boolean][] =
[
    ["SelfBondage", true],
    ["Willpower", true],
    ["Bondage", false],
    ["Evasion", false],
    ["LockPicking", false]
];

interface OnStatChangeEvent
{
    stat: VirtualPetStatCategory;
    threshhold: number;
    change: "rising" | "falling" | "both";
    action: () => void;
    firstRun?: () => void;
}
const previousStats: Record<VirtualPetStatCategory, number> = {
    food: -1,
    water: -1,
    sleep: -1,
    affection: -1
};
let onStatLevel: OnStatChangeEvent[] = [];
// Listens for changes every ~1.5 seconds
const STAT_COUNT_MAX = 250;
let statCount = STAT_COUNT_MAX;
export function ConditionCheck(): void
{
    (["food", "water", "affection", "sleep"] as VirtualPetStatCategory[]).forEach((category) =>
    {
        if (
            PlayerVP().enabled
            && PlayerVPC().enabled
            && PlayerVP()[`${category}Hours`] !== 0
        )
        {
            const prevValue = previousStats[category];
            const currValue = GetCharacterCurrentStatValue(Player, category);
            onStatLevel.forEach((changeEvent) =>
            {
                if (
                    changeEvent.stat === category
                    && prevValue === -1
                    && !!changeEvent.firstRun
                )
                {
                    changeEvent.firstRun();
                }
                if (
                    changeEvent.stat === category
                    && prevValue !== -1
                    && prevValue > currValue // Falling
                    && changeEvent.change !== "rising"
                    && currValue <= changeEvent.threshhold
                    && changeEvent.threshhold < prevValue
                )
                {
                    changeEvent.action();
                }
                if (
                    changeEvent.stat === category
                    && prevValue !== -1
                    && prevValue < currValue // Rising
                    && changeEvent.change !== "falling"
                    && prevValue < changeEvent.threshhold
                    && changeEvent.threshhold <= currValue
                )
                {
                    changeEvent.action();
                }
            });
            previousStats[category] = currValue;
        }
        else
        {
            previousStats[category] = -1;
        }
    });
}

const SLEEP_TINT = {
    stat: "sleep" as VirtualPetStatCategory,
    startLevel: 0.25,
    endLevel: 0,
    minTint: 0,
    maxTint: 1
};

enum PASSED_OUT
{
    NOT = 0,
    MPA = 1,
    LSCG = 2
}

let passedOut = PASSED_OUT.NOT;
const PASSOUT_TALK_REPLACE: string[] = [
    "SourceCharacter drools out of the corner of PronounPossessive mouth as PronounSubject sleeps.",
    "SourceCharacter mumbles quietly in PronounPossessive slumber.",
    "SourceCharacter rests peacefully."
];
function MPAPassout(): void
{
    // Don't pass out if unable to or already passed out
    if (globalThis.LSCG?.getModule("StateModule")?.SleepState?.Active)
    {
        return;
    }

    SendAction("SourceCharacter passes out from exhaustion.", undefined, [{ SourceCharacter: Player.MemberNumber } as SourceCharacterDictionaryEntry]);

    if (PlayerVPC().passoutLSCG && globalThis?.LSCG)
    {
        globalThis?.LSCG?.getModule("StateModule")?.SleepState?.Activate(Player.MemberNumber);
        if (globalThis.LSCG?.getModule("StateModule")?.SleepState?.Active)
        {
            // success, don't fall back on MPA passout
            passedOut = PASSED_OUT.LSCG;
            return;
        }
    }

    CharacterSetFacialExpression(Player, "Emoticon", "Sleep");
    CharacterSetFacialExpression(Player, "Eyes", "Closed");
    CharacterSetFacialExpression(Player, "Fluids", "DroolMedium");
    if (Player.CanKneel())
    {
        PoseSetActive(Player, "Kneel", true);
    }
    passedOut = PASSED_OUT.MPA;
}
function MPAWakeup(): void
{
    // LSCG passout
    if (passedOut === PASSED_OUT.LSCG)
    {
        // Something keeping player asleep; gas or chloro
        if (!globalThis?.LSCG?.getModule("StateModule")?.SleepState?.Active
          || (Player?.LSCG?.InjectorModule?.sedativeLevel ?? 0) > 0
          || (Player?.LSCG?.MiscModule?.chloroformEnabled
            && (["ItemMouth", "ItemMouth2", "ItemMouth3"] as AssetGroupName[]).some((group) =>
            {
                return InventoryGet(Player, group)?.Asset?.Name === "ChloroformCloth";
            })
          ))
        {
            return;
        }
        if (globalThis?.LSCG?.getModule("StateModule")?.SleepState?.Recover()?.Active === false)
        {
            SendAction("SourceCharacter wakes up from PronounPossessive nap.", undefined, [{ SourceCharacter: Player.MemberNumber } as SourceCharacterDictionaryEntry]);
        }
        return;
    }

    // MPA passout
    CharacterSetFacialExpression(Player, "Emoticon", null);
    CharacterSetFacialExpression(Player, "Eyes", "Dazed");
    CharacterSetFacialExpression(Player, "Eyebrows", "Lowered");

    passedOut = PASSED_OUT.NOT;
    SendAction("SourceCharacter wakes up from PronounPossessive nap.", undefined, [{ SourceCharacter: Player.MemberNumber } as SourceCharacterDictionaryEntry]);
}
function PassoutEnabled(): boolean
{
    return (PlayerVPC().enabled
    && PlayerVP().sleepHours !== 0
    && PlayerVPC().passout);
}
function IsPassedOut(): boolean
{
    return (PassoutEnabled()
      && (!globalThis?.LSSG || !PlayerVPC().passoutLSCG)
      && passedOut === PASSED_OUT.MPA);
}


let affectionCheckInterval: number;
const skillDurationMS = 15000;
function AffectionSkillCheck(): void
{
    if (
        !PlayerVP().enabled
        || PlayerVP().affectionHours === 0
        || !PlayerVPC().enabled
    )
    {
        return;
    }

    AFFECTION_SKILLS.forEach(([skill, type]) =>
    {
        const affection = GetCharacterCurrentStatValue(Player, "affection");
        const affectionModifier = Math.round((((affection) * (5 - (-5))) / (1) + (-5)) * (type ? 1 : -1) * 100) / 100;

        const prevMod = SkillGetModifier(Player, skill);
        const duration = SkillGetModifierDuration(Player, skill) !== 0 ? SkillGetModifierDuration(Player, skill) : skillDurationMS;
        if (affectionModifier > 0 && PlayerVPC().affectionSkillBuffs)
        {
            SkillSetModifier(Player, skill, prevMod + affectionModifier, duration, false);
        }
        if (affectionModifier < 0 && PlayerVPC().affectionSkillDebuffs)
        {
            SkillSetModifier(Player, skill, prevMod + affectionModifier, duration, false);
        }
    });
}

const MAX_SLOW_LEAVE_DURATION_SEC = 25;
const SLOW_LEAVE_LEVEL_START = 0.3;

const ORGASM_WATER_DRAIN = -0.05;
const ORGASM_SLEEP_DRAIN = -0.05;

export class VirtualPetConditionsModule extends Module
{
    get Title(): ModuleTitle
    {
        return ModuleTitle.VirtualPetConditions;
    }

    get Settings(): Setting[]
    {
        return [
            {
                name: "enabled",
                type: "checkbox",
                active: (C) => !!PlayerVP(C).enabled && !IsHardcoreOn(C),
                value: false,
                label: "Recive conditions based on current level of your virtual pet stats"
            } as CheckboxSetting, {
                name: "foodNOW",
                type: "checkbox",
                active: (C) => !!PlayerVP(C).enabled && !!PlayerVPC(C).enabled && !IsHardcoreOn(C),
                value: true,
                label: "Food and water affects affection gain"
            } as CheckboxSetting, {
                name: "tint",
                type: "checkbox",
                active: (C) => !!PlayerVP(C).enabled && !!PlayerVPC(C).enabled && !IsHardcoreOn(C),
                value: true,
                label: "Vision darkens as you get sleepier"
            } as CheckboxSetting, {
                name: "passout",
                type: "checkbox",
                active: (C) => !!PlayerVP(C).enabled && !!PlayerVPC(C).enabled && !IsHardcoreOn(C),
                value: true,
                label: "Passout when exhausted"
            } as CheckboxSetting, {
                name: "passoutLSCG",
                type: "checkbox",
                active: (C) => !!PlayerVP(C).enabled && !!PlayerVPC(C).enabled && !!PlayerVPC(C).passout && !!C.LSCG,
                value: false,
                label: "Use LSCG passout instead of MPA; Requires LSCG"
            } as CheckboxSetting, {
                name: "affectionSkillBuffs",
                type: "checkbox",
                active: (C) => !!PlayerVP(C).enabled && !!PlayerVPC(C).enabled && !IsHardcoreOn(C),
                value: true,
                label: "Affection will buff skills based on its level"
            } as CheckboxSetting, {
                name: "affectionSkillDebuffs",
                type: "checkbox",
                active: (C) => !!PlayerVP(C).enabled && !!PlayerVPC(C).enabled && !IsHardcoreOn(C),
                value: true,
                label: "Affection will debuff skills based on its level"
            } as CheckboxSetting, {
                name: "hearingLoss",
                type: "checkbox",
                active: (C) => !!PlayerVP(C).enabled && !!PlayerVPC(C).enabled && !IsHardcoreOn(C),
                value: true,
                label: "Hearing becomes harder the hungrier you are"
            } as CheckboxSetting, {
                name: "slowLeave",
                type: "checkbox",
                active: (C) => !!PlayerVP(C).enabled && !!PlayerVPC(C).enabled && !IsHardcoreOn(C),
                value: true,
                label: "Takes longer to leave the room when hungry"
            } as CheckboxSetting, {
                name: "orgasmWater",
                type: "checkbox",
                active: (C) => !!PlayerVP(C).enabled && !!PlayerVPC(C).enabled && !IsHardcoreOn(C),
                value: true,
                label: "Orgasms make you lose some hydration"
            } as CheckboxSetting, {
                name: "orgasmSleep",
                type: "checkbox",
                active: (C) => !!PlayerVP(C).enabled && !!PlayerVPC(C).enabled && !IsHardcoreOn(C),
                value: true,
                label: "Orgasms make you lose some energy"
            } as CheckboxSetting
        ];
    }

    Load(): void
    {
        // Check for condition changes every so often
        HookFunction(this.Title, "GameRun", 0, (args, next) =>
        {
            if (statCount >= STAT_COUNT_MAX)
            {
                ConditionCheck();
            }
            statCount++;
            return next(args);
        });

        // Eepy tint
        HookFunction(this.Title, "Player.GetTints", 0, (args, next) =>
        {
            // Not enabled, skip
            if (!ConditionIsEnforced("tint", SLEEP_TINT.stat))
            {
                return next(args);
            }

            const currLevel = GetCharacterCurrentStatValue(Player, SLEEP_TINT.stat);
            // Calculate the scaled value
            const scaledValue = ((currLevel - SLEEP_TINT.startLevel) / (SLEEP_TINT.endLevel - SLEEP_TINT.startLevel)) * (SLEEP_TINT.maxTint - SLEEP_TINT.minTint) + SLEEP_TINT.minTint;
            if (SLEEP_TINT.minTint <= scaledValue && scaledValue <= SLEEP_TINT.maxTint)
            {
                return next(args).concat({ r: 0, g: 0, b: 0, a: Math.sqrt(Math.round(scaledValue * 1000) / 1000) });
            }
            return next(args);
        });

        // Add condition triggers
        onStatLevel = [
            {
                stat: "sleep",
                threshhold: 0,
                change: "falling",
                action: function (): void
                {
                    MPAPassout();
                },
                firstRun: function (): void
                {
                    if (GetCharacterCurrentStatValue(Player, "sleep") === 0)
                    {
                        MPAPassout();
                    }
                }
            }, {
                stat: "sleep",
                threshhold: 0.1,
                change: "rising",
                action: function (): void
                {
                    if (passedOut !== PASSED_OUT.NOT)
                    {
                        MPAWakeup();
                    }
                }
            }
        ];
        // Eepy

        // Passout Hooks
        HookFunction(this.Title, "Player.CanTalk", 5, (args, next) =>
        {
            return IsPassedOut() ? false : next(args);
        });
        HookFunction(this.Title, "Player.CanWalk", 5, (args, next) =>
        {
            return IsPassedOut() ? false : next(args);
        });
        HookFunction(this.Title, "Player.CanChangeOwnClothes", 5, (args, next) =>
        {
            return IsPassedOut() ? false : next(args);
        });
        HookFunction(this.Title, "Player.CanInteract", 5, (args, next) =>
        {
            return IsPassedOut() ? false : next(args);
        });
        HookFunction(this.Title, "ServerSend", 5, (args, next) =>
        {
            if (!IsPassedOut())
            {
                return next(args);
            }

            const [type, data] = args as [string, ServerChatRoomMessage];
            if (
                type == "ChatRoomChat"
                && data?.Type == "Chat"
                && !data?.Content.startsWith("(")
            )
            {
                SendAction(RandomElement(PASSOUT_TALK_REPLACE) as string, undefined, [{ SourceCharacter: Player.MemberNumber } as SourceCharacterDictionaryEntry]);
                return null;
            }
            return next(args);
        });
        HookFunction(this.Title, "Player.GetDeafLevel", 5, (args, next) =>
        {
            return IsPassedOut() ? 4 : next(args);
        });
        HookFunction(this.Title, "Player.GetBlindLevel", 5, (args, next) =>
        {
            return IsPassedOut() ? (Player.GameplaySettings?.SensDepChatLog === "SensDepExtreme" || Player.GameplaySettings?.SensDepChatLog === "SensDepTotal") ? 3 : 2 : next(args);
        });
        HookFunction(this.Title, "ChatRoomCharacterUpdate", 5, (args, next) =>
        {
            const char = args[0];
            if (
                char.IsPlayer()
                && passedOut === PASSED_OUT.LSCG
                && globalThis.LSCG?.getModule("StateModule")?.SleepState?.Active === false)
            {
                passedOut = PASSED_OUT.NOT;
            }
            return next(args);
        });

        // Can't focus while hungry (deaf)
        HookFunction(this.Title, "Player.GetDeafLevel", 5, (args, next) =>
        {
            const deafLevel = ConditionIsEnforced("hearingLoss", "food") ? Math.max(0, Math.floor((GetCharacterCurrentStatValue(Player, "food") - 0.3001) * -10)) : 0;
            return Math.max(deafLevel, next(args));
        });

        // Affection affect skills
        if (SkillModifierMax < 10)
        {
            SkillModifierMax = 10;
        }
        AffectionSkillCheck();
        affectionCheckInterval = setInterval(AffectionSkillCheck, skillDurationMS + 1000);

        // Slow leave
        HookFunction(this.Title, "ChatRoomAttemptLeave", 0, (args, next) =>
        {
            if (!ConditionIsEnforced("slowLeave", "food"))
            {
                return next(args);
            }

            const prevSlow = ChatRoomSlowtimer;
            const currFood = GetCharacterCurrentStatValue(Player, "food");
            next(args);
            if (
                prevSlow === 0
                && ChatRoomSlowtimer > 0
                && currFood <= SLOW_LEAVE_LEVEL_START
            )
            {
                const slowedSpeed = (((-MAX_SLOW_LEAVE_DURATION_SEC / SLOW_LEAVE_LEVEL_START) * currFood) + MAX_SLOW_LEAVE_DURATION_SEC) * 1000;
                ChatRoomSlowtimer = CurrentTime + ChatRoomSlowLeaveMinTime + slowedSpeed;
            }
        });
        HookFunction(this.Title, "Player.IsSlow", 0, (args, next) =>
        {
            return (ConditionIsEnforced("slowLeave", "food") && GetCharacterCurrentStatValue(Player, "food") <= SLOW_LEAVE_LEVEL_START) ? true : next(args);
        });

        // On orgasm
        HookFunction(this.Title, "ChatRoomMessage", 10, (args, next) =>
        {
            const data = args[0];
            if (data.Type !== "Activity"
              || !ORGASM_ACTIVITY_REGEX.test(data.Content)
              || GetAttributeFromChatDictionary(data, "SourceCharacter") !== Player.MemberNumber)
            {
                return next(args);
            }

            if (PlayerVPC().orgasmWater)
            {
                ModifyStat("water", ORGASM_WATER_DRAIN, false, true);
            }

            if (PlayerVPC().orgasmSleep)
            {
                ModifyStat("sleep", ORGASM_SLEEP_DRAIN, false, true);
            }

            return next(args);
        });
    }

    Unload(): void
    {
        super.Unload();
        onStatLevel = [];
        clearInterval(affectionCheckInterval);
    }
}
