import { HookFunction } from "../util/sdk";
import { Module, ModuleTitle } from "./_module";
import { FindCharacterInRoom, GetMPAMessageFromChat, HookedMessage, hookedMessages, MPAMessageContent, SendMPAMessage } from "../util/messaging";

/**
 * Sync all of your current settings with everyone else
 * @param reply - If we want others to share their settings back
 * @param target - Share only to this one MemberNumber
 */
export function SettingSync(reply: boolean = false, target?: number): void
{
    SendMPAMessage({
        message: "SettingSync",
        settings: Player.MPA,
        reply: reply
    }, target);
}

/**
 * Sync all of your current settings of a given category with others
 * @param category - Which ModuleTitle category to share
 * @param target - Share only to this one MemberNumber
 */
export function CategorySync(category: ModuleTitle, target?: number): void
{
    SendMPAMessage({
        message: "CategorySync",
        category: category,
        value: Player.MPA[category]
    }, target);
}

/**
 * Sync only a single record from a given category with others
 * @param category - Which ModuleTitle category to share
 * @param record - Record within ModuleTitle you want to share
 * @param target - Share only to this one MemberNumber
 */
export function RecordSync(category: ModuleTitle, record: string, target?: number): void
{
    // DEPRECIATED, DELETE AFTER STABLE PUSH MADE V0.4.4
    // Currently here for backwards compatibility with dev and stable
    SendMPAMessage({
        message: "RecordSync",
        category: category,
        record: record,
        value: Player.MPA[category][record]
    }, target);

    RecordsSync([{ category: category, record: record }], target);
}

type TransmitRecords = { category: ModuleTitle; record: string; value?: any }[];
/**
 * Sync multiple records from any given category with others
 * @param records.category - Which ModuleTitle category to share
 * @param records.record - Record within ModuleTitle you want to share
 * @param target - Share only to this one MemberNumber
 */
export function RecordsSync(records: TransmitRecords, target?: number): void
{
    for (const record of records)
    {
        record.value = Player.MPA[record.category][record.record];
    }
    SendMPAMessage({
        message: "RecordsSync",
        records: records
    }, target);
}

export class DataSyncModule extends Module
{
    get Title(): ModuleTitle
    {
        return ModuleTitle.DataSync;
    }

    get SyncListeners(): HookedMessage[]
    {
        return [
            {
                module: ModuleTitle.DataSync,
                message: "SettingSync",
                action: function (sender: Character, content: MPAMessageContent): void
                {
                    sender.MPA = content.settings;
                    if (content.reply)
                    {
                        SettingSync(false, sender.MemberNumber);
                    }
                }
            }, {
                module: ModuleTitle.DataSync,
                message: "CategorySync",
                action: function (sender: Character, content: MPAMessageContent): void
                {
                    if (!sender.MPA)
                    {
                        SettingSync(false, sender.MemberNumber);
                    }
                    else
                    {
                        sender.MPA[content.category] = content.value;
                    }
                }
            }, {
                // DEPRECIATED, DELETE AFTER STABLE PUSH MADE V0.4.4
                module: ModuleTitle.DataSync,
                message: "RecordSync",
                action: function (sender: Character, content: MPAMessageContent): void
                {
                    if (!sender?.MPA?.[content.category])
                    {
                        CategorySync(content.category, sender.MemberNumber);
                    }
                    else
                    {
                        sender.MPA[content.category][content.record] = content.value;
                    }
                }
            }, {
                module: ModuleTitle.DataSync,
                message: "RecordsSync",
                action: function (sender: Character, content: MPAMessageContent): void
                {
                    for (const record of content.records as TransmitRecords)
                    {
                        if (!sender?.MPA?.[record.category])
                        {
                            CategorySync(content.category, sender.MemberNumber);
                        }
                        else
                        {
                            sender.MPA[record.category][record.record] = record.value;
                        }
                    }
                }
            }
        ];
    }

    Load(): void
    {
        super.Load();

        // MPA loaded in a chatroom, Sync with others in the room
        if (ChatRoomCharacter.length !== 0)
        {
            SettingSync(true);
        }

        // When joining a room, sync MPA settings with everyone else
        HookFunction(ModuleTitle.DataSync, "ChatRoomSync", 0, (args, next) =>
        {
            next(args);
            SettingSync(true);
        });

        // Sync request, handle and reply if needed
        HookFunction(ModuleTitle.DataSync, "ChatRoomMessage", 0, (args, next) =>
        {
            const data = args[0];
            const content = GetMPAMessageFromChat(data);
            if (!content)
            {
                return next(args);
            }
            const sender = FindCharacterInRoom(data.Sender ?? "", { MemberNumber: true, Name: false, NickName: false });
            if (!sender)
            {
                return next(args);
            }

            // Handle the data listeners
            hookedMessages.forEach((hook) =>
            {
                if (content.message === hook.message)
                {
                    hook.action(sender, content);
                }
            });
        });
    }

    Unload(): void
    {
        super.Unload();
    }
}
