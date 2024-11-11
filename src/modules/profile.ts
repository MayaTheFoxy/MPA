import { FilterArrayFromArray } from "../util/general";
import { HookFunction } from "../util/sdk";
import { Module, ModuleTitle } from "./_module";
import { ElementName } from "./settings";
import { ApplyPetHearing, NonDisruptivePetSpeech } from "../util/petHearAndSpeak";

const PlayerP: (C?: Character) => MPARecord = (C: Character = Player) =>
{
    return C.MPA?.[ModuleTitle.Profile] ?? {};
};

export function IsHardcoreOn(C: Character): boolean
{
    return (C.MPA?.[ModuleTitle.Profile].hardcore as boolean | undefined) ?? false;
};

function GetRecord(title: ModuleTitle, C: Character = Player): MPARecord
{
    return C.MPA?.[title] ?? {};
}

// Make sure not in BCX banned words / phrases
// Don't blame me for the selection, how are you supposed to type out these animal sounds
// Half this came from chat gpt anyway, if you got something better, feel free to suggest it
export const GARBLE_PHRASES = Object.freeze({
    Human: ["hmmgm", "mmmm", "mhhmmaa", "hmmm"],
    Custom: [""],
    Bunny: ["pon", "eep", "huff", "tk-tk", "nngh-nngh"],
    Cat: ["meow", "mew", "nyah", "nya", "purr", "mrrow", "prrr"],
    Cow: ["moo", "mooooo", "muuhhh", "moooah"],
    Dog: ["arf", "woof", "bark", "ruff", "huff", "eep"],
    Fox: ["chirp", "yip", "wow-wow", "yoww", "eep"],
    Mouse: ["squeak", "eeek", "tch-tch", "wi-i-i", "sss"],
    Pony: ["neigh", "whinny", "wheee", "snrt", "whooosh", "huff", "nnhhh-ker"],
    Wolf: ["awoo", "aa-ooo", "woof", "ruff", "arf", "wiiip", "huff"]
});
type PetSpeakingKeys = keyof typeof GARBLE_PHRASES;

/**
 * Get the pet garble phrases for the selected profile
 * @param profile - Defaults to Player's profile if none provided
 */
function GetPetGarblePhrases(profile: PetSpeakingKeys = PlayerP(Player).type): string[]
{
    if (profile in GARBLE_PHRASES && profile !== "Custom")
    {
        return GARBLE_PHRASES[profile];
    }
    return (PlayerP(Player).garblePhrases as string).split(",").map((str) => str.trim());
}

/**
 * Only include pet sounds that are permitted by BCX
 * @param profile - Defaults to Player's profile
 * @returns Phrases BCX won't get mad at
 */
function GetAllowedPetGarblePhrases(profile: PetSpeakingKeys = PlayerP(Player).type): string[]
{
    const bannedBCXWords = window?.bcx?.getModApi("MPA")?.getRuleState("speech_ban_words")?.customData?.bannedWords ?? [];
    return FilterArrayFromArray(GetPetGarblePhrases(profile), bannedBCXWords);
}

export const PET_HEARING = Object.freeze({
    All: ["owner", "pet", "master", "mistress", "miss", "sir", "paw", "sit", "come", "down", "up",
        "stay", "water", "food", "kibble", "eat", "treat", "drink", "toy", "play", "leash", "walk",
        "walkies", "bed", "sleep", "cutie", "adorable", "toy", "play", "kibble", "good", "bad",
        "lap", "speak", "hush", "quiet", "hush", "all fours", "all-fours"],
    Human: [],
    Custom: [],
    Bunny: ["bun", "bunny", "carrot", "hop", "jump", "hump", "ear", "ears"],
    Cat: ["cat", "kitty", "kitten", "catnip", "knead", "scratch", "yarn", "milk"],
    Cow: ["milk", "milking", "utter", "breast", "grass", "moo"],
    Dog: ["cage", "kennel", "pup", "puppy", "dog", "doggy", "bone", "fetch", "heel", "roll", "over", "bark"],
    Fox: ["trap", "bun", "bunny", "bone", "fox", "foxy"],
    Mouse: ["mouse", "ear", "ears", "trap", "wire", "wheel", "cheese", "nibble", "cat", "kitty", "kitten"],
    Pony: ["pony", "mare", "stallion", "bridle", "hoof", "hooves", "trot", "stall", "hay", "woah",
        "stomp", "calm", "easy", "slow", "cart", "bay", "run", "race"],
    Wolf: ["bone", "wolf", "dog", "pup", "puppy", "heel"]
});
type PetHearingKeys = keyof typeof PET_HEARING;

/**
 *
 * @param profile - Defaults to Player's profile
 */
