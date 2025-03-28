import packageInfo from "../../package.json";

export const MPA_NAME = packageInfo.name.toLocaleUpperCase();
export const MPA_VERSION = packageInfo.version;
export const MPA_REPO = packageInfo.repository.url;

export const ICONS = Object.freeze({
    PAW: "data:image/png;base64,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",
    DISCORD: "data:image/png;base64,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"
});

export const ACTIVITY_NAME_PREFIX = "MPA_";
export const BELL_SOUND = new Audio("Audio\\BellMedium.mp3");

export const BED_PERFECT = ["PetBed", "Crib"];
export const BED_NORMAL = ["LowCage", "Kennel", "Bed", "MedicalBed", "Cushion"];
export const BED_BAD = ["FuturisticCrate", "DollBox"];
export const ALL_BEDS = BED_PERFECT.concat(BED_NORMAL, BED_BAD);

export const ORGASM_ACTIVITY_REGEX = /Orgasm[0-9]/;
