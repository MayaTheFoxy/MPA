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
