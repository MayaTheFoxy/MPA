import { SaveStorage } from "../util/storage";
import { ModuleTitle } from "../modules/_module";
import { FindCharacterInRoom, GetAttributeFromChatDictionary, MPANotifyPlayer, NotifyPlayer, SendAction } from "../util/messaging";
import { HookFunction } from "../util/sdk";

const BOWL_SELF_TEXT = "SourceCharacter lays a bowl of food and water on the ground in front of PronounObjectself.";
const BOWL_OTHER_TEXT = "SourceCharacter lays a bowl of food and water on the ground in front of TargetCharacter.";
const BOWL_REGEX = /^(?:\w|[ ~!$#%*+])*$/;

function IsBowl(bowl: any): boolean
{
    // Invalid craft = skip
    return Object.keys(bowl).length > 0
      && CraftingValidate(bowl) === CraftingStatusType.OK
      && bowl?.Item == "PetBowl";
}

/**
 * Display the bowl text
 */
function GiveBowlText(character: Character = Player): void
{
    if (character.MemberNumber === Player.MemberNumber)
    {
        SendAction(
            BOWL_SELF_TEXT,
            undefined,
            [{ SourceCharacter: Player.MemberNumber } as SourceCharacterDictionaryEntry]
        );
    }
    else
    {
        SendAction(
            BOWL_OTHER_TEXT,
            undefined,
            [{ SourceCharacter: Player.MemberNumber } as SourceCharacterDictionaryEntry,
                { TargetCharacter: character.MemberNumber } as TargetCharacterDictionaryEntry]
        );
    }
}

/**
 * Use a bowl on yourself
 */
function UseBowl(): void
{
    if (InventoryGet(Player, "ItemDevices")
      || InventoryGroupIsBlockedForCharacter(Player, "ItemDevices"))
    {
        return;
    }

    const savedBowl = JSON.parse(LZString.decompressFromBase64(Player.MPA[ModuleTitle.Private].savedBowl || "") || "{}") || {};
    if (IsBowl(savedBowl))
    {
        (InventoryWear(
            Player,
            savedBowl.Item,
            "ItemDevices",
            savedBowl.Color.split(","),
            0,
            Player.MemberNumber,
            savedBowl,
            false
        ) as any).Property = savedBowl.ItemProperty;
    }
    else
    {
        const hairColor = InventoryGet(Player, "HairFront")?.Color as ItemColor;
        (InventoryWear(
            Player,
            "PetBowl",
            "ItemDevices",
            [hairColor[0], "#000000"],
            0,
            Player.MemberNumber,
            undefined,
            false
        ) as any).Property = {
            Text: ((Player.Nickname && BOWL_REGEX.test(Player.Nickname)) ? Player.Nickname : BOWL_REGEX.test(Player.Name) ? Player.Name : "").substring(0, 12)
        };
    }
    ChatRoomCharacterUpdate(Player);
}

/**
 * Give a bowl to someone
 *
 * @param character - Who to give the bowl too
 * @returns If bowl was given
 */
function GiveBowl(character: Character = Player): boolean
{
    const unableToGiveBowl = InventoryGet(character, "ItemDevices")
      || InventoryGroupIsBlockedForCharacter(character, "ItemDevices")
      || (character.MemberNumber !== Player.MemberNumber && !Player.CanInteract());

    if (character.MemberNumber !== Player.MemberNumber)
    {
        if (!ServerChatRoomGetAllowItem(Player, character))
        {
            NotifyPlayer("MPA: No BC item permission", 30000);
            return false;
        }
        if (!character.MPA || character.MPA?.version !== Player.MPA.version)
        {
            MPANotifyPlayer(`${character.Nickname || character.Name} does not have MPA, unable to give bowl`, 30000);
            return false;
        }
        if (unableToGiveBowl)
        {
            MPANotifyPlayer(`Unable to give ${character.Nickname || character.Name} a bowl`, 30000);
            return false;
        }
        GiveBowlText(character);
        return true;
    }

    if (unableToGiveBowl)
    {
        MPANotifyPlayer("Unable to give bowl", 30000);
        return false;
    }

    UseBowl();
    GiveBowlText(character);
    return true;
}

export function Bowl(): void
{
    CommandCombine([{
        Tag: "bowl",
        Description: "Give bowl to pet",
        Action: (_args, msg, _parsed) =>
        {
            // Argument is passed
            const arg = ((/^(\S+)\s*(.*)$/.exec(msg)) ?? ["", "", ""])[2];
            if (arg)
            {
                const char = FindCharacterInRoom(arg);
                if (char)
                {
                    GiveBowl(char);
                    return;
                }

                // Check for bowl craft
                const obj = JSON.parse(LZString.decompressFromBase64(arg) || "{}") || {};
                if (IsBowl(obj))
                {
                    Player.MPA[ModuleTitle.Private].savedBowl = arg;
                    SaveStorage(false);
                    MPANotifyPlayer("Bowl saved");
                    return;
                }

                MPANotifyPlayer("Invalid argument given!");
                return;
            }

            GiveBowl(Player);
        }
    }]);

    HookFunction(null, "ChatRoomMessage", 100, (args, next) =>
    {
        const data = args[0];
        if (data.Type === "Activity"
          && data.Content === "MayaScript"
          && GetAttributeFromChatDictionary(data, "TargetCharacter") === Player.MemberNumber
          && data.Dictionary?.some(
              (curr) => (curr as any)?.Tag === "MISSING ACTIVITY DESCRIPTION FOR KEYWORD MayaScript"
              && (curr as any)?.Text === BOWL_OTHER_TEXT
          )
        )
        {
            UseBowl();
        }
        return next(args);
    });
}
