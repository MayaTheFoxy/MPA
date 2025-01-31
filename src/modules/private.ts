import { Module, ModuleTitle } from "./_module";

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
        super.Load();
    }

    Unload(): void
    {
        super.Unload();
    }
}
