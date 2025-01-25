import { HookFunction } from "../util/sdk";
import { Module, ModuleTitle } from "./_module";

export let deafenProcess = false;

export class PrivateModule extends Module
{
    get Title(): ModuleTitle
    {
        return ModuleTitle.Private;
    }

    get Settings(): Setting[]
    {
        return [
            {
                name: "savedBed",
                type: "record",
                value: ""
            }, {
                name: "savedBowl",
                type: "record",
                value: ""
            }
        ];
    }

    Load(): void
    {
        // I hate that this is the best way I could think of checking if speech garble is gagging or deafening
        // BECAUSE OF COURSE THEY ARE THE EXACT SAME CALL
        HookFunction(this.Title, "SpeechTransformProcess", 10, ([C, text, effects, ignoreOOC], next) =>
        {
            // Remove deafen before it happens but rememeber if it was there
            let hadDeafen = false;
            if (effects.includes("deafen"))
            {
                hadDeafen = true;
                effects = effects.filter((effect) => effect !== "deafen");
            }

            // Let all other speech processing happen, deafen will not
            const output = next([C, text, effects, ignoreOOC]);

            // Now do the deafen check that was not done before to add parameter to track
            if (hadDeafen)
            {
                const intensity = SpeechTransformDeafenIntensity(C);
                if (intensity > 0)
                {
                    deafenProcess = true;
                    output.effects.push("deafen");
                    // @ts-ignore Patching this function to add C for MBS
                    output.text = SpeechTransformGagGarble(text, intensity, ignoreOOC, C);
                    deafenProcess = false;
                }
            }
            return output;
        });
        super.Load();
    }

    Unload(): void
    {
        super.Unload();
    }
}
