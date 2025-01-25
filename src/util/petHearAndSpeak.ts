import { INVOLUNTARY_END_PET_SPEAK_PERCENTAGE, INVOLUNTARY_PET_SPEAK_PERCENTAGE, INVOLUNTARY_RUSHED_SPEAK_PERCENTAGE } from "./constants";
import { RandomElement, ShuffleArray } from "./general";

export function AppendPetSpeech(text: string, petPhrases: string[]): string
{
    // No valid pet phrases to add
    const petSound = RandomElement(petPhrases);
    if (petSound === null)
    {
        return text;
    }

    if (/[.!?]$/.test(text))
    {
        return `${text} ${petSound.charAt(0).toLocaleUpperCase() + petSound.slice(1)}.`;
    }
    if (/[a-zA-Z]$/.test(text))
    {
        return `${text}, ${petSound}.`;
    }
    return `${text} ${petSound}.`;
}

/**
 * Apply pet hearing to a SpeechTransformGagGarble input
 * @param args Args of the SpeechTransformGagGarble
 * @param next - Next SpeechTransformGagGarble to call
 * @param phrasesToKeep - Sounds the pet knows
 * @returns
 */
export function ApplyPetHearing([text, intensity, ignoreOOC]: [string, number, boolean | undefined],
    next: (args: [text: string, intensity: number, ignoreOOC?: boolean | undefined]) => string,
    phrasesToKeep: string[]): string
{
    // Split the input text into different substrings exluding the words you want to keep
    // Step 1: Get the words you want to keep if any
    // const phrasesToKeep = GetPetHearingPhrases();
    // Add the Player's name as a word they can hear
    phrasesToKeep.push((Player.Nickname || Player.Name).toLocaleLowerCase());
    // Add the Player's gender as in the example, "Good girl"
    if (Player.GetPronouns() === "SheHer")
    {
        phrasesToKeep.push("girl");
        phrasesToKeep.push("she");
        phrasesToKeep.push("her");
    }
    else
    {
        phrasesToKeep.push("boy");
        phrasesToKeep.push("he");
        phrasesToKeep.push("him");
    }

    // Step 2: Find the matches if they exist in the orginal message
    // Check lower case cuz the phrase we looking for in lower case, does not matter for final result, only want position
    const message = text.toLocaleLowerCase();
    interface Range { start: number; len: number }
    let foundPhrases: Range[] = [];
    phrasesToKeep.forEach((phrase) =>
    {
        const regExp = new RegExp(`\\b${phrase}\\b`, "g");
        const regexMatches = [...message.matchAll(regExp)];
        regexMatches.forEach((match) =>
        {
            foundPhrases.push({ start: match.index, len: phrase.length });
        });
    });

    // Remove duplicates because I am too lazy to properly debug why duplicates are being populated
    const uniqueRanges = new Map<string, Range>();
    for (const item of foundPhrases)
    {
        const key = `${item.start}-${item.len}`;
        if (!uniqueRanges.has(key))
        {
            uniqueRanges.set(key, item);
        }
    }
    foundPhrases = Array.from(uniqueRanges.values());

    // No matches found so can skip and early return
    if (foundPhrases.length === 0)
    {
        return next([text, intensity, ignoreOOC]);
    }

    // Sort so that it is constructed in the correct order when put back together; lower starting indexes first
    foundPhrases.sort((a, b) => a.start - b.start);
    // Remove any phrases that are found within OOC speech range;
    const oocRanges = SpeechGetOOCRanges(text);
    oocRanges.forEach((range) =>
    {
        for (let i = foundPhrases.length - 1; i >= 0; i--)
        {
            const phrase = foundPhrases[i];
            // Remove if the phrase starts or ends within the ooc range
            if (
                (range.start < phrase.start && phrase.start < range.start + range.length)
                || (range.start < phrase.start + phrase.len && phrase.start + phrase.len < range.start + range.length)
            )
            {
                foundPhrases.splice(i, 1);
            }
        }
    });

    // May need to check that one phrase does not start before another ends, and if so merge into a single longer entry
    let lastIndex = 0;
    let finalText = "";
    foundPhrases.forEach((found) =>
    {
        // Before the phrase to omit
        finalText += next([text.substring(lastIndex, found.start), intensity, ignoreOOC]);

        // Phrase we want to omit
        lastIndex = found.start + found.len;
        finalText += text.substring(found.start, found.start + found.len);
    });
    // Last of the text to garble up
    finalText += next([text.substring(lastIndex), intensity, ignoreOOC]);

    return finalText;
};

/**
 * Add pet sounds to the input speech while not garbling anything
 * @param msg Speech to change
 * @param next next of SpeechTransformGagGarble sdk hook
 * @param allowedPetPhrases Pet sounds to add
 * @returns
 */
