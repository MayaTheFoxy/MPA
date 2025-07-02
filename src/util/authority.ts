import { ModuleTitle } from "../modules/_module";
import { FindCharacterInRoom } from "./messaging";

export const AUTHORITY_GROUP_OPTIONS: AuthorityGroup[] = [
    "Public",
    "Friends",
    "Whitelist",
    "Lovers",
    "Owners",
    "Clubowner",
    "Self"
];

const AUTHORITY_GROUP_PRIO_ORDER: AuthorityGroup[] = [
    "None",
    "Public",
    "Friends",
    "Whitelist",
    "Lovers",
    "Owners",
    "D/s Family",
    "Clubowner",
    "Self"
];

const Lovers = (C: Character) => (C.Lovership?.filter((x) => x.MemberNumber).map((lover) => lover.MemberNumber) ?? []) as number[];
export const AUTHORITY_GROUPS =
{
    Self: (C: Character) => [C.MemberNumber ?? -1],
    Clubowner: (C: Character) => C?.Ownership?.MemberNumber ? [C?.Ownership?.MemberNumber] : [],
    Owners: (C: Character) => C.MPA?.[ModuleTitle.Authority]?.newOwners.owners ?? [],
    Lovers: Lovers,
    WhiteList: (C: Character) => C.WhiteList ?? [],
    FriendList: () => Player.FriendList ?? []
};

export type AuthorityGroup = "Self" | "Clubowner" | "D/s Family" | "Owners" | "Lovers" | "Whitelist" | "Friends" | "Public" | "None";

export function IsMemberNumberInAuthGroup(memberNumber: number, authGroup: AuthorityGroup, allowSelf = false, sourceChar: Character = Player): boolean
{
    if (authGroup === "None")
    {
        return false;
    }

    // Deny self or instant access
    if (memberNumber === AUTHORITY_GROUPS.Self(sourceChar)[0])
    {
        // If Self AuthorityGroup, override the allowSelf flag
        return authGroup === "Self" ? true : allowSelf;
    }

    // No if in blacklist regardless of role
    if (sourceChar.BlackList.includes(memberNumber) || ((sourceChar as PlayerCharacter)?.GhostList?.includes(memberNumber) ?? false))
    {
        return false;
    }

    // Everyone allowed except blocked characters
    if (authGroup === "Public")
    {
        return true;
    }

    // Family only can be checked by against the Player themself
    if (authGroup === "D/s Family" && sourceChar.MemberNumber === Player.MemberNumber)
    {
        return FindCharacterInRoom(memberNumber)?.IsFamilyOfPlayer() ?? false;
    }

    let authCheck = new Set<number>();
    // Use switch fallthrough to get the set of all authed users in the group(s)
    switch (authGroup)
    {
        case "Friends":
            // Since FriendsList is not on other characters, can only check if the Player and another character are friends
            // Unable to check if 2 different characters are friends
            // targetChar is non-player and looking for Player member number
            if (
                sourceChar.MemberNumber !== Player.MemberNumber
                && Player.MemberNumber === memberNumber
                && AUTHORITY_GROUPS.FriendList().includes(sourceChar.MemberNumber ?? -1)
            )
            {
                return true;
            }
            // Player is self and looking through friends list
            if (sourceChar.MemberNumber === Player.MemberNumber)
            {
                authCheck = new Set([...authCheck, ...AUTHORITY_GROUPS.FriendList()]);
            }
            // @ts-ignore: fallthrough is intentional
        case "Whitelist":
            authCheck = new Set([...authCheck, ...AUTHORITY_GROUPS.WhiteList(sourceChar)]);
            // @ts-ignore: fallthrough is intentional
        case "Lovers":
            authCheck = new Set([...authCheck, ...AUTHORITY_GROUPS.Lovers(sourceChar)]);
            // @ts-ignore: fallthrough is intentional
        case "Owners":
            authCheck = new Set([...authCheck, ...AUTHORITY_GROUPS.Owners(sourceChar)]);
            // @ts-ignore: fallthrough is intentional
        case "Clubowner":
            authCheck = new Set([...authCheck, ...AUTHORITY_GROUPS.Clubowner(sourceChar)]);
            // @ts-ignore: fallthrough is intentional
        default:
    }

    return authCheck.has(memberNumber);
}

export function HighestLevelAuthorityGroup(memberNumber: number, targetChar: Character = Player): AuthorityGroup
{
    if (targetChar.MemberNumber === memberNumber)
    {
        return "Self";
    }
    if (targetChar?.Ownership?.MemberNumber === memberNumber)
    {
        return "Clubowner";
    }
    if (AUTHORITY_GROUPS.Owners(targetChar).includes(memberNumber))
    {
        return "Owners";
    }
    if (AUTHORITY_GROUPS.Lovers(targetChar).includes(memberNumber))
    {
        return "Lovers";
    }
    if (AUTHORITY_GROUPS.WhiteList(targetChar).includes(memberNumber))
    {
        return "Whitelist";
    }
    // Friends
    // Targetcharacter is self
    if (targetChar.MemberNumber === Player.MemberNumber && Player.FriendList?.includes(memberNumber))
    {
        return "Friends";
    }
    // Target character is not self, but lookup character is
    if (targetChar.MemberNumber !== Player.MemberNumber
      && memberNumber === Player.MemberNumber
      && Player.FriendList?.includes(targetChar.MemberNumber ?? -1)
    )
    {
        return "Friends";
    }
    // Public
    if (
        !(targetChar.BlackList.includes(memberNumber)
          || ((targetChar as PlayerCharacter)?.GhostList?.includes(memberNumber) ?? false))
    )
    {
        return "Public";
    }
    return "None";
}

export function AuthorityIsComparisonToCharacter(group: AuthorityGroup, comparison: ">" | "<" | `${"=" | "!" | ">" | "<"}=` = ">=", memberNumber: number, character: Character = Player): boolean
{
    const rank = HighestLevelAuthorityGroup(memberNumber, character);

    const groupIndex = AUTHORITY_GROUP_PRIO_ORDER.indexOf(group);
    const rankIndex = AUTHORITY_GROUP_PRIO_ORDER.indexOf(rank);

    if (groupIndex === -1 || rankIndex === -1)
    {
        return false;
    }

    switch (comparison)
    {
        case ">":
            return rankIndex > groupIndex;

        case "<":
            return rankIndex < groupIndex;

        case ">=":
            return rankIndex >= groupIndex;

        case "<=":
            return rankIndex <= groupIndex;

        case "==":
            return rankIndex == groupIndex;

        case "!=":
            return rankIndex != groupIndex;

        default:
            throw new Error("Invalid comparison operator");
    }
}
