import { AUTHORITY_GROUP_OPTIONS } from "../util/authority";
import { Module, ModuleTitle } from "./_module";

const PlayerP: (C?: Character) => MPARecord = (C: Character = Player) =>
{
    return C.MPA?.[ModuleTitle.Authority] ?? {};
};

export function IsHardcoreOn(C: Character): boolean
{
    return (C.MPA?.[ModuleTitle.Authority].hardcore as boolean | undefined) ?? false;
};

type SelfAccess = `self${keyof typeof ModuleTitle}`;
type OthersAccess = `others${keyof typeof ModuleTitle}`;

export class AuthorityModule extends Module
{
    get Title(): ModuleTitle
    {
        return ModuleTitle.Authority;
    }

    get Settings(): Setting[]
    {
        return [
            {
                name: "owners",
                type: "text",
                active: () => true,
                value: "",
                label: "Owner member numbers; Seperated by a ,",
                maxChars: 1024,
                width: 400
            } as TextSetting, {
                name: "boundAccessSelf",
                type: "checkbox",
                active: () => true,
                value: true,
                label: "Allow TargetCharacter changing TargetPronounPossessive own settings while bound"
            } as CheckboxSetting, {
                name: "boundAccessOthers",
                type: "checkbox",
                active: () => true,
                value: false,
                label: "Allow TargetCharacter changing the settings of others while bound"
            } as CheckboxSetting, {
                name: "selfAuthority" as SelfAccess,
                type: "checkbox",
                active: () => true,
                value: true,
                label: "Allow TargetCharacter to change TargetPronounPossessive Authority settings"
            } as CheckboxSetting, {
                name: "othersAuthority" as OthersAccess,
                type: "option",
                active: () => true,
                options: AUTHORITY_GROUP_OPTIONS,
                value: "Clubowner",
                label: "Allow others to change TargetCharacter's Authority settings",
                loop: false
            } as OptionSetting, {
                name: "selfProfile" as SelfAccess,
                type: "checkbox",
                active: (C) => PlayerP(C).othersProfile !== "Self",
                value: true,
                label: "Allow TargetCharacter to change TargetPronounPossessive Profile settings"
            } as CheckboxSetting, {
                name: "othersProfile" as OthersAccess,
                type: "option",
                active: () => true,
                options: AUTHORITY_GROUP_OPTIONS,
                value: "Clubowner",
                label: "Allow others to change TargetCharacter's Profile settings",
                loop: false,
                onSet(C)
                {
                    PlayerP(C).selfProfile = true;
                }
            } as OptionSetting, {
                name: "selfClicker" as SelfAccess,
                type: "checkbox",
                active: () => true,
                value: true,
                label: "Allow TargetCharacter to change TargetPronounPossessive Clicker settings"
            } as CheckboxSetting, {
                name: "othersClicker" as OthersAccess,
                type: "option",
                active: () => true,
                options: AUTHORITY_GROUP_OPTIONS,
                value: "Clubowner",
                label: "Allow others to change TargetCharacter's Clicker settings",
                loop: false
            } as OptionSetting, {
                name: "selfVirtualPet" as SelfAccess,
                type: "checkbox",
                active: () => true,
                value: true,
                label: "Allow TargetCharacter to change TargetPronounPossessive Virtual Pet settings"
            } as CheckboxSetting, {
                name: "othersVirtualPet" as OthersAccess,
                type: "option",
                active: () => true,
                options: AUTHORITY_GROUP_OPTIONS,
                value: "Clubowner",
                label: "Allow others to change TargetCharacter's Virtual Pet settings",
                loop: false
            } as OptionSetting, {
                name: "selfVirtualPetConditions" as SelfAccess,
                type: "checkbox",
                active: () => true,
                value: true,
                label: "Allow TargetCharacter to change TargetPronounPossessive Virtual Pet Conditions settings"
            } as CheckboxSetting, {
                name: "othersVirtualPetConditions" as OthersAccess,
                type: "option",
                active: () => true,
                options: AUTHORITY_GROUP_OPTIONS,
                value: "Clubowner",
                label: "Allow others to change TargetCharacter's Virtual Pet Conditions settings",
                loop: false
            } as OptionSetting
        ];
    }
}
