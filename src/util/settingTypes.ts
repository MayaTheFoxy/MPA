export function IsSetting(setting: any): setting is Setting
{
    return (
        typeof (setting as Setting).name === "string"
        && ["checkbox", "option", "text", "number", "record", "custom"].includes((setting as Setting).type)
        && (setting as Setting).value !== undefined
    );
}
export function IsDisplaySetting(setting: Setting): setting is DisplayedSetting
{
    return (
        IsSetting(setting)
        && typeof (setting as DisplayedSetting).active === "function"
        && typeof (setting as DisplayedSetting).label === "string"
    );
}
export function IsCheckboxSetting(setting: Setting): setting is CheckboxSetting
{
    return (
        IsDisplaySetting(setting)
        && (setting as CheckboxSetting).type === "checkbox"
        && typeof (setting as CheckboxSetting).value === "boolean"
    );
}
export function IsOptionSetting(setting: Setting): setting is OptionSetting
{
    return (
        IsDisplaySetting(setting)
        && (setting as OptionSetting).type === "option"
        && typeof (setting as OptionSetting).value === "string"
        && Array.isArray((setting as OptionSetting).options)
        && typeof (setting as OptionSetting).loop === "boolean"
    );
}
export function IsTextSetting(setting: Setting): setting is TextSetting
{
    return (
        IsDisplaySetting(setting)
        && (setting as TextSetting).type === "text"
        && typeof (setting as TextSetting).value === "string"
        && (typeof (setting as TextSetting).width === "number"
          || (setting as TextSetting).width === null)
        && (typeof (setting as TextSetting).maxChars === "number"
          || (setting as TextSetting).maxChars === null)
    );
}
export function IsNumberSetting(setting: Setting): setting is NumberSetting
{
    return (
        IsDisplaySetting(setting)
        && (setting as NumberSetting).type === "number"
        && typeof (setting as NumberSetting).value === "number"
        && (typeof (setting as NumberSetting).width === "number"
          || (setting as NumberSetting).width === null)
        && typeof (setting as NumberSetting).min === "number"
        && typeof (setting as NumberSetting).max === "number"
        && (typeof (setting as NumberSetting).step === "number"
          || (setting as NumberSetting).step === null)
    );
}
export function IsCustomSetting(setting: Setting): setting is CustomSetting
{
    return (
        IsDisplaySetting(setting)
        && setting.type === "custom"
        && typeof (setting as CustomSetting).OnClick === "function"
        && typeof (setting as CustomSetting).OnExit === "function"
        && typeof (setting as CustomSetting).OnLoad === "function"
        && typeof (setting as CustomSetting).OnRun === "function"
    );
}
