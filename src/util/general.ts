/**
 * Get a random element from an array of objects
 */
export function RandomElement<T>(array: T[]): T | null
{
    if (array.length == 0) { return null; }
    return array[Math.floor(Math.random() * array.length)];
}

/**
 * Make a new array that is a copy of the orginal minus any matching elements in the filter
 */
export function FilterArrayFromArray<T>(array: T[], filterArray: T[]): T[]
{
    let newArray = structuredClone(array);
    filterArray.forEach((ele) =>
    {
        newArray = newArray.filter((badEle) => ele !== badEle);
    });
    return newArray;
}

/**
 * Shuffle an array in place, thanks to Chat GPT
 */
export function ShuffleArray<T>(array: T[]): T[]
{
    for (let i = array.length - 1; i > 0; i--)
    {
        const j = Math.floor(Math.random() * (i + 1)); // random index from 0 to i
        [array[i], array[j]] = [array[j], array[i]]; // swap elements
    }
    return array;
}