export function NonDisruptivePetSpeech(msg: string, next: (args: [msg: string]) => string | boolean, allowedPetPhrases: string[]): string | boolean
{
    // No phrases we can use, skip
    if (allowedPetPhrases.length === 0)
    {
        return next([msg]);
    }

    // Use bucket system so words appear less random
    // Bucket is 2x allowed pet phrases before refilling
    let petPhraseBucket: string[] = [];
    function GetPetPhrase(): string
    {
        if (petPhraseBucket.length === 0)
        {
            petPhraseBucket = allowedPetPhrases.concat(allowedPetPhrases);
            petPhraseBucket = ShuffleArray(petPhraseBucket);
        }
        return petPhraseBucket.pop() ?? "";
    }

    // Loop through all the ooc ranges to split text into ooc and non ooc chunks
    // Skip adding pet sounds to ooc segments
    let nextIndex = 0;
    let segments: { text: string; ooc: boolean }[] = [];
    const oocRanges = SpeechGetOOCRanges(msg);
    for (const range of oocRanges)
    {
        if (msg.substring(nextIndex, range.start) !== "")
        {
            segments.push({ text: msg.substring(nextIndex, range.start), ooc: false });
        }
        segments.push({ text: msg.substring(range.start, range.start + range.length), ooc: true });
        nextIndex = range.start + range.length;
    }
    // Add last segment from end of range to end of text
    const lastBit = msg.substring(nextIndex);
    if (lastBit !== "")
    {
        segments.push({ text: lastBit, ooc: false });
    }
    // Move any whitespace on the right side of an element to the left side of the next element
    // Makes final formatting cleaner and easier
    segments = segments.map((obj, i) =>
    {
        const trailingWhitespace = /\s+$/.exec(obj.text);
        obj.text = obj.text.replace(/\s+$/, ""); // Remove trailing whitespace from current text
        if (trailingWhitespace && segments[i + 1])
        {
            segments[i + 1].text = trailingWhitespace[0] + segments[i + 1].text; // Prepend whitespace to next text
        }
        return obj;
    });

    // For each non ooc segment petify speak it
    let spokePet = false;
    let newMsg = "";
    for (const segment of segments)
    {
        if (segment.ooc)
        {
            newMsg += segment.text;
            continue;
        }

        const splitPhrase = segment.text.match(/(\s*\S+)/g) || [];
        let previousWord: string | null = null;
        splitPhrase.forEach((word) =>
        {
            // Random chance for a pet sound to appear before the current word
            if (Math.random() < INVOLUNTARY_PET_SPEAK_PERCENTAGE)
            {
                spokePet = true;
                const petSound = GetPetPhrase();

                const noPrev = previousWord === null;
                if (noPrev || /[.!?]$/.test(previousWord ?? ""))
                {
                    newMsg += `${noPrev ? "" : " "}${petSound.charAt(0).toLocaleUpperCase()}${petSound.slice(1)}`
                    + `${/[.!?]$/.test(word) || noPrev ? `.${noPrev ? " " : ""}` : ", "}`;
                }
                else
                {
                    newMsg += `${Math.random() < INVOLUNTARY_RUSHED_SPEAK_PERCENTAGE && !(previousWord ?? "").endsWith(",") ? "," : ""} ${petSound},`;
                }
            }
            newMsg += word;
            previousWord = word;
        });

        // If no pet words have been spoken so far, end with one or a chance for it to end with one anyway
        if (
            segments.slice().reverse().find((item) => !item.ooc)?.text === segment.text // Last non ooc segment
            && (!spokePet || Math.random() < INVOLUNTARY_END_PET_SPEAK_PERCENTAGE)
        )
        {
            newMsg = AppendPetSpeech(newMsg, [GetPetPhrase()]);
        }
    }

    return next([newMsg]);
}

/**
 * Replace each word in the text with a pet sound based on the strength
 * @param msg - Text to process
 * @param allowedPetPhrases - Pet sounds to use
 * @param strength - 0 to 1 inclusive
 * @returns A new copy of the processed text
 */
export function DisruptivePetSpeech(msg: string, allowedPetPhrases: string[], strength: number): string
{
    // No phrases we can use, skip
    if (allowedPetPhrases.length === 0)
    {
        return msg;
    }

    // Strength should be between 0 and 1
    strength = (strength > 1) ? 1 : (strength < 0) ? 0 : strength;

    // Use bucket system so words appear less random
    // Bucket is 2x allowed pet phrases before refilling
    let petPhraseBucket: string[] = [];
    function GetPetPhrase(): string
    {
        if (petPhraseBucket.length === 0)
        {
            petPhraseBucket = allowedPetPhrases.concat(allowedPetPhrases);
            petPhraseBucket = ShuffleArray(petPhraseBucket);
        }
        return petPhraseBucket.pop() ?? "";
    }

    // Loop through all the ooc ranges to split text into ooc and non ooc chunks
    // Skip adding pet sounds to ooc segments
    let nextIndex = 0;
    const segments: { text: string; ooc: boolean }[] = [];
    const oocRanges = SpeechGetOOCRanges(msg);
    for (const range of oocRanges)
    {
        if (msg.substring(nextIndex, range.start) !== "")
        {
            segments.push({ text: msg.substring(nextIndex, range.start), ooc: false });
        }
        segments.push({ text: msg.substring(range.start, range.start + range.length), ooc: true });
        nextIndex = range.start + range.length;
    }
    // Add last segment from end of range to end of text
    const lastBit = msg.substring(nextIndex);
    if (lastBit !== "")
    {
        segments.push({ text: lastBit, ooc: false });
    }

    // For each non ooc segment petify speak it
    let newMsg = "";
    for (const segment of segments)
    {
        if (segment.ooc)
        {
            newMsg += segment.text;
            continue;
        }

        newMsg += segment.text.replace(/\b\w+\b/g, (match) =>
        {
            if (Math.random() > strength)
            {
                return match;
            }
            const petPhrase = GetPetPhrase();
            if (/^[A-Z]+$/.test(match) && match.length > 1)
            {
                return petPhrase.toLocaleUpperCase();
            }
            if (/^[A-Z].*$/.test(match))
            {
                return petPhrase.substring(0, 1).toLocaleUpperCase() + petPhrase.substring(1);
            }
            return petPhrase;
        });
    }

    return newMsg;
}
