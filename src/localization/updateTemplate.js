/* eslint-disable */
const fs = require("fs"); 
const path = require("path");
/* eslint-enable */

// Get all language files and the template paths
const templatePath = path.join(__dirname, "template.json");
const langPaths = fs.readdirSync(__dirname)
    .filter(file => file.endsWith(".json") && file !== "template.json")
    .map(file => path.join(__dirname, file));

const template = JSON.parse(fs.readFileSync(templatePath, "utf-8"));

for (const langPath of langPaths)
{
    const langOutput = fs.readFileSync(langPath, "utf-8");
    const langData = JSON.parse(langOutput ? langOutput : "{}");
    const langKeys = Object.keys(langData);

    // Add all keys in the template to the lang files if don't have it
    for (const key of Object.keys(template))
    {
        if (!langKeys.includes(key))
        {
            langData[key] = template[key] ?? "";
        }
    }

    // Put all the blank text / unlocalized text at the bottom instead of having it spread about
    for (const [key, value] of Object.entries(langData))
    {
        if (value === "")
        {
            delete langData[key];
            langData[key] = "";
        }
    }

    // Write out the file
    fs.writeFileSync(
        langPath,
        JSON.stringify(langData, null, 4) + "\n", // pretty print with 2-space indent
        "utf-8"
    );
}

console.log(`Localization files up to date with template:\n${langPaths.map((path) =>
{
    const pathSplit = path.split("\\");
    return pathSplit[pathSplit.length - 1];
}).join("\n")}`);
