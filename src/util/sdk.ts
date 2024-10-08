import bcModSdk, { GetDotedPathType, ModSDKModAPI, PatchHook } from "bondage-club-mod-sdk";
import { ModuleTitle } from "../modules/_module";
import { MPA_VERSION } from "./constants";

interface HookedFunction
{
    functionName: string;
    priority: number;
    hook: PatchHook;
    module: string | null;
    removeHook: () => void;
}
const hooks: HookedFunction[] = [];

export const modAPI: ModSDKModAPI = bcModSdk.registerMod({
    name: "MPA",
    version: MPA_VERSION,
    fullName: "Maya's Petplay Additions Pre-Alpha",
    repository: ""
}, {
    allowReplace: false
});

/**
 * Hook a BC function
 * @param module - The title of the module the hook is being used in
 * @template TFunctionName - The name of the hooked function, _e.g._ `"Player.CanChange"`
 * @param functionName - Name of function to hook. Can contain dots to change methods in objects (e.g. `Player.CanChange`)
 * @param priority - Number used to determinate order hooks will be called in. Higher number is called first
 * @param hook - The hook itself to use, @see PatchHook
 * @returns Function that can be called to remove this hook
 */
export function HookFunction<TFunctionName extends string>(module: ModuleTitle | null, functionName: TFunctionName, priority: number, hook: PatchHook<GetDotedPathType<typeof globalThis, TFunctionName>>): () => void
{
    const removeHook = modAPI.hookFunction(functionName, priority, hook);

    hooks.push({
        functionName: functionName,
        priority: priority,
        hook: hook,
        module: module,
        removeHook: removeHook
    } as HookedFunction);

    return removeHook;
}

export function RemoveHooks(module: ModuleTitle | null): void
{
    for (let i = hooks.length - 1; 0 <= i; i--)
    {
        if (hooks[i].module === module)
        {
            hooks[i].removeHook();
            hooks.splice(i, 1);
        }
    }
}

/**
 * Only release the await when the Player is detected and loaded
 */
export async function AwaitPlayer(): Promise<void>
{
    if (Player.MemberNumber && Player.ExtensionSettings)
    {
        return;
    }

    return new Promise<void>((resolve) =>
    {
        const hook = modAPI.hookFunction("LoginResponse", 0, (args, next) =>
        {
            // Let response happen first
            next(args);

            // Remove this hook when done
            hook();

            // Resolve the promise to end the await condition
            resolve();
        });
    });
}
