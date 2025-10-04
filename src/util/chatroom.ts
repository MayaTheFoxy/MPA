interface CraftServerItemBundle extends ServerItemBundle
{
    Craft?: CraftingItem;
}

/** Get the item from a character and area
 *
 * @param character - Who to get item from
 * @param slot - Item slot
 */
export function SaveCharacterItem(character: Character, slot: AssetGroupName): CraftServerItemBundle | undefined
{
    const item = InventoryGet(character, slot);
    if (!item)
    {
        return undefined;
    }

    if (!item.Craft)
    {
        return WardrobeAssetBundle(item);
    }
    return {
        ...WardrobeAssetBundle(item),
        Craft: CraftingValidate(item.Craft ?? null, item.Asset ?? null, true) > CraftingStatusType.CRITICAL_ERROR ? item.Craft : undefined
    };
}

/**
 * Apply an array of items to a character while checking permissions and validation
 *
 * @param character - Character to apply items to
 * @param items - The items to apply
 * @param refresh - Refresh the character to update appearance
 */
export function ApplyItemsToCharacter(character: Character, items: CraftServerItemBundle[], refresh = true)
{
    if (character === null || items === null || !Array.isArray(items) || !ServerChatRoomGetAllowItem(Player, character)) { return; }

    try
    {
        const validParams = ValidationCreateDiffParams(character, Player.MemberNumber ?? -1);
        for (const item of items)
        {
            // Can we remove the old item
            const prevItem = InventoryGet(character, item.Group);
            if (prevItem !== null && !ValidationCanRemoveItem(prevItem, validParams, true))
            {
                continue;
            }
            // Can we add the new item?
            const newItem = InventoryItemCreate(character, item.Group, item.Name);
            if (newItem !== null && !ValidationCanAddItem(newItem, validParams))
            {
                continue;
            }

            // Apply the item we want
            const wornItem = InventoryWear(character, item.Name, item.Group, item.Color, item.Difficulty === undefined ? 0 : item.Difficulty, Player.MemberNumber, item.Craft, false);
            if (wornItem !== null && item.Property)
            {
                // Merge the properties on the new item
                const newProperty = wornItem.Property === undefined ? {} : structuredClone(wornItem.Property);
                for (const propKey of Object.keys(item.Property))
                {
                    newProperty[propKey] = item.Property[propKey];
                }
                wornItem.Property = newProperty;
            }
        }
        if (refresh)
        {
            if (ChatRoomCharacter?.length === 0)
            {
                CharacterRefresh(character);
            }
            else
            {
                ChatRoomCharacterUpdate(character);
            }
        }
    }
    catch (error)
    {
        console.log("Error while applying items to character", error);
    }
}
