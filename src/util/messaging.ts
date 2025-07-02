import { ModuleTitle } from "../modules/_module";
import { LocalizedText } from "../localization/localization";

export interface MPAMessageContent
{
    message: string;
    [key: string]: any; // Allows any other keys with values of any type
}
interface MPAMessage extends ServerChatRoomMessage
{
    Content: "MPA";
    Type: "Hidden";
    Dictionary: [MPAMessageContent];
}

export function ContentIsMPAMesage(content: ServerChatRoomMessage): content is MPAMessage
{
    return (
        content.Type === "Hidden"
        && content.Content === "MPA"
        && content?.Dictionary?.length === 1
    );
}

export function GetMPAMessageFromChat(message: ServerChatRoomMessage): MPAMessageContent | null
{
    return ContentIsMPAMesage(message) ? message.Dictionary[0] : null;
}

export function SendMPAMessage(message: MPAMessageContent, target?: number): void
{
    ServerSend("ChatRoomChat", {
        Type: "Hidden",
        Content: "MPA",
        Dictionary: [message],
        Target: target
    });
}

/**
 * Send an action to the room or can specify a character who will only see
 */
export function SendAction(content: string, target: Character | undefined = undefined, dictionary: ChatMessageDictionary = []): void
{
    ServerSend("ChatRoomChat", {
        Content: "MayaScript",
        Type: "Activity",
        Dictionary: [{ Tag: "MISSING ACTIVITY DESCRIPTION FOR KEYWORD MayaScript", Text: LocalizedText(content) }, ...dictionary],
        Target: target?.MemberNumber }
    );

    // ServerSend("ChatRoomChat", {
    //     Content: "Beep",
    //     Type: "Action",
    //     Dictionary: [{ Tag: "Beep", Text: LocalizedText(content) }],
    //     Target: target?.MemberNumber
    // });
}

/**
 * Send an emote to the room or can specify a character who will only see
 */
export function SendEmote(content: string, target: Character | undefined = undefined): void
{
    ServerSend("ChatRoomChat", {
        Content: `${content}`,
        Type: "Emote",
        Target: target?.MemberNumber }
    );
}

/**
 * Display text to the local player only
 */
export function NotifyPlayer(content: string, timeout?: number): void
{
    const darkTheme = Player.ChatSettings?.ColorTheme === "Dark" || Player.ChatSettings?.ColorTheme === "Dark2";
    ChatRoomSendLocal(`<p style='background-color:#00c2ff;color:${darkTheme ? "white" : "black"};margin-bottom:0.25em;margin-top:0'>${content}</p>`, timeout);
}

/**
 * Display text to the local player, making it clear its from MPA
 */
export function MPANotifyPlayer(content: string, timeout?: number): void
{
    NotifyPlayer(`${LocalizedText("MPA")}: ${content}`, timeout);
}

/**
 * Find a Character in the chat room with by number, name, or nick. Not case senstive.
 * If multiple people exists with the same nickname or name. It will return the first person that matches.
 * Use MemberNumber if you want to gurantee to find that specific character.
 *
 * @param search - The MemberNumber, Name, or Nickname of the person you want to find
 */
export function FindCharacterInRoom(search: string | number, { MemberNumber = true, Nickname = true, Name = true } = {}): Character | null
{
    // Make sure playerSearch is a string - not case senstive
    if (typeof search !== "string")
    {
        search = search.toString();
    }
    search = search.toLocaleLowerCase();

    // Loop through all the Characters in the chat
    for (const character of ChatRoomCharacter)
    {
        if (
            (MemberNumber && character?.MemberNumber === Number(search))
            || (Nickname && character?.Nickname?.toLocaleLowerCase() === search)
            || (Name && character.Name.toLocaleLowerCase() === search)
        )
        {
            return character;
        }
    }

    // No character found
    return null;
}

/**
 * Remove all content that is OOC from a message
 * @returns Only the IC message content
 */
export function RemoveOOCContentFromMessage(message: string): string
{
    const ranges = SpeechGetOOCRanges(message).reverse();
    ranges.forEach((range) =>
    {
        message = message.substring(0, range.start) + message.substring(range.start + range.length);
    });
    return message;
}

type MessageAction = (sender: Character, content: MPAMessageContent) => void;
export interface HookedMessage
{
    module: ModuleTitle | null;
    message: string;
    action: MessageAction;
}
export const hookedMessages: HookedMessage[] = [];

/**
 * Add a listener for an incoming MPA message
 * @param listener.title - What module does the listener belong to
 * @param listener.message - The message string to match with the incoming message
 * @param listener.action - Run this function when a match is found
 */
export function AddDataSyncListener(listener: HookedMessage): void
{
    hookedMessages.push({
        module: listener.module,
        message: listener.message,
        action: listener.action
    } as HookedMessage);
}
/**
 * Add many listeners for an incoming MPA message
 */
export function AddDataSyncListeners(listeners: HookedMessage[]): void
{
    listeners.forEach((listener) =>
    {
        hookedMessages.push({
            module: listener.module,
            message: listener.message,
            action: listener.action
        } as HookedMessage);
    });
}
/**
 * Remove all the listeners based on the ModuleTitle
 * @param module - Module the listeners you want to remove belongs to
 */
export function RemoveDataSyncListeners(module: ModuleTitle | null): void
{
    for (let i = hookedMessages.length - 1; 0 <= i; i--)
    {
        if (hookedMessages[i].module === module)
        {
            hookedMessages.splice(i, 1);
        }
    }
}

export function GetEntryFromChatDictionary(data: ServerChatRoomMessage, attribute: string): ChatMessageDictionaryEntry | undefined
{
    if (!data.Dictionary)
    {
        return undefined;
    }
    try
    {
        return data.Dictionary.filter((entry) => !!entry[attribute])[0];
    }
    catch (_error)
    {
        // ehhh this doesn't work cuz .filter is not defined on first load for some reason
        // No big deal so I don't really care if its an issue for now
    }
    return undefined;
}

export function GetAttributeFromChatDictionary(data: ServerChatRoomMessage, attribute: string): any | undefined
{
    return GetEntryFromChatDictionary(data, attribute)?.[attribute];
}

export function ArrayToReadableString(arr: string[]): string
{
    const length = arr.length;
    if (length === 0)
    {
        return "";
    }
    else if (length === 1)
    {
        return arr[0];
    }
    else if (length === 2)
    {
        return `${arr[0]} and ${arr[1]}`;
    }
    else
    {
        return `${arr.slice(0, -1).join(", ")}, and ${arr[length - 1]}`;
    }
}

export function MemberNumberToName(member: number, notFound: string = "Unknown"): string
{
    // Self?
    if (member === Player.MemberNumber)
    {
        return Player.Name;
    }

    // Friend?
    let friend = Player.FriendNames?.get(member);
    if (friend)
    {
        return friend;
    }

    // In room?
    let room = FindCharacterInRoom(member, { MemberNumber: true, Nickname: false, Name: false });
    if (room)
    {
        return room.Name;
    }

    return LocalizedText(notFound);
}
