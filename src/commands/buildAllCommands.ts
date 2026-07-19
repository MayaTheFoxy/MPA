import { Bed } from "@/commands/bed";
import { Bowl } from "@/commands/bowl";
// import { LogChat } from "@/commands/log";

export function BuildAllCommands(): void
{
    Bed();
    Bowl();
    // LogChat();
}
