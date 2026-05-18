/**
 * Mordheim Warband Builder - Validation System
 *
 * Core engine for executing validation rules and applying automated fixes.
 * Uses the UMD pattern for compatibility across browser and Node.js testing.
 */
(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
    } else {
        root.ValidationSystem = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // Helper: Find item category in master registry or infer from common terms
    function getItemCategory(itemName, masterEquipment) {
        const item = (masterEquipment || []).find(e => e.name.toLowerCase() === itemName.toLowerCase());
        if (item && item.originCategory) {
            return item.originCategory;
        }
        
        // Inference fallback
        const name = itemName.toLowerCase();
        if (name.includes('armour') || name.includes('armor') || name.includes('shield') || name.includes('buckler') || name.includes('helmet') || name.includes('wolfcloak')) {
            return 'armor';
        }
        if (name.includes('bow') || name.includes('pistol') || name.includes('handgun') || name.includes('blunderbuss') || name.includes('rifle') || name.includes('crossbow')) {
            return 'ranged_weapons'; // or missile
        }
        return 'melee_weapons';
    }

    // Database of validation rules
    const ValidationRules = {
        // --- Warband-level validations ---
        'exactlyOne': {
            description: (param) => `Warband must contain exactly one leader of type: "${param}".`,
            fixLabel: function (warband, param) {
                const count = (warband.fighters || []).filter(f => 
                    (f.typeId && f.typeId.toLowerCase() === param.toLowerCase()) || 
                    (f.templateName && f.templateName.toLowerCase() === param.toLowerCase()) ||
                    (f.type && f.type.toLowerCase() === param.toLowerCase())
                ).length;
                return count === 0 ? `Add ${param}` : 'Delete duplicate card';
            },
            check: function (warband, param) {
                const count = (warband.fighters || []).filter(f => 
                    (f.typeId && f.typeId.toLowerCase() === param.toLowerCase()) || 
                    (f.templateName && f.templateName.toLowerCase() === param.toLowerCase()) ||
                    (f.type && f.type.toLowerCase() === param.toLowerCase())
                ).length;
                return count === 1;
            },
            fix: function (warband, param, masterData) {
                const count = (warband.fighters || []).filter(f => 
                    (f.typeId && f.typeId.toLowerCase() === param.toLowerCase()) || 
                    (f.templateName && f.templateName.toLowerCase() === param.toLowerCase()) ||
                    (f.type && f.type.toLowerCase() === param.toLowerCase())
                ).length;

                if (count === 0) {
                    // Try to find the template in masterData
                    const template = (masterData.fighters || []).find(f => 
                        (f.id && f.id.toLowerCase() === param.toLowerCase()) || 
                        (f.name && f.name.toLowerCase() === param.toLowerCase())
                    );
                    
                    if (template) {
                        // Create and add the leader
                        const newFighter = {
                            typeId: template.id || template.name,
                            type: template.name,
                            customName: typeof NameGenerator !== 'undefined' ? NameGenerator.generate(template) : `New ${template.name}`,
                            baseCost: template.cost,
                            race: template.race || "Human",
                            exp: template.exp_start || 0,
                            exp_start: template.exp_start || 0,
                            is_large: template.is_large || false,
                            spell_list: template.spell_list || null,
                            stats: { ...(template.stats || {}) },
                            equipment: [],
                            skills: (template.rules || []).map(r => ({ name: r })),
                            requirements: template.requirements || null,
                            validations: template.validations || null
                        };
                        if (template.spell_list) {
                            newFighter.skills.push({ name: template.spell_list });
                        }
                        
                        // Free Dagger rule
                        const noDaggerRaces = ["Zwierzę", "Ogr", "Animal", "Ogre", "Zwierzę jaskiniowe", "Undead Animal"];
                        if (!noDaggerRaces.includes(newFighter.race)) {
                            newFighter.equipment.push({ name: "Dagger", cost: 0 });
                        }

                        warband.fighters.unshift(newFighter); // Place Leader at top
                        return true;
                    }
                } else if (count > 1) {
                    // Remove duplicate leaders, leaving only the first one
                    let kept = false;
                    warband.fighters = warband.fighters.filter(f => {
                        const isLeader = (f.typeId && f.typeId.toLowerCase() === param.toLowerCase()) || 
                                         (f.templateName && f.templateName.toLowerCase() === param.toLowerCase()) ||
                                         (f.type && f.type.toLowerCase() === param.toLowerCase());
                        if (isLeader) {
                            if (!kept) {
                                kept = true;
                                return true;
                            }
                            return false;
                        }
                        return true;
                    });
                    return true;
                }
                return false;
            }
        },

        // --- Fighter-level validations ---
        'onePerWarband': {
            description: (fighter) => `Only one "${fighter.type}" is allowed in the warband.`,
            fixLabel: 'Delete duplicate card',
            check: function (warband, fighter) {
                const count = warband.fighters.filter(f => 
                    f.typeId === fighter.typeId || 
                    (f.templateName && f.templateName === fighter.templateName)
                ).length;
                return count <= 1;
            },
            fix: function (warband, fighter) {
                let kept = false;
                warband.fighters = warband.fighters.filter(f => {
                    const isMatch = f.typeId === fighter.typeId || (f.templateName && f.templateName === fighter.templateName);
                    if (isMatch) {
                        if (f === fighter) {
                            kept = true;
                            return true;
                        }
                        return kept; // Delete duplicates
                    }
                    return true;
                });
                return true;
            }
        },

        'noEquipment': {
            description: (fighter) => `"${fighter.customName || fighter.type}" cannot carry any equipment.`,
            fixLabel: 'Remove all equipment',
            check: function (warband, fighter) {
                return (fighter.equipment || []).length === 0;
            },
            fix: function (warband, fighter) {
                fighter.equipment = [];
                return true;
            }
        },

        'noExperience': {
            description: (fighter) => `"${fighter.customName || fighter.type}" cannot gain experience.`,
            fixLabel: 'Reset experience to 0',
            check: function (warband, fighter) {
                return (fighter.exp || 0) === 0;
            },
            fix: function (warband, fighter) {
                fighter.exp = 0;
                return true;
            }
        },

        'noArmor': {
            description: (fighter) => `"${fighter.customName || fighter.type}" cannot wear any armor.`,
            fixLabel: 'Remove equipped armor',
            check: function (warband, fighter, masterData) {
                const hasArmor = (fighter.equipment || []).some(item => {
                    const cat = getItemCategory(item.name, masterData.equipment);
                    return cat === 'armor';
                });
                return !hasArmor;
            },
            fix: function (warband, fighter, masterData) {
                fighter.equipment = (fighter.equipment || []).filter(item => {
                    const cat = getItemCategory(item.name, masterData.equipment);
                    return cat !== 'armor';
                });
                return true;
            }
        },

        'noMissile': {
            description: (fighter) => `"${fighter.customName || fighter.type}" cannot use missile/ranged weapons.`,
            fixLabel: 'Remove ranged weapons',
            check: function (warband, fighter, masterData) {
                const hasRanged = (fighter.equipment || []).some(item => {
                    const cat = getItemCategory(item.name, masterData.equipment);
                    return cat === 'ranged_weapons' || cat === 'missile';
                });
                return !hasRanged;
            },
            fix: function (warband, fighter, masterData) {
                fighter.equipment = (fighter.equipment || []).filter(item => {
                    const cat = getItemCategory(item.name, masterData.equipment);
                    return cat !== 'ranged_weapons' && cat !== 'missile';
                });
                return true;
            }
        },

        'noRanged': {
            description: (fighter) => `"${fighter.customName || fighter.type}" cannot use ranged weapons.`,
            fixLabel: 'Remove ranged weapons',
            check: function (warband, fighter, masterData) {
                return ValidationRules['noMissile'].check(warband, fighter, masterData);
            },
            fix: function (warband, fighter, masterData) {
                return ValidationRules['noMissile'].fix(warband, fighter, masterData);
            }
        },

        'noHeavyArmor': {
            description: (fighter) => `"${fighter.customName || fighter.type}" cannot wear heavy armor.`,
            fixLabel: 'Remove heavy armor',
            check: function (warband, fighter) {
                const hasHeavy = (fighter.equipment || []).some(item => 
                    item.name.toLowerCase().includes('heavy armour') || 
                    item.name.toLowerCase().includes('heavy armor')
                );
                return !hasHeavy;
            },
            fix: function (warband, fighter) {
                fighter.equipment = (fighter.equipment || []).filter(item => 
                    !item.name.toLowerCase().includes('heavy armour') && 
                    !item.name.toLowerCase().includes('heavy armor')
                );
                return true;
            }
        },

        'neverLeader': {
            description: (fighter) => `"${fighter.customName || fighter.type}" can never be the warband leader.`,
            fixLabel: 'Remove Leader status',
            check: function (warband, fighter) {
                const isLeader = fighter.type === 'Leader' || (fighter.skills || []).some(s => s.name === 'Leader');
                return !isLeader;
            },
            fix: function (warband, fighter) {
                fighter.type = 'Henchman';
                fighter.skills = (fighter.skills || []).filter(s => s.name !== 'Leader');
                return true;
            }
        },

        'neverHero': {
            description: (fighter) => `"${fighter.customName || fighter.type}" can never become a Hero.`,
            fixLabel: 'Demote to Henchman',
            check: function (warband, fighter) {
                return fighter.type !== 'Hero';
            },
            fix: function (warband, fighter) {
                fighter.type = 'Henchman';
                return true;
            }
        },

        // --- Equipment-level validation ---
        'twoHanded': {
            description: (fighter, item) => `"${fighter.customName || fighter.type}" is using a two-handed weapon ("${item.name}") and cannot equip shields, bucklers, or other weapons.`,
            fixLabel: 'Remove conflicting items',
            check: function (warband, fighter, masterData, item) {
                // If this is the only weapon/shield, it's valid
                const weaponsAndShields = (fighter.equipment || []).filter(e => {
                    const cat = getItemCategory(e.name, masterData.equipment);
                    return cat === 'melee_weapons' || cat === 'ranged_weapons' || cat === 'armor' && (e.name.toLowerCase().includes('shield') || e.name.toLowerCase().includes('buckler'));
                });
                return weaponsAndShields.length <= 1;
            },
            fix: function (warband, fighter, masterData, item) {
                // Keep ONLY the two-handed weapon itself
                fighter.equipment = (fighter.equipment || []).filter(e => {
                    const isTwoHanded = e.name === item.name;
                    const cat = getItemCategory(e.name, masterData.equipment);
                    // Filter out other weapons or shields/bucklers
                    const isConflicting = cat === 'melee_weapons' || cat === 'ranged_weapons' || (cat === 'armor' && (e.name.toLowerCase().includes('shield') || e.name.toLowerCase().includes('buckler')));
                    return isTwoHanded || !isConflicting;
                });
                return true;
            }
        },

        // --- Skill-level validation ---
        'heroOnly': {
            description: (fighter, skill) => `Skill "${skill.name}" is only available to Heroes.`,
            fixLabel: 'Remove this skill',
            check: function (warband, fighter) {
                const isHero = fighter.type === 'Hero' || fighter.type === 'Leader' || fighter.type === 'Wizard';
                return isHero;
            },
            fix: function (warband, fighter, masterData, skill) {
                fighter.skills = (fighter.skills || []).filter(s => s.name !== skill.name);
                return true;
            }
        }
    };

    /**
     * Validate a warband and return an array of validation errors.
     * @param {Object} warband - Current active warband
     * @param {Object} masterData - Loaded master records (fighters, equipment, spells, skills)
     * @returns {Array} List of validation error objects
     */
    function validateWarband(warband, masterData) {
        const errors = [];
        if (!warband || !masterData) return errors;

        // 1. Run warband-level validations configured in activeWarbandTypeData
        const activeData = masterData.activeWarbandTypeData;
        const warbandValidations = activeData ? (activeData.validations || []) : [];
        
        warbandValidations.forEach((val, idx) => {
            const valType = typeof val === 'string' ? val : val.type;
            const param = typeof val === 'object' ? val.fighter : null;
            const rule = ValidationRules[valType];

            if (rule) {
                const isValid = rule.check(warband, param, masterData);
                if (!isValid) {
                    errors.push({
                        id: `wb-val-${valType}-${idx}`,
                        message: rule.description(param),
                        level: 'warband',
                        key: valType,
                        param: param,
                        hasFix: typeof rule.fix === 'function',
                        fixLabel: typeof rule.fixLabel === 'function' ? rule.fixLabel(warband, param) : (typeof rule.fixLabel === 'string' ? rule.fixLabel : 'Fix'),
                        fix: function () {
                            const changed = rule.fix(warband, param, masterData);
                            if (changed && typeof renderWarband === 'function') {
                                renderWarband();
                                saveToCache();
                            }
                        }
                    });
                }
            }
        });

        // 2. Built-in warband capacity limits (Max/Min Warriors)
        if (activeData) {
            const currentSize = (warband.fighters || []).length;
            
            if (activeData.max_warriors && currentSize > activeData.max_warriors) {
                errors.push({
                    id: `wb-limit-max`,
                    message: `Warband has too many warriors (current: ${currentSize}, max allowed: ${activeData.max_warriors}).`,
                    level: 'warband',
                    key: 'maxWarriors',
                    hasFix: false
                });
            }
            if (activeData.min_warriors && currentSize > 0 && currentSize < activeData.min_warriors) {
                errors.push({
                    id: `wb-limit-min`,
                    message: `Warband has too few warriors (current: ${currentSize}, min required: ${activeData.min_warriors}).`,
                    level: 'warband',
                    key: 'minWarriors',
                    hasFix: false
                });
            }
        }

        // 3. Iterate through fighters and run fighter-level, equipment-level, and skill-level validations
        (warband.fighters || []).forEach((fighter, fIdx) => {
            // (a) Fighter-level validations (copied from base template rules)
            const fighterVals = fighter.validations || [];
            fighterVals.forEach((valKey, valIdx) => {
                const rule = ValidationRules[valKey];
                if (rule) {
                    const isValid = rule.check(warband, fighter, masterData);
                    if (!isValid) {
                        errors.push({
                            id: `fighter-val-${fIdx}-${valKey}-${valIdx}`,
                            message: rule.description(fighter),
                            level: 'fighter',
                            fighterIndex: fIdx,
                            key: valKey,
                            hasFix: typeof rule.fix === 'function',
                            fixLabel: typeof rule.fixLabel === 'function' ? rule.fixLabel(warband, fighter) : (typeof rule.fixLabel === 'string' ? rule.fixLabel : 'Fix'),
                            fix: function () {
                                const changed = rule.fix(warband, fighter, masterData);
                                if (changed && typeof renderWarband === 'function') {
                                    renderWarband();
                                    saveToCache();
                                }
                            }
                        });
                    }
                }
            });

            // (b) Requirements-level validation (hardcoded wizards/elves logic in builders)
            const eqTags = (fighter.equipment || []).flatMap(e => {
                const found = (masterData.equipment || []).find(m => m.name.toLowerCase() === e.name.toLowerCase());
                return found ? (found.tags || []) : [];
            });
            
            if (fighter.requirements) {
                if (fighter.requirements.noArmorIfWizard && eqTags.includes('armor')) {
                    errors.push({
                        id: `fighter-req-${fIdx}-noArmorIfWizard`,
                        message: `"${fighter.customName || fighter.type}" is a Wizard and cannot wear armor.`,
                        level: 'fighter',
                        fighterIndex: fIdx,
                        key: 'noArmorIfWizard',
                        hasFix: true,
                        fixLabel: 'Remove equipped armor',
                        fix: function () {
                            // Strip armor
                            fighter.equipment = fighter.equipment.filter(e => {
                                const found = masterData.equipment.find(m => m.name.toLowerCase() === e.name.toLowerCase());
                                return !(found && (found.tags || []).includes('armor'));
                            });
                            if (typeof renderWarband === 'function') {
                                renderWarband();
                                saveToCache();
                            }
                        }
                    });
                }
                if (fighter.requirements.noBlackPowder && eqTags.includes('black-powder')) {
                    errors.push({
                        id: `fighter-req-${fIdx}-noBlackPowder`,
                        message: `Elves like "${fighter.customName || fighter.type}" cannot use black-powder weapons.`,
                        level: 'fighter',
                        fighterIndex: fIdx,
                        key: 'noBlackPowder',
                        hasFix: true,
                        fixLabel: 'Remove black-powder',
                        fix: function () {
                            // Strip black powder
                            fighter.equipment = fighter.equipment.filter(e => {
                                const found = masterData.equipment.find(m => m.name.toLowerCase() === e.name.toLowerCase());
                                return !(found && (found.tags || []).includes('black-powder'));
                            });
                            if (typeof renderWarband === 'function') {
                                renderWarband();
                                saveToCache();
                            }
                        }
                    });
                }
            }

            // (c) Equipment validations: Check if items themselves have validation properties
            (fighter.equipment || []).forEach(e => {
                const regItem = (masterData.equipment || []).find(m => m.name.toLowerCase() === e.name.toLowerCase());
                if (regItem) {
                    const itemVals = regItem.validations || regItem.validation ? (regItem.validations || [regItem.validation]) : [];
                    itemVals.forEach((valKey, valIdx) => {
                        const rule = ValidationRules[valKey];
                        if (rule) {
                            const isValid = rule.check(warband, fighter, masterData, e);
                            if (!isValid) {
                                errors.push({
                                    id: `fighter-eq-val-${fIdx}-${e.name}-${valKey}-${valIdx}`,
                                    message: rule.description(fighter, e),
                                    level: 'fighter',
                                    fighterIndex: fIdx,
                                    key: valKey,
                                    item: e,
                                    hasFix: typeof rule.fix === 'function',
                                    fixLabel: typeof rule.fixLabel === 'function' ? rule.fixLabel(warband, fighter, masterData, e) : (typeof rule.fixLabel === 'string' ? rule.fixLabel : 'Fix'),
                                    fix: function () {
                                        const changed = rule.fix(warband, fighter, masterData, e);
                                        if (changed && typeof renderWarband === 'function') {
                                            renderWarband();
                                            saveToCache();
                                        }
                                    }
                                });
                            }
                        }
                    });
                }
            });

            // (d) Skill validations: Check if skills/rules themselves have validation properties
            (fighter.skills || []).forEach(s => {
                const regSkill = (masterData.skills || []).find(m => m.name.toLowerCase() === s.name.toLowerCase());
                if (regSkill) {
                    const skillVals = regSkill.validations || regSkill.validation ? (regSkill.validations || [regSkill.validation]) : [];
                    skillVals.forEach((valKey, valIdx) => {
                        const rule = ValidationRules[valKey];
                        if (rule) {
                            const isValid = rule.check(warband, fighter, masterData, s);
                            if (!isValid) {
                                errors.push({
                                    id: `fighter-sk-val-${fIdx}-${s.name}-${valKey}-${valIdx}`,
                                    message: rule.description(fighter, s),
                                    level: 'fighter',
                                    fighterIndex: fIdx,
                                    key: valKey,
                                    skill: s,
                                    hasFix: typeof rule.fix === 'function',
                                    fixLabel: typeof rule.fixLabel === 'function' ? rule.fixLabel(warband, fighter, masterData, s) : (typeof rule.fixLabel === 'string' ? rule.fixLabel : 'Fix'),
                                    fix: function () {
                                        const changed = rule.fix(warband, fighter, masterData, s);
                                        if (changed && typeof renderWarband === 'function') {
                                            renderWarband();
                                            saveToCache();
                                        }
                                    }
                                });
                            }
                        }
                    });
                }
            });
        });

        return errors;
    }

    return {
        ValidationRules,
        validateWarband
    };
}));
