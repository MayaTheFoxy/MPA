import { HookFunction } from "../util/sdk";
import { IsMemberNumberInAuthGroup } from "../util/authority";
import { Module, ModuleTitle } from "./_module";
import { GetCharacterCurrentStatValue, VirtualPetStatCategory, type VirtualPetStat } from "./virtualPet";

const PlayerVP: () => MPARecord = () =>
{
    return Player.MPA[ModuleTitle.VirtualPet];
};
const PlayerVPHUD: () => MPARecord = () =>
{
    return Player.MPA[ModuleTitle.VirtualPetHUD];
};

const VP_STAT_COLOR_DICT = {
    food: "#f2bb18",
    water: "#2a9fc3",
    sleep: "#8d2aee",
    affection: "#ff78f2"
};

function DrawStatCircle(x: number, y: number, radius: number, stat: VirtualPetStat): void
{
    const color = VP_STAT_COLOR_DICT[stat.stat];

    // Outer circle
    MainCanvas.beginPath();
    MainCanvas.arc(
        x,
        y,
        radius,
        0,
        2 * Math.PI,
        true
    );
    MainCanvas.lineWidth = radius / 8;
    MainCanvas.strokeStyle = color;
    MainCanvas.stroke();

    // Inner arc
    MainCanvas.beginPath();
    MainCanvas.arc(
        x,
        y,
        radius,
        -Math.PI / 2,
        (2 * Math.PI * -stat.level) - (Math.PI / 2),
        true
    );
    MainCanvas.lineTo(x, y);
    MainCanvas.fillStyle = color;
    MainCanvas.fill();

    // Display the text
    if (PlayerVPHUD().exactStats)
    {
        MainCanvas.fillStyle = "#000000";
        MainCanvas.font = CommonGetFont(radius * 1.25);
        MainCanvas.fillText(Math.round(stat.level * 100).toString(), x, y + (radius * 0.125));
        // Default size, idk if needed but can't hurt
        MainCanvas.font = CommonGetFont(36);
    }
}

function DrawVirualPetHud(x: number, y: number, zoom: number, stats: VirtualPetStat[]): void
{
    const pos: "Left" | "Center" | "Right" | "Split" = PlayerVPHUD().position;
    if (pos === "Left" || pos === "Right")
    {
        stats.reverse();
        stats.forEach((stat, index) =>
        {
            DrawStatCircle(
                x + ((pos === "Left" ? 80 : 420) * zoom),
                y + (950 - (index * 36)) * zoom,
                16 * zoom,
                stat
            );
        });
    }
    else if (pos === "Center")
    {
        const statLen = stats.length;
        stats.forEach((stat, index) =>
        {
            DrawStatCircle(
                x + (250 - ((statLen - 1) * 18) + (index * 36)) * zoom,
                y + (950 * zoom),
                16 * zoom,
                stat
            );
        });
    }
    // Probably a better way to do this, but I don't care. It works thats all I need.
    else if (pos === "Split")
    {
        const cols: VirtualPetStat[][] = [];
        switch (stats.length)
        {
            case 1:
                cols.push([stats[0]]);
                cols.push([]);
                break;
            case 2:
                cols.push([stats[0]]);
                cols.push([stats[1]]);
                break;
            case 3:
                cols.push([stats[1], stats[0]]);
                cols.push([stats[2]]);
                break;
            case 4:
                cols.push([stats[1], stats[0]]);
                cols.push([stats[3], stats[2]]);
                break;
            default:
        }
        cols.forEach((col, index) =>
        {
            col.forEach((stat, statIndex) =>
            {
                DrawStatCircle(
                    x + ((index == 0 ? 80 : 420) * zoom),
                    y + (950 - (statIndex * 36)) * zoom,
                    16 * zoom,
                    stat
                );
            });
        });
    }
}

export class VirtualPetHUDModule extends Module
{
    get Title(): ModuleTitle
    {
        return ModuleTitle.VirtualPetHUD;
    }

    get Settings(): Setting[]
    {
        return [
            {
                name: "self",
                type: "checkbox",
                active: () => !!PlayerVP().enabled,
                value: true,
                label: "Display your own virtual pet stats on the HUD"
            } as CheckboxSetting, {
                name: "exactStats",
                type: "checkbox",
                active: () => !!PlayerVP().enabled || PlayerVPHUD().others !== "Off",
                value: false,
                label: "Display the exact number percentage on the HUD"
            } as CheckboxSetting, {
                name: "position",
                type: "option",
                active: () => !!PlayerVP().enabled || PlayerVPHUD().others !== "Off",
                options: ["Left", "Center", "Right", "Split"],
                value: "Left",
                label: "Where to display the HUD",
                loop: true
            } as OptionSetting, {
                name: "others",
                type: "option",
                active: () => true,
                options: ["Off", "Public", "Friends", "Whitelist", "Lovers", "Owners", "D/s Family", "Clubowner"],
                value: "Friends",
                label: "Display the virtual pet stats of others on the HUD",
                loop: false
            } as OptionSetting
        ];
    }

    Load(): void
    {
        HookFunction(this.Title, "DrawArousalMeter", 1, (args, next) =>
        {
            const [character, x, y, zoom] = args;
            // Get character stats when support for multplayer
            if (
                !ActivityAllowed()
                || (character.IsPlayer() && (!PlayerVPHUD().self || !PlayerVP().enabled))
                || (!character.IsPlayer() && PlayerVPHUD().others === "Off")
                || (!character.IsPlayer() && !IsMemberNumberInAuthGroup(character.MemberNumber as number, PlayerVPHUD().others))
            )
            {
                return next(args);
            }

            // Get the stats for the character, not just the player
            const characterVPStats = character?.MPA?.[ModuleTitle.VirtualPet];
            if (!characterVPStats?.enabled)
            {
                return next(args);
            }

            const stats: VirtualPetStat[] = [];
            (["food", "water", "sleep", "affection"] as VirtualPetStatCategory[]).forEach((stat) =>
            {
                if (characterVPStats[`${stat}Hours`] !== 0)
                {
                    stats.push({
                        stat: stat,
                        level: GetCharacterCurrentStatValue(character, stat)
                    });
                }
            });
            if (stats.length !== 0)
            {
                DrawVirualPetHud(x, y, zoom, stats);
            }

            return next(args);
        });
    }

    Unload(): void
    {
        super.Unload();
    }
}
