import { HookFunction } from "../util/sdk";
import { IsMemberNumberInAuthGroup } from "../util/authority";
import { Module, ModuleTitle } from "./_module";
import { GetCharacterCurrentStatValue, VirtualPetStatCategory, type VirtualPetStat } from "./virtualPet";
import { LocalizedText } from "../localization/localization";

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
        const prevFont = MainCanvas.font;
        MainCanvas.font = CommonGetFont(radius * 1.25);
        
        // Set up outline
        MainCanvas.lineWidth = 2; // adjust as needed
        MainCanvas.strokeStyle = "#000000";
        MainCanvas.strokeText(Math.round(stat.level * 100).toString(), x, y + (radius * 0.125));

        // Fill the text
        MainCanvas.fillStyle = "#ffffff"; // or any fill color you want
        MainCanvas.fillText(Math.round(stat.level * 100).toString(), x, y + (radius * 0.125));
        MainCanvas.font = prevFont;
    }
}

function DrawStatTooltip(x: number, y: number, radius: number, stat: VirtualPetStat)
{
    const statName = LocalizedText(stat.stat.charAt(0).toUpperCase() + stat.stat.slice(1));
    const tootipText = `${statName}: ${Math.round(stat.level * 100)}%`;

    if (MouseIn(x - radius, y - radius, radius * 2, radius * 2))
    {
        const prevTextAlign = MainCanvas.textAlign;
        const prevFont = MainCanvas.font;

        MainCanvas.textAlign = "left";
        MainCanvas.font = CommonGetFont(26);

        const pad = 5;
        const pos: "Left" | "Center" | "Right" | "Split" = PlayerVPHUD().position;
        const size = MainCanvas.measureText(tootipText);
        const width = size.actualBoundingBoxRight - size.actualBoundingBoxLeft + 2 * pad;
        const height = size.actualBoundingBoxDescent + size.actualBoundingBoxAscent + 2 * pad;

        let TextX = x;
        let TextY = y;

        // Adjust position based on HUD position
        switch (pos)
        {
            case "Left":
                TextX = x + pad;
                break;
            case "Center":
            case "Split":
                TextX = x - width / 2;
                TextY = TextY - height;
                break;
            case "Right":
                TextX = x - width;
                break;
        }

        TextY = TextY - size.actualBoundingBoxAscent;

        DrawRect(TextX - pad + 3, TextY - pad + 3, width, height, "rgba(0, 0, 0, .7)");
        DrawRect(TextX - pad, TextY - pad, width, height, "#D7F6E9");
        DrawTextFit(tootipText, TextX, TextY + pad * 2, size.width, "Black");

        MainCanvas.textAlign = prevTextAlign;
        MainCanvas.font = prevFont;
    }
}

function DrawVirualPetHud(x: number, y: number, zoom: number, stats: VirtualPetStat[]): void
{
    const pos: "Left" | "Center" | "Right" | "Split" = PlayerVPHUD().position;

    type PositionedStat = {
        stat: VirtualPetStat;
        x: number;
        y: number;
    };

    const circles: PositionedStat[] = [];

    if (pos === "Left" || pos === "Right")
    {
        const baseX = x + (pos === "Left" ? 80 : 420) * zoom;
        const reversedStats = [...stats].reverse();
        reversedStats.forEach((stat, index) =>
        {
            circles.push({
                stat: stat,
                x: baseX,
                y: y + (950 - (index * 36)) * zoom
            });
        });
    }
    else if (pos === "Center")
    {
        const statLen = stats.length;
        stats.forEach((stat, index) =>
        {
            circles.push({
                stat: stat,
                x: x + (250 - ((statLen - 1) * 18) + (index * 36)) * zoom,
                y: y + (950 * zoom)
            });
        });
    }
    // Probably a better way to do this, but I don't care. It works thats all I need.
    else if (pos === "Split")
    {
        const cols: VirtualPetStat[][] = [];
        switch (stats.length)
        {
            case 1: cols.push([stats[0]], []); break;
            case 2: cols.push([stats[0]], [stats[1]]); break;
            case 3: cols.push([stats[1], stats[0]], [stats[2]]); break;
            case 4: cols.push([stats[1], stats[0]], [stats[3], stats[2]]); break;
            default:
        }
        cols.forEach((col, colIndex) =>
        {
            const baseX = x + (colIndex === 0 ? 80 : 420) * zoom;
            col.forEach((stat, statIndex) =>
            {
                circles.push({
                    stat: stat,
                    x: baseX,
                    y: y + (950 - statIndex * 36) * zoom
                });
            });
        });
    }

    // Draw all circles
    circles.forEach(({ stat, x, y }) =>
    {
        DrawStatCircle(x, y, 16 * zoom, stat);
    });

    // Draw all tooltips after
    circles.forEach(({ stat, x, y }) =>
    {
        DrawStatTooltip(x, y, 16 * zoom, stat);
    });
}

function ShouldDrawHud<T extends typeof DrawArousalMeter | typeof DrawCharacter>(
    args: Parameters<T>,
    next: any
)
{
    const output = next(args);
    const [character, x, y, zoom] = args;
    // Get character stats when support for multplayer
    if (
        !ActivityAllowed()
        || (character.IsPlayer() && (!PlayerVPHUD().self || !PlayerVP().enabled))
        || (!character.IsPlayer() && PlayerVPHUD().others === "Off")
        || (!character.IsPlayer() && !IsMemberNumberInAuthGroup(character.MemberNumber as number, PlayerVPHUD().others))
    )
    {
        return output;
    }

    // Get the stats for the character, not just the player
    const characterVPStats = character?.MPA?.[ModuleTitle.VirtualPet];
    if (!characterVPStats?.enabled)
    {
        return output;
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

    return output;
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
            } as OptionSetting, {
                name: "forceDraw",
                type: "checkbox",
                active: () => !!PlayerVP().enabled || PlayerVPHUD().others !== "Off",
                value: false,
                label: "Always display the HUD; Overrides BCX rule \"Force-hide UI elements\""
            } as CheckboxSetting
        ];
    }

    Load(): void
    {
        HookFunction(this.Title, "DrawArousalMeter", 1, (args, next) =>
        {
            if (CurrentScreen !== "Wardrobe" && !PlayerVPHUD()?.forceDraw)
            {
                return ShouldDrawHud(args, next);
            }
            return next(args);
        });

        HookFunction(this.Title, "DrawCharacter", 1, (args, next) =>
        {
            if (CurrentScreen !== "Wardrobe" && PlayerVPHUD()?.forceDraw)
            {
                return ShouldDrawHud(args, next);
            }
            return next(args);
        });
    }

    Unload(): void
    {
        super.Unload();
    }
}
