/**
 * nameGenerator.js - Complex Syllable-based Name Generator for Mordheim
 */

const NameGenerator = (() => {
    const data = {
        human: {
            titles: ["Captain", "Ser", "Brother", "Hans", "Dieter", "Kurt"],
            prefixes: ["Karl", "Franz", "Gunt", "Wolf", "Gott", "Hell", "Sig", "Eber", "Al", "Bern"],
            mid: ["er", "en", "i", "o", "u", "ar", "or"],
            suffixes: ["hard", "rich", "berg", "hoff", "mann", "stein", "dorf", "mar", "mund", "wig"],
            lastPrefixes: ["von ", "van ", "de "],
            chanceOfTitle: 0.2,
            chanceOfLastPrefix: 0.3
        },
        dwarf: {
            titles: ["Thane", "Grim", "Iron", "Stone"],
            prefixes: ["Thor", "Grung", "Bar", "Mor", "Dur", "Khar", "Grom", "Brak", "Dran", "Hrod"],
            mid: ["in", "im", "un", "an", "on", "i", "u"],
            suffixes: ["gar", "grim", "sson", "bur", "zek", "nik", "drin", "stok", "bold", "morn"],
            chanceOfTitle: 0.3
        },
        elf: {
            prefixes: ["Aer", "Thin", "Gal", "Luth", "Fin", "Ela", "Ith", "Cala", "Mela", "Hala"],
            mid: ["ia", "iel", "io", "ae", "ua", "li"],
            suffixes: ["el", "an", "on", "dil", "dor", "rien", "lith", "val", "mir", "thin"],
            chanceOfTitle: 0.1
        },
        dark_elf: {
            prefixes: ["Mal", "Khael", "Mor", "Drak", "Vha", "Khar", "Ur", "Xen", "Zar", "Nith"],
            mid: ["ith", "oss", "on", "u", "ae", "ix"],
            suffixes: ["ar", "or", "ish", "on", "eth", "akh", "is", "us", "ur", "an"],
            chanceOfTitle: 0.15
        },
        undead_noble: {
            titles: ["Count", "Baron", "Lord", "Master"],
            prefixes: ["Vlad", "Man", "Jer", "Kon", "Dra", "Vark", "Guv", "Nik"],
            mid: ["fred", "ek", "rad", "cula", "os", "as"],
            suffixes: [" von Carstein", " von Draken", " von Sangis", " von Diehl", " the Eternal", " the Merciless"],
            chanceOfTitle: 1.0 // Always title for nobles
        },
        undead_dreg: {
            prefixes: ["Grub", "Rat", "Worm", "Filth", "Bone", "Slim", "Gully", "Mud", "Rot"],
            mid: ["ty", "y", "i", "o"],
            suffixes: ["face", "tooth", "breath", "eye", "nose", "gnawer", "kin", "ling", "shanks"],
            chanceOfTitle: 0
        },
        orc: {
            prefixes: ["Grub", "Gorg", "Morg", "Url", "Thrag", "Uzg", "Brak", "Grog"],
            mid: ["a", "u", "o", "i"],
            suffixes: ["bash", "mash", "gull", "dakka", "skull", "gut", "fist", "gob"],
            chanceOfTitle: 0.1
        },
        monster: {
            prefixes: ["Grawl", "Snarl", "Rend", "Gnash", "Blight", "Plague", "Gore"],
            mid: ["o", "a", "u"],
            suffixes: ["maw", "claw", "wing", "tail", "beast", "fiend", "spawn"],
            chanceOfTitle: 0
        }
    };

    function getRandom(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    function constructName(set, syllables = 2) {
        let name = getRandom(set.prefixes);
        if (syllables > 1) {
            for (let i = 0; i < syllables - 1; i++) {
                if (i === syllables - 2) {
                    name += getRandom(set.suffixes);
                } else {
                    name += getRandom(set.mid);
                }
            }
        }
        return name;
    }

    function generate(fighter) {
        let race = (fighter.race || "").toLowerCase();
        let type = (fighter.type || "").toLowerCase();
        let nameTemplate = (fighter.name || fighter.type || "").toLowerCase(); 

        let set = data.human; // Default
        let syllables = 2;

        // Context Mapping
        if (race.includes("krasnolud") || race.includes("dwarf")) set = data.dwarf;
        else if (race.includes("mroczny elf") || race.includes("dark elf")) set = data.dark_elf;
        else if (race.includes("elf")) set = data.elf;
        else if (race.includes("nieumarły") || race.includes("undead")) {
            if (type.includes("lider") || type.includes("leader") || nameTemplate.includes("wampir") || nameTemplate.includes("vampire")) {
                set = data.undead_noble;
            } else {
                set = data.undead_dreg;
            }
        }
        else if (race.includes("ork") || race.includes("orc")) set = data.orc;
        else if (race.includes("zwierzę") || race.includes("beast") || race.includes("potwór") || race.includes("monster")) set = data.monster;
        
        // Special types
        if (nameTemplate.includes("siostra") || nameTemplate.includes("sister")) {
           const titles = ["Sister", "Mother", "Abbess", "Novice", "Matriarch"];
           const firstNames = ["Bertha", "Elena", "Sigrun", "Dorothea", "Hilda", "Lucretia", "Johanna", "Frida"];
           return getRandom(titles) + " " + getRandom(firstNames);
        }

        if (nameTemplate.includes("ogr") || race.includes("ogr")) syllables = 2;

        // Final Construction
        let finalName = "";
        
        if (set === data.undead_noble) {
            finalName = getRandom(set.titles) + " " + constructName(set, 2) + getRandom(set.suffixes);
        } else {
            if (set.titles && Math.random() < (set.chanceOfTitle || 0)) {
                finalName += getRandom(set.titles) + " ";
            }

            let mainName = constructName(set, Math.random() > 0.7 ? 3 : 2);
            
            if (set === data.human && Math.random() < (set.chanceOfLastPrefix || 0)) {
                let lastName = constructName(set, 2);
                finalName += mainName + " " + getRandom(set.lastPrefixes) + lastName;
            } else if (set === data.human && Math.random() > 0.5) {
                finalName += mainName + " " + constructName(set, 2);
            } else {
                finalName += mainName;
            }
        }

        return finalName.trim();
    }

    return { generate };
})();

// Export for use in app.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NameGenerator;
} else {
    window.NameGenerator = NameGenerator;
}
