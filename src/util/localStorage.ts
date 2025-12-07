const KEY = "MPA_STORAGE";

let storage: MPALocalStorage;

function BlankStorage(): MPALocalStorage
{
    return {
        lastOnline: Date.now()
    };
}

export function GetLocalStorage(): MPALocalStorage
{
    return storage;
}

export function LoadLocalStorage(): void
{
    storage = JSON.parse(LZString.decompressFromBase64(window.localStorage.getItem(KEY) ?? "") ?? "{}") ?? BlankStorage() as MPALocalStorage;
}

export function ResetLocalStorage(): void
{
    storage = BlankStorage();
    SaveToLocalStorage();
}

export function SaveToLocalStorage(): void
{
    // Check if existing local storge
    window.localStorage.setItem(KEY, LZString.compressToBase64(JSON.stringify(storage)));
}

export function GetLastOnline(): number
{
    return Math.max(Player.MPA?.lastOnline ?? 0, storage?.lastOnline);
}

export function UpdateLastOnline(): void
{
    storage.lastOnline = Date.now();
    Player.MPA.lastOnline = Date.now();
    SaveToLocalStorage();
}
