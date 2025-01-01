import { SaveStorage } from "../util/storage";
import { ModuleTitle } from "../modules/_module";
import { ALL_BEDS } from "../util/constants";
import { FindCharacterInRoom, GetAttributeFromChatDictionary, MPANotifyPlayer, NotifyPlayer, SendAction, SendMPAMessage } from "../util/messaging";
import { HookFunction } from "../util/sdk";

function IsBed(bed: any): boolean
{
    // Invalid craft = skip
    return CraftingValidate(bed) === CraftingStatusType.OK
        && (ALL_BEDS.includes(bed.Item)
            || bed?.Name?.toLocaleLowerCase()?.includes("bed"));
}

/**
 * Display the bed text
 */
function GiveBedText(character: Character = Player): void
{
    if (character.MemberNumber === Player.MemberNumber)
    {
        SendAction(
            "SourceCharacter crawls into PronounPossessive bed.",
            undefined,
            [{ SourceCharacter: Player.MemberNumber } as SourceCharacterDictionaryEntry]
        );
    }
    else
    {
        SendMPAMessage({message:"bedTuck"}, character.MemberNumber);
        SendAction(
            "SourceCharacter tucks TargetCharacter into bed.",
            undefined,
            [{ SourceCharacter: Player.MemberNumber } as SourceCharacterDictionaryEntry,
             { TargetCharacter: character.MemberNumber } as TargetCharacterDictionaryEntry]
        );
    }
}

/** 
 * Use a bed on yourself
 */
function UseBed(): void
{
    if (InventoryGet(Player, "ItemDevices")
        || InventoryGroupIsBlockedForCharacter(Player, "ItemDevices"))
    {
        return;
    }

    const savedBed = JSON.parse(LZString.decompressFromBase64(Player.MPA[ModuleTitle.Private].savedBed || "") || "{}") || {};
    if (IsBed(savedBed))
    {
        InventoryWear(
            Player,
            savedBed.Item,
            "ItemDevices",
            savedBed.Color.split(','),
            0,
            Player.MemberNumber,
            savedBed,
            false
        );
    }
    else
    {
        const hairColor = InventoryGet(Player, "HairFront")?.Color as ItemColor;
        InventoryWear(
            Player,
            "PetBed",
            "ItemDevices",
            [hairColor[0], "Default", hairColor[hairColor.length - 1]],
            0,
            Player.MemberNumber,
            undefined,
            false
        );
    }
    ChatRoomCharacterItemUpdate(Player, "ItemDevices");
}

/**
 * Give a bed to someone
 *
 * @param character - Who to give the bed too
 * @returns If bed was given
 */
function GiveBed(character: Character = Player): boolean
{
    const unableToGiveBed = InventoryGet(character, "ItemDevices")
        || InventoryGroupIsBlockedForCharacter(character, "ItemDevices");

    if (character.MemberNumber !== Player.MemberNumber)
    {
        if (!ServerChatRoomGetAllowItem(Player, character))
        {
            NotifyPlayer("MPA: No BC item permission", 30000);
            return false;
        }
        if (!character.MPA || character.MPA?.version !== Player.MPA.version)
        {
            MPANotifyPlayer(`${character.Nickname || character.Name} does not have MPA, unable to give bed`, 30000);
            return false
        }
        if (unableToGiveBed)
        {
            MPANotifyPlayer(`Unable to tuck ${character.Nickname || character.Name} into bed`, 30000);
            return false;
        }
        GiveBedText(character);
        return true;
    }
    
    if (unableToGiveBed)
    {
        MPANotifyPlayer("Unable to crawl into bed", 30000);
        return false;
    }

    UseBed();
    GiveBedText(character);
    return true;
}

export function Bed(): void
{
    CommandCombine([{
        Tag: "bed",
        Description: "Crawl into bed without needing hands",
        Action: (_args, msg, _parsed) =>
        {
            // Argument is passed
            const arg = ((/^(\S+)\s*(.*)$/.exec(msg)) ?? ["", "", ""])[2];
            if (arg)
            {
                const char = FindCharacterInRoom(arg);
                if (char)
                {
                    GiveBed(char);
                    return;
                }

                // Check for bed craft
                const obj = JSON.parse(LZString.decompressFromBase64(arg) || "{}") || {};
                if (IsBed(obj))
                {
                    Player.MPA[ModuleTitle.Private].savedBed = arg;
                    SaveStorage(false);
                    MPANotifyPlayer("Bed saved");
                    return;
                }

                MPANotifyPlayer("Invalid argument given!");
                return;
            }

            GiveBed(Player);
        }
    }, {
        Tag: "blanket",
        Description: "Pull the blanket over yourself",
        Action: () =>
        {
            // blanky
            const bed = InventoryGet(Player, "ItemDevices");
            if (bed?.Asset.Name !== "PetBed")
            {
                MPANotifyPlayer("Unable to pull the blanket over yourself.", 20000);
                return;
            }

            if (!(bed.Property?.TypeRecord?.typed === 0 || bed.Property?.TypeRecord?.typed === 1))
            {
                MPANotifyPlayer("Unable to pull the blanket over yourself.", 20000);
                return;
            }
            bed.Property.TypeRecord.typed = Number(!bed.Property.TypeRecord.typed);
            ChatRoomCharacterUpdate(Player);
            if (bed.Property.TypeRecord.typed === 1)
            {
                SendAction(
                    "SourceCharacter pulls a blanket over PronounObject.",
                    undefined,
                    [{ SourceCharacter: Player.MemberNumber } as SourceCharacterDictionaryEntry]
                );
            }
            else
            {
                SendAction(
                    "SourceCharacter removes the blanket from on top of PronounObject.",
                    undefined,
                    [{ SourceCharacter: Player.MemberNumber } as SourceCharacterDictionaryEntry]
                );
            }
        }
    }]);

    HookFunction(null, "ChatRoomMessage", 100, (args, next) =>
    {
        const data = args[0];
        if (data.Type === "Activity"
            && data.Content === "MayaScript"
            && GetAttributeFromChatDictionary(data, "TargetCharacter") === Player.MemberNumber
            && data.Dictionary?.some(
                curr => (curr as any)?.Tag === "MISSING ACTIVITY DESCRIPTION FOR KEYWORD MayaScript" 
                    && (curr as any)?.Text === "SourceCharacter tucks TargetCharacter into bed."
            )
        )
        {
            UseBed();
        }
        return next(args);
    });
}
