import { HookFunction } from "@/util/sdk";

let logging: boolean = false;
export function LogChat(): void
{
    CommandCombine([{
        Tag: "logchat",
        Description: "toggle chat logging",
        Action: () =>
        {
            logging = !logging;
        }
    }]);

    HookFunction(null, "ChatRoomMessage", 0, (args, next) =>
    {
        if (logging)
        {
            console.log(...args);
        }
        return next(args);
    });
}
