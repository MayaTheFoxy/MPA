// If you want to localize this addon to your language for yourself and others, here is how
// 1. Create a new file in the localization directory named [language].json
// 2. Copy and paste the contents of template.json into your new [language].json file.
// 3. Replace the right(empty) side of the text with the translation from the English on the left.
// 3b. Do not translate words like SourceCharacter and SettingsArray, leave those as they will be filled in by the code
// 4. Import the json following the example below, make sure that the name you import the file is
//    the same that defined by TranslationLanguage. Ex: English -> EN
//    If you are unsure of how to do this but still want to contribute, reach out and I will attempt to help.

import template from "./template.json";
import RU from "./RU.json";
import CN from "./CN.json";

// Everything is defaulted to English
const translations =
{
    template: template,
    RU: RU,
    CN
};

export function LocalizedText(text: string): string
{
    const translatedText = translations?.[TranslationLanguage]?.[text];
    if (!!translatedText && translatedText !== "")
    {
        return translatedText;
    }
    return text;
}
