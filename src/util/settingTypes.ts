export function IsDisplaySetting(setting: Setting): setting is DisplayedSetting
{
    return (
        typeof (setting as DisplayedSetting).active === "function"
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