function GetPetHearingPhrases(profile: PetHearingKeys = PlayerP(Player).type): string[]
{
    if (profile in PET_HEARING)
    {
        return PET_HEARING.All.concat(PET_HEARING[profile]);
    }

    return PET_HEARING.All;
}

export class ProfileModule extends Module
{
    get Title(): ModuleTitle
    {
        return ModuleTitle.Profile;
    }

    get Settings(): Setting[]
    {
        return [
            {
                name: "type",
                type: "option",
                active: () => true,
                options: Object.keys(GARBLE_PHRASES),
                value: "Human",
                label: "Use a preset profile or make your own",
                loop: true,
                onSet(C, value, prevValue)
                {
                    const eleID = ElementName(ModuleTitle.Profile, "garblePhrases");
                    if (value === "Custom")
                    {
                        PlayerP(C).garblePhrases = PlayerP(C).customGarblePhrases.join(", ");
                        ElementValue(eleID, PlayerP(C).garblePhrases);
                        return;
                    }
                    if (prevValue === "Custom")
                    {
                        PlayerP(C).customGarblePhrases = ElementValue(eleID).split(",").map((x) => x.trim());
                    }
                    PlayerP(C).garblePhrases = (GARBLE_PHRASES[PlayerP(C).type] as string[]).join(", ");
                    ElementValue(eleID, PlayerP(C).garblePhrases);
                }
            } as OptionSetting, {
                name: "petHearing",
                type: "checkbox",
                active: () => true,
                value: false,
                label: "While deafened certain pet keywords can be picked up"
            } as CheckboxSetting, {
                name: "garblePhrases",
                type: "text",
                active: (C) => PlayerP(C).type === "Custom",
                value: GARBLE_PHRASES.Human.join(),
                label: "Pet sounds you make",
                maxChars: 1024,
                width: 1024
            } as TextSetting, {
                name: "customGarblePhrases",
                type: "record",
                value: []
            } as Setting, {
                name: "petSpeaking",
                type: "checkbox",
                active: () => true,
                value: false,
                label: "Automatically make the above pet sounds while talking"
            } as CheckboxSetting, {
                name: "hardcore",
                type: "checkbox",
                active: () => true,
                value: false,
                label: "Enable hardcore mode; Will set certain settings and prevent changing them back",
                onSet(C)
                {
                    GetRecord(ModuleTitle.Clicker, C).enabled = true;
                    GetRecord(ModuleTitle.Clicker, C).bcxVoice = true;
                    GetRecord(ModuleTitle.VirtualPet, C).enabled = true;
                    GetRecord(ModuleTitle.VirtualPet, C).noHands = false;
                    GetRecord(ModuleTitle.VirtualPetConditions, C).enabled = true;
                    GetRecord(ModuleTitle.VirtualPetConditions, C).foodNOW = true;
                    GetRecord(ModuleTitle.VirtualPetConditions, C).tint = true;
                    GetRecord(ModuleTitle.VirtualPetConditions, C).passout = true;
                    GetRecord(ModuleTitle.VirtualPetConditions, C).affectionSkillBuffs = false;
                    GetRecord(ModuleTitle.VirtualPetConditions, C).affectionSkillDebuffs = true;
                    GetRecord(ModuleTitle.VirtualPetConditions, C).hearingLoss = true;
                    GetRecord(ModuleTitle.VirtualPetConditions, C).slowLeave = true;
                }
            } as CheckboxSetting
        ];
    }

    Load(): void
    {
        super.Load();
        SpeechTransformAllEffects.push("petSpeak" as SpeechTransformName);

        // Pet hearing
        HookFunction(this.Title, "SpeechTransformGagGarble", 5, ([text, intensity, ignoreOOC, ...args], next) =>
        {
            // MBS adds Character parameter to this, can use as an extra check for when to apply
            const C = (args as [C?: Character, ...args: unknown[]])[0];

            // Are we gagging or deafening?
            // Not deafening so skip
            if (
                C?.IsGagged()
                || !Player.IsDeaf()
                || PlayerP().petHearing === false
            )
            {
                return next([text, intensity, ignoreOOC]);
            }
            return ApplyPetHearing([text, intensity, ignoreOOC], next, GetPetHearingPhrases());
        });

        // Insert pet sounds on input for BCX support
        HookFunction(this.Title, "CommandParse", 8, ([msg], next) =>
        {
            // Skip commands
            // Skip if not attempting to apply pet speech
            msg = msg.trim();
            if (
                msg.startsWith(CommandsKey)
                || !PlayerP(Player).petSpeaking
            )
            {
                return next([msg]);
            }

            return NonDisruptivePetSpeech(msg, next, GetAllowedPetGarblePhrases());
        });
    }

    Unload(): void
    {
        super.Unload();

        SpeechTransformAllEffects = SpeechTransformAllEffects.filter((transform) => transform as SpeechTransformName | "petSpeak" !== "petSpeak");
    }
}
