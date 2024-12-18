import { NotifyPlayer, SendAction } from "../util/messaging";

export function Bed(): void
{
    CommandCombine([{
        Tag: "bed",
        Description: "Crawl into bed without needing hands",
        Action: () =>
        {
            if (InventoryGet(Player, "ItemDevices") !== null)
            {
                NotifyPlayer("Unable to crawl into bed", 20000);
                return;
            }
            const hairColor = InventoryGet(Player, "HairFront")?.Color as ItemColor;
            InventoryWear(Player, "PetBed", "ItemDevices", [hairColor[0], "Default", hairColor[hairColor.length - 1]]);
            ChatRoomCharacterItemUpdate(Player, "ItemDevices");
            SendAction(
                "SourceCharacter crawls into PronounPossessive bed.",
                undefined,
                [{ SourceCharacter: Player.MemberNumber } as SourceCharacterDictionaryEntry]
            );
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
                NotifyPlayer("Unable to pull the blanket over yourself.", 20000);
                return;
            }

            if (!(bed.Property?.TypeRecord?.typed === 0 || bed.Property?.TypeRecord?.typed === 1))
            {
                NotifyPlayer("Unable to pull the blanket over yourself.", 20000);
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
}
