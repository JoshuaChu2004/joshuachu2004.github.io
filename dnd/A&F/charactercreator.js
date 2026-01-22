// ============================================================================
// GLOBAL VARIABLES
// ============================================================================

let gameData = null;
let temporaryData = null;
let characterData = {
    hexId: null,
    characterInfo: {
        name: null,
        class: null,
        level: 0,
        race: null,
        background: null,
        alignment: null,
    },
    abilities: {
        strength: {
            modifier: -1,
        },
        dexterity: {
            modifier: -1,
        },
        constitution: {
            modifier: -1,
        },
        intelligence: {
            modifier: -1,
        },
        wisdom: {
            modifier: -1,
        },
        charisma: {
            modifier: -1,
        },
        features: [],
    },
    class: {
        name: null,
        level: 0,
        proficiencies: {
            skills: [],
        },
        features: [],
        prowesses: [],
        spells: {
            slots: {
                "0": {
                    max: -1,
                    current: -1,
                },
                "1": {
                    max: -1,
                    current: -1,
                },
                "2": {
                    max: -1,
                    current: -1,
                },
                "3": {
                    max: -1,
                    current: -1,
                },
                "4": {
                    max: -1,
                    current: -1,
                },
                "5": {
                    max: -1,
                    current: -1,
                },
                "6": {
                    max: -1,
                    current: -1,
                },
                "7": {
                    max: -1,
                    current: -1,
                },
                "8": {
                    max: -1,
                    current: -1,
                },
                "9": {
                    max: -1,
                    current: -1,
                }
            },
            cantrips: [],
            spells: [],
        },
        subclass: {
            name: null,
            features: [],
        },
    },
    race: {
        name: null,
        features: [],
    },
    vitals: {
        hitPoints: { current: -1, max: -1 },
        stressSlots: { current: 0, max: 3 },
        exhaustion: { current: 0, max: 3 },
    },
    background: {
        name: null,
        features: [],
    },
    coreTraits: {
        armorClass: 10,
        initiative: 0,
        absorb: {
            absorb: 0,
            total: 0,
        },
        heroicInspiration: {
            current: 0,
            max: 3,
        },
    },
    savingThrows: {
        fortitude: {
            startingBonus: 0,
        },
        reflex: {
            startingBonus: 0,
        },
        will: {
            startingBonus: 0,
        },
    },
    modifiers: [],  // Aggregated modifiers from all selected options
    // calculatedModifiers will be initialized after getDefaultCalculatedModifiers is defined
    calculatedModifiers: null,
    senses: {
        description: null,
    },
    movement: {
        walking: 30,
        flying: 0,
        swimming: 0,
        climbing: 0,
    },
    defenses: {
        resistances: [],
        immunities: [],
        vulnerabilities: [],
    },
    conditions: [],
    proficiencies: {
        armor: [],
        weapons: [],
        tools: [],
        languages: [],
        skills: [],
    },
    feats: [],
    inventory: {
        equipment: [],
        items: [],
        currency: {
            copper: 0,
            silver: 0,
            gold: 0,
            platinum: 0,
        },
    },
    notes: '',
};
let currentSection = null;
let equipmentSelections = {
    class: {},
    background: {},
}
let saveTimeout = null;

// ============================================================================
// DATA PERSISTENCE
// ============================================================================

// Debounced save function - waits 500ms after last change before saving
function debouncedSave() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        saveCharacter();
    }, 500); // Save 500ms after the last change
}

// Create a deep proxy that intercepts property changes at any nesting level
// This allows us to auto-save when ANY property is modified, even nested ones
function createDeepProxy(obj, onChange) {
    // Handle null/undefined
    if (obj === null || obj === undefined) {
        return obj;
    }
    
    // Only proxy objects and arrays (not primitives like strings, numbers, booleans)
    if (typeof obj !== 'object') {
        return obj;
    }
    
    return new Proxy(obj, {
        // Intercepts when a property is SET (e.g., characterData.vitals.hitPoints.current = 10)
        set(target, prop, value) {
            // If the new value is an object/array, make it a proxy too (recursive)
            if (value && typeof value === 'object') {
                value = createDeepProxy(value, onChange);
            }
            
            // Set the property on the original object
            target[prop] = value;
            
            // Trigger the onChange callback (which will debounce the save)
            onChange();
            
            return true; // Indicates the assignment succeeded
        },
        
        // Intercepts when a property is GET (e.g., const hp = characterData.vitals.hitPoints)
        get(target, prop) {
            const value = target[prop];
            
            // If accessing an object/array property, return a proxied version
            // This ensures nested property changes are also intercepted
            if (value && typeof value === 'object') {
                return createDeepProxy(value, onChange);
            }
            
            // Return primitive values as-is
            return value;
        },
        
        // Intercepts array methods like push, pop, splice, etc.
        getPrototypeOf(target) {
            return Object.getPrototypeOf(target);
        }
    });
}

function saveCharacter() {
    console.log('Saving character...');
    console.log('Character data:', characterData);

    const characterDataString = JSON.stringify(characterData);
    const hexId = characterData.hexId;
    localStorage.setItem(`characterData-${hexId}`, characterDataString);

    const characterHexIds = localStorage.getItem('characterHexIds');
    if (characterHexIds) {
        const characterHexIdsArray = JSON.parse(characterHexIds);
        if (!characterHexIdsArray.includes(hexId)) {
            characterHexIdsArray.push(hexId);
        }
        localStorage.setItem('characterHexIds', JSON.stringify(characterHexIdsArray));
    } else {
        localStorage.setItem('characterHexIds', JSON.stringify([hexId]));
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Sanitize a feature name for use in IDs and selectors
 * Converts to lowercase and replaces spaces with hyphens
 * @param {string} name - The feature name
 * @returns {string} Sanitized name safe for use in IDs
 */
function sanitizeFeatureName(name) {
    if (!name) return '';
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

/**
 * Convert a string to camelCase
 * @param {string} string - The string to convert
 * @returns {string} The string in camelCase format
 */
function toCamelCase(string) {
    if (!string) return '';
    
    return string
        .trim()
        .replace(/[^a-zA-Z0-9]+(.)/g, (match, char) => char.toUpperCase())
        .replace(/^[A-Z]/, char => char.toLowerCase());
}

/**
 * Get the gameData items key from an item type
 * Maps singular item types to plural gameData keys
 * @param {string} itemType - The item type (e.g., "weapon", "armor", "pack")
 * @returns {string} The corresponding gameData key (e.g., "weapons", "armor", "packs")
 */
function getItemTypeKey(itemType) {
    const typeMap = {
        'weapon': 'weapons',
        'armor': 'armor',
        'pack': 'packs',
        'wondrous': 'items',
        'item': 'items'
    };
    return typeMap[itemType] || itemType;
}

/**
 * Check if a feature has options (like Fighting Style with multiple options to choose from)
 * @param {object} feature - The feature definition
 * @returns {boolean} True if feature has options
 */
function featureHasOptions(feature) {
    return feature.options && Array.isArray(feature.options) && feature.options.length > 0;
}

/**
 * Check if a feature has choices (modifiers that require selection)
 * @param {object} feature - The feature definition
 * @returns {boolean} True if feature has choices
 */
function featureHasChoices(feature) {
    if (!feature.modifiers || !Array.isArray(feature.modifiers)) return false;
    return feature.modifiers.some(modifier => 
        modifier.subType === 'choose' || (modifier.from && Array.isArray(modifier.from))
    );
}

function featureHasSpellChoices(feature) {
    if (!feature.spells || !Array.isArray(feature.spells)) return false;
    return feature.spells.some(spell => spell.type === 'choose');
}

function featureHasProwessChoices(feature) {
    if (!feature.prowesses || !Array.isArray(feature.prowesses)) return false;
    return feature.prowesses.some(prowess => prowess.type === 'choose');
}

/**
 * Get all choice modifiers from a feature
 * @param {object} feature - The feature definition
 * @returns {Array} Array of modifiers that require choices
 */
function getChoiceModifiers(feature) {
    if (!feature.modifiers || !Array.isArray(feature.modifiers)) return [];
    const choiceModifiers = feature.modifiers.filter(modifier => modifier.subType === 'choose' || (modifier.from && Array.isArray(modifier.from)));

    /*choiceModifiers.forEach(modifier => {
        if (modifier.type === 'skillExpertise') {   
            debugger;
            const skills = characterData.proficiencies.skills;
            modifier.from = modifier.from.filter(skill => skills[skill].proficient && !skills[skill].expertise);
        }
    });*/

    return choiceModifiers;
}

function getSpellChoices(feature) {
    if (!feature.spells || !Array.isArray(feature.spells)) return [];
    return feature.spells.filter(spell => spell.type === 'choose');
}

function getProwessChoices(feature) {
    if (!feature.prowesses || !Array.isArray(feature.prowesses)) return [];
    return feature.prowesses.filter(prowess => prowess.type === 'choose');
}

function generateRandomHexCode() {
    // Generate a random number between 0 and 0xFFFFFF (16777215)
    let randomNum = Math.floor(Math.random() * 16777215);
  
    // Convert the number to a hexadecimal string (base 16)
    let hexCode = randomNum.toString(16);
  
    // Pad the string with leading zeros if necessary to ensure it's always 6 digits
    // This handles cases where the random number generates a shorter hex string (e.g., #abc)
    let fullHexCode = hexCode.padStart(6, '0');
  
    return fullHexCode;
  }

// ============================================================================
// INITIALIZATION & DATA LOADING
// ============================================================================

async function loadCharacterBuilderData(hexId=null) {
    console.log('Loading character builder...');
    try {
        gameData = await loadBuilderGameData();
        if (gameData) {
            console.log('Game data:', gameData);
        }
        
        // Initialize calculatedModifiers if not already set
        if (!characterData.calculatedModifiers) {
            characterData.calculatedModifiers = getDefaultCalculatedModifiers();
        }
        
        if (hexId) {
            const loadedData = JSON.parse(localStorage.getItem(`characterData-${hexId}`));
            if (loadedData) {
                Object.assign(characterData, loadedData);
                characterData = createDeepProxy(characterData, debouncedSave);
            }
        }
        else {
            characterData = createDeepProxy(characterData, debouncedSave);
            characterData.hexId = generateRandomHexCode();
            localStorage.setItem(`characterData-${characterData.hexId}`, JSON.stringify(characterData));
        }
        
        generateCharacterBuilder();
    }
    catch (error) {
        console.error('Error loading character builder:', error);
    }
}

function generateCharacterBuilder() {
    console.log('Generating character builder...');

    const characterNameInputEl = document.querySelector('#cc-character-name');
    if (characterNameInputEl) {
        characterNameInputEl.value = characterData.characterInfo.name || '';
        characterNameInputEl.onchange = (e) => {
            characterData.characterInfo.name = e.target.value;
        };
    }

    generateClasses();
    generateRaces();
    generateBackgrounds();
    generateAbilities();
    generateEquipment();
}

// ============================================================================
// CHARACTER SELECTION
// ============================================================================
// Class Selection & Management
// ============================================================================

function generateClasses() {
    console.log('Generating classes...');

    const classes = gameData.classes;
    const classListEl = document.querySelector('#cc-builder-tab-class .cc-builder-tab-content');

    classListEl.innerHTML = '';

    classes.forEach(classData => {
        const classEl = document.createElement('button');
        classEl.classList.add('cc-builder-tab-content-item', 'class');
        classEl.id = `cc-class-${classData.name.toLowerCase().replace(/ /g, '-')}`;
        classEl.dataset.classId = classData.name.toLowerCase().replace(/ /g, '-');
        classEl.onclick = () => {
            selectClass(classEl);
        };
        const classDescription = parseDescription(classData.description);
        classEl.innerHTML = `
            <div class="cc-builder-tab-content-item-title">${classData.name}</div>
            <div class="cc-builder-tab-content-item-description">${classDescription}</div>
        `;
        classListEl.appendChild(classEl);
    });
}

function selectClass(classEl) {
    const dialog = document.querySelector('.cc-confirm-dialog');
    const classData = gameData.classes.find(c => c.name.toLowerCase().replace(/ /g, '-') === classEl.dataset.classId);
    temporaryData = classData;
    if (!classData) {
        console.error('Class data not found');
        return;
    }
    dialog.querySelector('.cc-confirm-dialog-header').textContent = `Confirm Add Class`;
    dialog.querySelector('.cc-confirm-dialog-content-title').textContent = classEl.querySelector('.cc-builder-tab-content-item-title').textContent;
    const classDescription = parseDescription(classData.description);
    dialog.querySelector('.cc-confirm-dialog-content-description').innerHTML = classDescription;

    const dialogConfirmButtonEl = dialog.querySelector('.cc-confirm-dialog-button.confirm');
    dialogConfirmButtonEl.textContent = `Add Class`;
    dialogConfirmButtonEl.onclick = () => confirmClass();
    
    const dialogCancelButtonEl = dialog.querySelector('.cc-confirm-dialog-button.cancel');
    dialogCancelButtonEl.textContent = `Cancel`;
    dialogCancelButtonEl.onclick = () => cancelClass();

    const dialogItemsEl = dialog.querySelector('.cc-confirm-dialog-items');
    dialogItemsEl.innerHTML = '';

    classData.features.forEach(feature => {
        const dialogItemEl = document.createElement('div');
        dialogItemEl.classList.add('cc-confirm-dialog-item');
        const featureDescription = parseDescription(feature.description);
        dialogItemEl.innerHTML = `
            <div class="cc-confirm-dialog-item-title">${feature.name}</div>
            <div class="cc-confirm-dialog-item-description">${featureDescription}</div>
        `;
        dialogItemsEl.appendChild(dialogItemEl);
    });
    dialog.showModal();
}

function confirmClass() {
    const dialog = document.querySelector('.cc-confirm-dialog');

    const classData = temporaryData;
    characterData.characterInfo.class = classData.name;
    characterData.characterInfo.level = characterData.class.level + 1;
    characterData.class.name = classData.name;
    characterData.class.level = 1;

    const vitals = characterData.vitals;
    vitals.hitPoints.rolledHP = classData.hitPointsAtFirstLevel;
    vitals.hitPoints.hitDie = classData.hitDie;
    vitals.hitPoints.temporary = 0;
    vitals.hitPoints.fixed = classData.hitPointsFixed;
    vitals.stressSlots.max = classData.stressSlotsAtFirstLevel;

    initializeNewClassLevelFeatures(1);
    generateSpellSlots();

    // Initialize modifiers array
    characterData.modifiers = [];

    generateClass();

    dialog.close();
}

function cancelClass() {
    const dialog = document.querySelector('.cc-confirm-dialog');
    dialog.close();
}

function generateClass() {
    console.log('Generating class...');
    const classManagerEl = document.querySelector('#cc-builder-tab-class-manage');
    const classChooseEl = document.querySelector('#cc-builder-tab-class-choose');

    classManagerEl.classList.remove('hidden');
    classChooseEl.classList.add('hidden');

    const levelDisplayEl = classManagerEl.querySelector('#cc-character-level');
    levelDisplayEl.textContent = characterData.class.level || 1;

    const classNameEl = classManagerEl.querySelector('.cc-manager-header-title');
    classNameEl.textContent = characterData.class.name || '';

    const levelSelectEl = classManagerEl.querySelector('#cc-manager-header-levels-select');
    levelSelectEl.value = characterData.class.level || 1;
    levelSelectEl.onchange = (e) => handleClassLevelChange(e.target);
    
    // Generate class features
    updateClassVitals();
    generateFeatures('class');
    generateProwesses();
    generateSpells();
}

function updateClassVitals() {
    const classManagerEl = document.querySelector('#cc-builder-tab-class-manage');
    const classVitalsEl = classManagerEl.querySelector('#cc-class-vitals-hit-points-value');
    classVitalsEl.textContent = getMaxHitPoints() || 0;

    const classVitalsHitDieEl = classManagerEl.querySelector('#cc-class-vitals-hit-die-value');
    classVitalsHitDieEl.textContent = characterData.vitals.hitPoints.hitDie || 'd10';

    const classVitalsStressSlotsEl = classManagerEl.querySelector('#cc-class-vitals-stress-slots-value');
    classVitalsStressSlotsEl.textContent = getMaxStressSlots() || 3;
}

function getMaxHitPoints() {
    const vitals = characterData.vitals;
    let maxHP = vitals.hitPoints.rolledHP;
    maxHP += characterData.characterInfo.level * getAbilityModifier('constitution');
    return maxHP;
}

function getMaxStressSlots() {
    const vitals = characterData.vitals;
    let maxStressSlots = vitals.stressSlots.max;
    maxStressSlots += Math.max(0, getAbilityModifier('constitution'));
    return maxStressSlots;
}


// ============================================================================
// PROWESS & SPELL MANAGEMENT
// ============================================================================

function getCharacterProwessInfo(level, growthRate) {
    let maximumProwessLevel = 0;
    let maximumLearnedProwesses = 0;

    const classData = getGameFeatureData('class');
    const classLevel = characterData.class.level;
    if (classData.prowessInfo.canUseProwesses) {
        if (classData.prowessInfo.prowessGrowthRate === 'full') {
            maximumProwessLevel = Math.ceil(classLevel / 2);
            maximumLearnedProwesses = 2 + Math.floor((classLevel - 1) / 2);
        } else if (classData.prowessInfo.prowessGrowthRate === 'half') {
            maximumProwessLevel = Math.ceil(classLevel / 4);
            maximumLearnedProwesses = 2 + Math.floor((classLevel - 1) / 4);
        }
    }
    return {
        maximumProwessLevel: maximumProwessLevel,
        maximumLearnedProwesses: maximumLearnedProwesses,
    };
}

function getCharacterSpellInfo(level, growthRate) {
    let maximumSpellLevel = 0;
    let maximumLearnedSpells = 0;
    let maximumLearnedCantrips = 0;

    const classData = getGameFeatureData('class');
    const classLevel = characterData.class.level;
    if (classData.spellInfo.canCastSpells) {
        const highestAbilityModifier = getHighestAbilityModifier(classData.spellInfo.spellCastingAbility);     
        if (classData.spellInfo.spellGrowthRate === 'full') {
            maximumSpellLevel = Math.ceil(classLevel / 2);
            if (classData.spellInfo.casterType === 'prepared') {
                maximumLearnedSpells = highestAbilityModifier.modifier + classLevel;
            } else if (classData.spellInfo.casterType === 'learned') {
                maximumLearnedCantrips = 3 + classLevel;
            }
            if (classData.spellInfo.cantripGrowthRate === 'high') {
                maximumLearnedCantrips = 3 + (level >= 4 ? 1 : 0) + (level >= 10 ? 1 : 0);
            } else {
                maximumLearnedCantrips = 2 + (level >= 4 ? 1 : 0) + (level >= 10 ? 1 : 0);
            }
        } else if (classData.spellInfo.spellGrowthRate === 'half') {
            maximumSpellLevel = Math.ceil(classLevel / 4);
            if (classData.spellInfo.casterType === 'prepared') {
                maximumLearnedSpells = highestAbilityModifier.modifier + Math.floor(classLevel / 2);
            } else if (classData.spellInfo.casterType === 'learned') {
                maximumLearnedCantrips = 1 + Math.ceil(classLevel / 2);
            }
        }
    }
    return {
        maximumSpellLevel: maximumSpellLevel,
        maximumLearnedSpells: maximumLearnedSpells,
        maximumLearnedCantrips: maximumLearnedCantrips,
    };
}

function getLearnedCantripsCount() {
    const cantrips = characterData.class.spells.cantrips.filter(c => c.countsAsKnown);
    return cantrips.length;
}

function getLearnedSpellsCount() {
    const spells = characterData.class.spells.spells.filter(s => s.countsAsKnown);
    return spells.length;
}

function getHighestAbilityModifier(abilityNames) {
    let highestModifier = 0;
    let highestAbilityName = null;
    abilityNames.forEach(abilityName => {
        const modifier = getAbilityModifier(abilityName);
        if (modifier > highestModifier) {
            highestModifier = modifier;
            highestAbilityName = abilityName;
        }
    });
    return {
        modifier: highestModifier,
        abilityName: highestAbilityName,
    };
}

function getAbilityModifier(abilityName) {
    const ability = characterData.abilities?.[abilityName.toLowerCase()];
    if (!ability) return 0;
    let modifier = ability.modifier || 0;
    modifier += characterData.calculatedModifiers.abilityModifierIncrease[abilityName].bonus;
    return modifier;
}

/**
 * Generate a single prowess element
 * @param {string} prowessName - Name of the prowess
 * @param {number} prowessLevel - Level of the prowess
 * @param {HTMLElement} container - Container to append the prowess to
 * @returns {HTMLElement} The generated prowess element
 */
function generateProwessElement(prowessName, prowessLevel, container) {
    const prowessData = gameData.prowesses.find(p => p.name === prowessName);
    if (!prowessData) {
        console.error('Prowess data not found:', prowessName);
        return null;
    }
    
    const prowessEl = document.createElement('details');
    prowessEl.id = `cc-manager-prowess-${prowessName.toLowerCase().replace(/ /g, '')}`;
    prowessEl.dataset.prowessName = prowessName;
    prowessEl.classList.add('cc-manager-feature');

    const levelSuffix = prowessLevel === 1 ? 'st' : prowessLevel === 2 ? 'nd' : prowessLevel === 3 ? 'rd' : 'th';

    const prowessSummaryEl = document.createElement('summary');
    prowessSummaryEl.classList.add('cc-manager-feature-summary');
    prowessSummaryEl.innerHTML = `
        <div class="cc-manager-feature-summary-info">
            <div class="cc-manager-feature-summary-title header">${prowessData.name}</div>
            <div class="cc-manager-feature-summary-meta">
                <div class="cc-manager-feature-summary-meta-item">${prowessLevel}${levelSuffix} Level</div>
            </div>
        </div>`;

    const prowessTakeButtonEl = document.createElement('button');
    prowessTakeButtonEl.classList.add('cc-manager-feature-take-button');
    
    // Set initial button state based on whether prowess is already learned
    const isLearned = characterData.class.prowesses.includes(prowessName);
    if (isLearned) {
        prowessTakeButtonEl.textContent = 'Unlearn';
        prowessTakeButtonEl.classList.add('unlearn');
        prowessTakeButtonEl.onclick = () => unlearnProwess(prowessName);
    } else {
        prowessTakeButtonEl.textContent = 'Learn';
        prowessTakeButtonEl.onclick = () => takeProwess(prowessName);
    }

    const prowessContentEl = document.createElement('div');
    prowessContentEl.classList.add('cc-manager-feature-content');
    prowessContentEl.innerHTML = `
        <div class="cc-manager-feature-properties">
            <div class="cc-manager-feature-property"><span class="bold">Use Time:</span> <span id="cc-manager-feature-property-type">${prowessData.useTime}</span></div>
            <div class="cc-manager-feature-property"><span class="bold">Range:</span> <span id="cc-manager-feature-property-type">${prowessData.range}</span></div>
            <div class="cc-manager-feature-property"><span class="bold">Duration:</span> <span id="cc-manager-feature-property-type">${prowessData.duration}</span></div>
        </div>
    `;

    const prowessDescriptionEl = document.createElement('div');
    prowessDescriptionEl.classList.add('cc-manager-feature-description');
    prowessDescriptionEl.innerHTML = `
        <div class="paragraph">${parseDescription(prowessData.description)}</div>
    `;

    prowessContentEl.appendChild(prowessDescriptionEl);

    prowessEl.appendChild(prowessContentEl);

    prowessSummaryEl.appendChild(prowessTakeButtonEl);

    prowessEl.appendChild(prowessSummaryEl);

    if (container) {
        container.appendChild(prowessEl);
    }
    
    return prowessEl;
}

function generateProwesses() {
    console.log('Generating prowesses...');
    const prowessesListEl = document.querySelector('#cc-manager-prowesses');
    if (!prowessesListEl) return;

    const classLevel = characterData.class.level;
    const classData = getGameFeatureData('class');
    if (!classData) return;

    if (classData.prowessInfo.canUseProwesses) {
        const prowessMenuButtonEl = document.querySelector('#cc-manager-menu-prowesses-button');
        if (prowessMenuButtonEl) {
            prowessMenuButtonEl.classList.remove('hidden');
        }
    } else {
        const prowessMenuButtonEl = document.querySelector('#cc-manager-menu-prowesses-button');
        if (prowessMenuButtonEl) {
            prowessMenuButtonEl.classList.add('hidden');
        }
        return;
    }

    const characterProwessInfo = getCharacterProwessInfo(classLevel, classData.prowessInfo.prowessGrowthRate);

    const prowessCountEl = document.querySelector('#cc-prowesses-count-value');
    if (prowessCountEl) {
        prowessCountEl.textContent = characterData.class.prowesses.length;
    }
    const prowessCountMaxEl = document.querySelector('#cc-prowesses-count-max');
    if (prowessCountMaxEl) {
        prowessCountMaxEl.textContent = characterProwessInfo.maximumLearnedProwesses;
    }

    // Track which prowesses should exist at current level
    const availableProwessNames = new Set();
    
    for (let level = 1; level <= characterProwessInfo.maximumProwessLevel; level++) {
        const prowessList = classData.prowessInfo.prowessList[level];
        if (!prowessList) continue;

        prowessList.forEach(prowessName => {
            availableProwessNames.add(prowessName);
            
            const prowessId = `cc-manager-prowess-${prowessName.toLowerCase().replace(/ /g, '')}`;
            let prowessEl = document.getElementById(prowessId);
            
            if (!prowessEl) {
                // Prowess doesn't exist yet, create it
                prowessEl = generateProwessElement(prowessName, level, prowessesListEl);
            } else {
                // Prowess already exists, just update its button state
                const prowessTakeButtonEl = prowessEl.querySelector('.cc-manager-feature-take-button');
                if (prowessTakeButtonEl) {
                    const isLearned = characterData.class.prowesses.includes(prowessName);
                    if (isLearned) {
                        prowessTakeButtonEl.textContent = 'Unlearn';
                        prowessTakeButtonEl.classList.add('unlearn');
                        prowessTakeButtonEl.onclick = () => unlearnProwess(prowessName);
                    } else {
                        prowessTakeButtonEl.textContent = 'Learn';
                        prowessTakeButtonEl.classList.remove('unlearn');
                        prowessTakeButtonEl.onclick = () => takeProwess(prowessName);
                    }
                }
            }
        });
    }
    
    // Remove prowesses that are no longer available (e.g., when leveling down)
    const existingProwessEls = prowessesListEl.querySelectorAll('.cc-manager-feature');
    existingProwessEls.forEach(prowessEl => {
        const prowessName = prowessEl.dataset.prowessName;
        if (!prowessName || !availableProwessNames.has(prowessName)) {
            prowessEl.remove();
        }
    });
    
    // Update button disabled states
    updateProwesses();
}

function generateSpells() {
    console.log('Generating spells...');
    const spellsListEl = document.querySelector('#cc-manager-spells');
    
    spellsListEl.querySelectorAll('.cc-manager-feature').forEach(featureEl => {
        featureEl.remove();
    });

    const classLevel = characterData.class.level;
    const classData = getGameFeatureData('class');

    if (classData.spellInfo.canCastSpells) {
        const spellsMenuButtonEl = document.querySelector('#cc-manager-menu-spells-button');
        spellsMenuButtonEl.classList.remove('hidden');
    } else {
        const spellsMenuButtonEl = document.querySelector('#cc-manager-menu-spells-button');
        spellsMenuButtonEl.classList.add('hidden');
        return;
    }

    const characterSpellInfo = getCharacterSpellInfo(classLevel, classData.spellInfo.spellGrowthRate);

    const spellsCountEl = document.querySelector('#cc-spells-count-value');
    spellsCountEl.textContent = getLearnedSpellsCount();
    const spellsCountMaxEl = document.querySelector('#cc-spells-count-max');
    spellsCountMaxEl.textContent = characterSpellInfo.maximumLearnedSpells;

    const cantripsCountEl = document.querySelector('#cc-cantrips-count-value');
    cantripsCountEl.textContent = getLearnedCantripsCount();
    const cantripsCountMaxEl = document.querySelector('#cc-cantrips-count-max');
    cantripsCountMaxEl.textContent = characterSpellInfo.maximumLearnedCantrips;

    for (let level = 0; level <= characterSpellInfo.maximumSpellLevel; level++) {
        const spellsList = classData.spellInfo.spellList[level];

        spellsList.forEach(spellName => {
            let spellData = null;
            // Try to find spell in both arrays, checking isCantrip property
            spellData = gameData.spells.spells.find(s => s.name === spellName);
            if (!spellData) {
                spellData = gameData.spells.cantrips.find(c => c.name === spellName);
            }
            if (!spellData) return; // Skip if spell not found
            
            const isCantrip = spellData.isCantrip || false;
            const spellsEl = document.createElement('details');
            spellsEl.id = `cc-manager-spell-${spellName.toLowerCase().replace(/ /g, '')}`;
            spellsEl.dataset.spellName = spellName;
            spellsEl.classList.add('cc-manager-feature');

            const levelSuffix = isCantrip ? '' : level === 1 ? 'st' : level === 2 ? 'nd' : level === 3 ? 'rd' : 'th';

            const spellsSummaryEl = document.createElement('summary');
            spellsSummaryEl.classList.add('cc-manager-feature-summary');
            spellsSummaryEl.innerHTML = `
                <div class="cc-manager-feature-summary-info">
                    <div class="cc-manager-feature-summary-title header">${spellData.name}</div>
                    <div class="cc-manager-feature-summary-meta">
                        <div class="cc-manager-feature-summary-meta-item">${isCantrip ? 'Cantrip' : level}${levelSuffix} ${isCantrip ? '' : 'Level'} ${spellData.ritual ? ' - Ritual' : ''}</div>
                    </div>
                </div>`;

            const spellsTakeButtonEl = document.createElement('button');
            spellsTakeButtonEl.classList.add('cc-manager-feature-take-button');
            spellsTakeButtonEl.dataset.spellName = spellName;
            spellsTakeButtonEl.dataset.isCantrip = isCantrip;
            
            // Check if spell is already learned
            const isLearned = isCantrip 
                ? characterData.class.spells.cantrips.some(c => c.name === spellName && c.countsAsKnown)
                : characterData.class.spells.spells.some(s => s.name === spellName && s.countsAsKnown);
            
            if (isLearned) {
                spellsTakeButtonEl.textContent = 'Unlearn';
                spellsTakeButtonEl.classList.add('unlearn');
                spellsTakeButtonEl.onclick = () => unlearnSpell(spellName, isCantrip);
            } else {
                spellsTakeButtonEl.textContent = 'Learn';
                spellsTakeButtonEl.onclick = () => takeSpell(spellName, isCantrip);
            }

            const spellsContentEl = document.createElement('div');
            spellsContentEl.classList.add('cc-manager-feature-content');
            spellsContentEl.innerHTML = `
                <div class="cc-manager-feature-properties">
                    <div class="cc-manager-feature-property"><span class="bold">School:</span> <span id="cc-manager-feature-property-type">${spellData.school}</span></div>
                    <div class="cc-manager-feature-property"><span class="bold">Casting Time:</span> <span id="cc-manager-feature-property-type">${spellData.castingTime}</span></div>
                    <div class="cc-manager-feature-property"><span class="bold">Range/Area:</span> <span id="cc-manager-feature-property-type">${spellData.range}</span></div>
                    <div class="cc-manager-feature-property"><span class="bold">Components:</span> <span id="cc-manager-feature-property-type">${spellData.components}</span></div>
                    <div class="cc-manager-feature-property"><span class="bold">Duration:</span> <span id="cc-manager-feature-property-type">${spellData.duration}</span></div>
                </div>
            `;

            const spellsDescriptionEl = document.createElement('div');
            spellsDescriptionEl.classList.add('cc-manager-feature-description');
            spellsDescriptionEl.innerHTML = `
                <div class="paragraph">${parseDescription(spellData.description)}</div>
            `;

            spellsContentEl.appendChild(spellsDescriptionEl);

            spellsEl.appendChild(spellsContentEl);

            spellsSummaryEl.appendChild(spellsTakeButtonEl);

            spellsEl.appendChild(spellsSummaryEl);

            spellsListEl.appendChild(spellsEl);
        });
        
    }
}

function generateSpellSlots() {
    const classData = getGameFeatureData('class');
    if (!classData) return;

    if (!classData.spellInfo.canCastSpells) return;

    const spellSlots = characterData.class.spells.slots;
    const classLevel = parseInt(characterData.class.level);

    if (classData.spellInfo.spellGrowthRate === 'full') {
        spellSlots["1"].max = Math.min(1 + classLevel, 3);
        spellSlots["2"].max = classLevel >= 3 ? Math.min(-1 + classLevel, 3) : -1;
        spellSlots["3"].max = classLevel >= 5 ? Math.min(-3 + classLevel, 3) : -1;
        spellSlots["4"].max = classLevel >= 7 ? Math.min(-6 + classLevel, 3) : -1;
        spellSlots["5"].max = classLevel >= 9 ? Math.min(1 + Math.ceil((classLevel - 9) / 8), 3) : -1;
        spellSlots["6"].max = classLevel >= 11 ? Math.min(1 + Math.floor((classLevel - 11) / 8), 2) : -1;
        spellSlots["7"].max = classLevel >= 13 ? Math.min(12 + Math.ceil((classLevel - 13) / 8), 2) : -1;
        spellSlots["8"].max = classLevel >= 15 ? 1 : -1;
        spellSlots["9"].max = classLevel >= 17 ? 1 : -1;
    } else if (classData.spellInfo.spellGrowthRate === 'half') {
        spellSlots["1"].max = classLevel >= 2 ? Math.min(classLevel, 3) : -1;
        spellSlots["2"].max = classLevel >= 5 ? Math.min(2 + Math.floor((classLevel - 5) / 2), 3) : -1;
        spellSlots["3"].max = classLevel >= 9 ? Math.min(2 + Math.floor((classLevel - 9) / 2), 3) : -1;
        spellSlots["4"].max = classLevel >= 13 ? Math.min(1 + Math.floor((classLevel - 13) / 2), 3) : -1;
        spellSlots["5"].max = classLevel >= 17 ? Math.min(1 + Math.ceil((classLevel - 17) / 2), 2) : -1;
    }

    Object.values(spellSlots).forEach(slot => {
        slot.current = slot.current == -1 && slot.max != -1 ? 0 : slot.current;
    });

    console.log('Spell slots:', spellSlots);
}

function takeProwess(prowessName) {
    const prowessData = gameData.prowesses.find(p => p.name === prowessName);
    if (!prowessData) {
        console.error('Prowess data not found');
        return;
    }
    const prowessEl = document.querySelector(`#cc-manager-prowess-${prowessName.toLowerCase().replace(/ /g, '')}`);
    if (!prowessEl) {
        console.error('Prowess element not found');
        return;
    }
    const prowessTakeButtonEl = prowessEl.querySelector('.cc-manager-feature-take-button');

    prowessTakeButtonEl.textContent = 'Unlearn';
    prowessTakeButtonEl.classList.add('unlearn');
    prowessTakeButtonEl.onclick = () => unlearnProwess(prowessName);

    const prowess = {
        name: prowessName,
        flipped: false,
    }

    characterData.class.prowesses.push(prowess);

    console.log('Character data:', characterData);

    updateProwessElements();
}

function unlearnProwess(prowessName) {
    const prowessData = gameData.prowesses.find(p => p.name === prowessName);
    if (!prowessData) {
        console.error('Prowess data not found');
        return;
    }
    const prowessEl = document.querySelector(`#cc-manager-prowess-${prowessName.toLowerCase().replace(/ /g, '')}`);
    if (!prowessEl) {
        console.error('Prowess element not found');
        return;
    }
    const prowessTakeButtonEl = prowessEl.querySelector('.cc-manager-feature-take-button');

    prowessTakeButtonEl.textContent = 'Learn';
    prowessTakeButtonEl.classList.remove('unlearn');
    prowessTakeButtonEl.onclick = () => takeProwess(prowessName);

    characterData.class.prowesses.splice(characterData.class.prowesses.findIndex(p => p.name === prowessName), 1);

    console.log('Character data:', characterData);

    updateProwessElements();
}

function updateProwessElements() {
    const classData = getGameFeatureData('class');
    const characterProwessInfo = getCharacterProwessInfo(characterData.class.level, classData.prowessInfo.prowessGrowthRate);

    const prowessListEl = document.querySelector('#cc-manager-prowesses');

    const prowessCountEl = document.querySelector('#cc-prowesses-count-value');
    prowessCountEl.textContent = characterData.class.prowesses.length;
    const prowessCountMaxEl = document.querySelector('#cc-prowesses-count-max');
    prowessCountMaxEl.textContent = characterProwessInfo.maximumLearnedProwesses;

    if (characterData.class.prowesses.length >= characterProwessInfo.maximumLearnedProwesses) {
        const prowessTakeButtonEls = prowessListEl.querySelectorAll('.cc-manager-feature-take-button');
        prowessTakeButtonEls.forEach(prowessTakeButtonEl => {
            if (prowessTakeButtonEl.classList.contains('unlearn')) {
                return;
            }
            prowessTakeButtonEl.disabled = true;
            prowessTakeButtonEl.classList.add('disabled');
        });
    } else {
        const prowessTakeButtonEls = prowessListEl.querySelectorAll('.cc-manager-feature-take-button');
        prowessTakeButtonEls.forEach(prowessTakeButtonEl => {
            prowessTakeButtonEl.disabled = false;
            prowessTakeButtonEl.classList.remove('disabled');
        });
    }
}

function takeSpell(spellName, isCantrip) {
    // Initialize spells array if it doesn't exist
    if (!characterData.class.spells) {
        characterData.class.spells = {
            spells: [],
            cantrips: [],
        };
    }
    
    // Try to find spell in both arrays
    let spellData = gameData.spells.spells.find(s => s.name === spellName);
    if (!spellData) {
        spellData = gameData.spells.cantrips.find(c => c.name === spellName);
    }
    if (!spellData) {
        console.error('Spell data not found');
        return;
    }

    const spell = { 
        name: spellData.name,
        isCantrip: spellData.isCantrip || false,
        grantedAtLevel: null,
        alwaysPrepared: false,
        countsAsKnown: true,
        source: {
            source: 'class',
            subsource: null,
            feature: null,
            type: 'prepared',
            option: null,
        }
     };

     if (isCantrip) {
        characterData.class.spells.cantrips.push(spell);
    } else {
        characterData.class.spells.spells.push(spell);
    }
    
    // Update UI
    const spellEl = document.querySelector(`#cc-manager-spell-${spellName.toLowerCase().replace(/ /g, '')}`);
    if (spellEl) {
        const spellTakeButtonEl = spellEl.querySelector('.cc-manager-feature-take-button');
        if (spellTakeButtonEl) {
            spellTakeButtonEl.textContent = 'Unlearn';
            spellTakeButtonEl.classList.add('unlearn');
            spellTakeButtonEl.onclick = () => unlearnSpell(spellName, isCantrip);
        }
    }

    updateSpellElements();
    
    console.log('Character data:', characterData);
}

function unlearnSpell(spellName, isCantrip) {
    if (!characterData.class.spells) return;
    
    // Try to find spell in both arrays to determine which one to remove from
    let spellIndex = characterData.class.spells.spells.findIndex(s => s.name === spellName);
    if (spellIndex !== -1) {
        characterData.class.spells.spells.splice(spellIndex, 1);
    } else {
        spellIndex = characterData.class.spells.cantrips.findIndex(c => c.name === spellName);
        if (spellIndex !== -1) {
            characterData.class.spells.cantrips.splice(spellIndex, 1);
        }
    }
    
    // Update UI - need to determine isCantrip from spell data
    const spellEl = document.querySelector(`#cc-manager-spell-${spellName.toLowerCase().replace(/ /g, '')}`);
    if (spellEl) {
        const spellTakeButtonEl = spellEl.querySelector('.cc-manager-feature-take-button');
        if (spellTakeButtonEl) {
            // Get isCantrip from game data
            let spellData = gameData.spells.spells.find(s => s.name === spellName);
            if (!spellData) {
                spellData = gameData.spells.cantrips.find(c => c.name === spellName);
            }
            const spellIsCantrip = spellData ? (spellData.isCantrip || false) : isCantrip;
            
            spellTakeButtonEl.textContent = 'Learn';
            spellTakeButtonEl.classList.remove('unlearn');
            spellTakeButtonEl.onclick = () => takeSpell(spellName, spellIsCantrip);
        }
    }
    
    console.log('Character data:', characterData);

    updateSpellElements();
}

function updateSpellElements() {
    const classData = getGameFeatureData('class');
    const characterSpellInfo = getCharacterSpellInfo(characterData.class.level, classData.spellInfo.spellGrowthRate);

    const spellsListEl = document.querySelector('#cc-manager-spells');

    const spellCount = getLearnedSpellsCount();
    const cantripCount = getLearnedCantripsCount();

    const spellsCountEl = document.querySelector('#cc-spells-count-value');
    spellsCountEl.textContent = spellCount;
    const spellsCountMaxEl = document.querySelector('#cc-spells-count-max');
    spellsCountMaxEl.textContent = characterSpellInfo.maximumLearnedSpells;

    const cantripsCountEl = document.querySelector('#cc-cantrips-count-value');
    cantripsCountEl.textContent = cantripCount;
    const cantripsCountMaxEl = document.querySelector('#cc-cantrips-count-max');
    cantripsCountMaxEl.textContent = characterSpellInfo.maximumLearnedCantrips;

    if (spellCount >= characterSpellInfo.maximumLearnedSpells) {
        const spellsTakeButtonEls = spellsListEl.querySelectorAll('.cc-manager-feature-take-button');
        spellsTakeButtonEls.forEach(spellsTakeButtonEl => {
            if (spellsTakeButtonEl.dataset.isCantrip === 'true' || spellsTakeButtonEl.classList.contains('unlearn')) {
                return;
            }
            spellsTakeButtonEl.disabled = true;
            spellsTakeButtonEl.classList.add('disabled');
        });
    } else {
        const spellsTakeButtonEls = spellsListEl.querySelectorAll('.cc-manager-feature-take-button');
        spellsTakeButtonEls.forEach(spellsTakeButtonEl => {
            if (spellsTakeButtonEl.dataset.isCantrip === 'true') {
                return;
            }
            spellsTakeButtonEl.disabled = false;
            spellsTakeButtonEl.classList.remove('disabled');
        });
    }

    if (cantripCount >= characterSpellInfo.maximumLearnedCantrips) {
        const cantripsTakeButtonEls = spellsListEl.querySelectorAll('.cc-manager-feature-take-button');
        cantripsTakeButtonEls.forEach(cantripsTakeButtonEl => {
            if (cantripsTakeButtonEl.dataset.isCantrip === 'false' || cantripsTakeButtonEl.classList.contains('unlearn')) {
                return;
            }
            cantripsTakeButtonEl.disabled = true;
            cantripsTakeButtonEl.classList.add('disabled');
        });
    } else {
        const cantripsTakeButtonEls = spellsListEl.querySelectorAll('.cc-manager-feature-take-button');
        cantripsTakeButtonEls.forEach(cantripsTakeButtonEl => {
            if (cantripsTakeButtonEl.dataset.isCantrip === 'false') {
                return;
            }
            cantripsTakeButtonEl.disabled = false;
            cantripsTakeButtonEl.classList.remove('disabled');
        });
    }
}

function showClassDetails(details) {
    console.log(`Showing ${details} details...`);
    const classEl = document.querySelector('#cc-class-manager');
    const detailsEl = classEl.querySelectorAll('.cc-manager-details');
    detailsEl.forEach(detailEl => {
        if (detailEl.id === `cc-manager-${details}`) {
            detailEl.classList.remove('hidden');
        } else {
            detailEl.classList.add('hidden');
        }
    });
}

// ============================================================================
// Race Selection & Management
// ============================================================================

function generateRaces() {
    console.log('Generating races...');

    const races = gameData.races;
    const raceListEl = document.querySelector('#cc-builder-tab-race .cc-builder-tab-content');

    raceListEl.innerHTML = '';

    races.forEach(raceData => {
        const raceEl = document.createElement('button');
        raceEl.classList.add('cc-builder-tab-content-item', 'race');
        raceEl.id = `cc-race-${raceData.name.toLowerCase().replace(/ /g, '-')}`;
        raceEl.dataset.raceId = raceData.name.toLowerCase().replace(/ /g, '-');
        raceEl.onclick = () => {
            selectRace(raceEl);
        };
        const raceDescription = parseDescription(raceData.description);
        raceEl.innerHTML = `
            <div class="cc-builder-tab-content-item-title">${raceData.name}</div>
            <div class="cc-builder-tab-content-item-description">${raceDescription}</div>
        `;
        raceListEl.appendChild(raceEl);
    });
}

function selectRace(raceEl) {
    const dialog = document.querySelector('.cc-confirm-dialog');
    const raceData = gameData.races.find(r => r.name.toLowerCase().replace(/ /g, '-') === raceEl.dataset.raceId);
    temporaryData = raceData;
    if (!raceData) {
        console.error('Race data not found');
        return;
    }
    dialog.querySelector('.cc-confirm-dialog-header').textContent = `Confirm Add Race`;
    dialog.querySelector('.cc-confirm-dialog-content-title').textContent = raceEl.querySelector('.cc-builder-tab-content-item-title').textContent;
    const raceDescription = parseDescription(raceData.description);
    dialog.querySelector('.cc-confirm-dialog-content-description').innerHTML = raceDescription;
    
    const dialogConfirmButtonEl = dialog.querySelector('.cc-confirm-dialog-button.confirm');
    dialogConfirmButtonEl.textContent = `Add Race`;
    dialogConfirmButtonEl.onclick = () => confirmRace();
    
    const dialogCancelButtonEl = dialog.querySelector('.cc-confirm-dialog-button.cancel');
    dialogCancelButtonEl.textContent = `Cancel`;
    dialogCancelButtonEl.onclick = () => cancelRace();

    const dialogItemsEl = dialog.querySelector('.cc-confirm-dialog-items');
    dialogItemsEl.innerHTML = '';

    raceData.features.forEach(feature => {
        const dialogItemEl = document.createElement('div');
        dialogItemEl.classList.add('cc-confirm-dialog-item');
        const featureDescription = parseDescription(feature.description);
        dialogItemEl.innerHTML = `
            <div class="cc-confirm-dialog-item-title">${feature.name}</div>
            <div class="cc-confirm-dialog-item-description">${featureDescription}</div>
        `;
        dialogItemsEl.appendChild(dialogItemEl);
    });
    dialog.showModal();
}

function confirmRace() {
    const dialog = document.querySelector('.cc-confirm-dialog');

    const raceData = temporaryData;
    characterData.characterInfo.race = raceData.name;
    characterData.race.name = raceData.name;

    // Initialize features - auto-detect options and choices
    raceData.features.forEach(feature => {
        const characterFeature = {
            name: feature.name,
        };
        
        // If feature has options, initialize options array
        if (featureHasOptions(feature)) {
            characterFeature.options = [];
        }
        
        // If feature has choices, initialize modifiers array for storing selections
        if (featureHasChoices(feature)) {
            // Initialize as empty array for storing selected choices
            characterFeature.modifiers = [];
        }
        
        characterData.race.features.push(characterFeature);
    });

    // Initialize modifiers array
    characterData.modifiers = [];

    generateRace();

    dialog.close();
}

function cancelRace() {
    const dialog = document.querySelector('.cc-confirm-dialog');
    dialog.close();
}

function generateRace() {
    console.log('Generating race...');
    const raceManagerEl = document.querySelector('#cc-builder-tab-race-manage');
    const raceChooseEl = document.querySelector('#cc-builder-tab-race-choose');

    raceManagerEl.classList.remove('hidden');
    raceChooseEl.classList.add('hidden');
    
    // Generate race features
    generateFeatures('race');
}

// ============================================================================
// Background Selection & Management
// ============================================================================

function generateBackgrounds() {
    console.log('Generating backgrounds...');

    const backgrounds = gameData.backgrounds;
    const backgroundListEl = document.querySelector('#cc-builder-tab-background .cc-builder-tab-content');

    backgroundListEl.innerHTML = '';

    backgrounds.forEach(backgroundData => {
        const backgroundEl = document.createElement('button');
        backgroundEl.classList.add('cc-builder-tab-content-item', 'background');
        backgroundEl.id = `cc-background-${backgroundData.name.toLowerCase().replace(/ /g, '-')}`;
        backgroundEl.dataset.backgroundId = backgroundData.name.toLowerCase().replace(/ /g, '-');
        backgroundEl.onclick = () => {
            selectBackground(backgroundEl);
        };
        const backgroundDescription = parseDescription(backgroundData.description);
        backgroundEl.innerHTML = `
            <div class="cc-builder-tab-content-item-title">${backgroundData.name}</div>
            <div class="cc-builder-tab-content-item-description">${backgroundDescription}</div>
        `;
        backgroundListEl.appendChild(backgroundEl);
    });
}

function selectBackground(backgroundEl) {
    const dialog = document.querySelector('.cc-confirm-dialog');
    const backgroundData = gameData.backgrounds.find(b => b.name.toLowerCase().replace(/ /g, '-') === backgroundEl.dataset.backgroundId);
    temporaryData = backgroundData;
    if (!backgroundData) {
        console.error('Background data not found');
        return;
    }
    dialog.querySelector('.cc-confirm-dialog-header').textContent = `Confirm Add Background`;
    dialog.querySelector('.cc-confirm-dialog-content-title').textContent = backgroundEl.querySelector('.cc-builder-tab-content-item-title').textContent;
    const backgroundDescription = parseDescription(backgroundData.description);
    dialog.querySelector('.cc-confirm-dialog-content-description').innerHTML = backgroundDescription;
    
    const dialogConfirmButtonEl = dialog.querySelector('.cc-confirm-dialog-button.confirm');
    dialogConfirmButtonEl.textContent = `Add Background`;
    dialogConfirmButtonEl.onclick = () => confirmBackground();
    
    const dialogCancelButtonEl = dialog.querySelector('.cc-confirm-dialog-button.cancel');
    dialogCancelButtonEl.textContent = `Cancel`;
    dialogCancelButtonEl.onclick = () => cancelBackground();

    const dialogItemsEl = dialog.querySelector('.cc-confirm-dialog-items');
    dialogItemsEl.innerHTML = '';

    backgroundData.features.forEach(feature => {
        const dialogItemEl = document.createElement('div');
        dialogItemEl.classList.add('cc-confirm-dialog-item');
        const featureDescription = parseDescription(feature.description);
        dialogItemEl.innerHTML = `
            <div class="cc-confirm-dialog-item-title">${feature.name}</div>
            <div class="cc-confirm-dialog-item-description">${featureDescription}</div>
        `;
        dialogItemsEl.appendChild(dialogItemEl);
    });
    dialog.showModal();
}

function confirmBackground() {
    const dialog = document.querySelector('.cc-confirm-dialog');

    const backgroundData = temporaryData;
    characterData.characterInfo.background = backgroundData.name;
    characterData.background.name = backgroundData.name;

    // Initialize features - auto-detect options and choices
    backgroundData.features.forEach(feature => {
        const characterFeature = {
            name: feature.name,
        };
        
        // If feature has options, initialize options array
        if (featureHasOptions(feature)) {
            characterFeature.options = [];
        }
        
        // If feature has choices, initialize modifiers array for storing selections
        if (featureHasChoices(feature)) {
            // Initialize as empty array for storing selected choices
            characterFeature.modifiers = [];
        }
        
        characterData.background.features.push(characterFeature);
    });

    // Initialize modifiers array
    characterData.modifiers = [];

    generateBackground();

    dialog.close();
}

function cancelBackground() {
    const dialog = document.querySelector('.cc-confirm-dialog');
    dialog.close();
}

function generateBackground() {
    console.log('Generating background...');
    const backgroundManagerEl = document.querySelector('#cc-builder-tab-background-manage');
    const backgroundChooseEl = document.querySelector('#cc-builder-tab-background-choose');

    backgroundManagerEl.classList.remove('hidden');
    backgroundChooseEl.classList.add('hidden');
    
    // Generate background features
    generateFeatures('background');
}

// ============================================================================
// Ability Selection & Management
// ============================================================================

function generateAbilities() {
    console.log('Generating abilities...');

    const abilities = gameData.abilities;

    abilities.forEach(abilityData => {
        temporaryData = abilityData;

        abilityData.features.forEach(feature => {
            const characterFeature = {
                name: feature.name,
            };

            // If feature has options, initialize options array
            if (featureHasOptions(feature)) {
                characterFeature.options = [];
            }
            
            // If feature has choices, initialize modifiers array for storing selections
            if (featureHasChoices(feature)) {
                // Initialize as empty array for storing selected choices
                characterFeature.modifiers = [];
            }

            characterData.abilities.features.push(characterFeature);
        });
        generateFeatures('abilities');
    });
}
// ============================================================================
// FEATURE MANAGEMENT
// ============================================================================

/**
 * Generate a single feature UI element
 * @param {object} gameFeature - The feature definition from game data
 * @param {object} characterFeature - The character's feature data
 * @param {string} source - Source type ('class', 'race', 'background', 'feat')
 * @param {HTMLElement} container - Optional container to append the feature to
 * @returns {HTMLElement} The generated feature element
 */
function generateFeature(gameFeature, characterFeature, source, subsource = null, container = null) {
    if (!gameFeature || !characterFeature) return null;
    
    const featureEl = document.createElement('details');
    featureEl.classList.add('cc-manager-feature');
    featureEl.dataset.featureName = gameFeature.name;
    
    // Determine how many options/choices are available
    let choicesCount = 0;
    let selectedCount = 0;
    
    if (featureHasOptions(gameFeature)) {
        choicesCount = gameFeature.count || 1;
        selectedCount = characterFeature.options ? characterFeature.options.filter(o => {
            if (!o) return false;
            return typeof o === 'string' ? true : (o.optionName ? true : false);
        }).length : 0;
    } else if (featureHasChoices(gameFeature)) {
        const choiceModifiers = getChoiceModifiers(gameFeature);
        choicesCount = choiceModifiers.length;
        selectedCount = characterFeature.modifiers ? characterFeature.modifiers.filter(m => m).length : 0;
    } else if (gameFeature.type === 'subclass') {
        choicesCount = gameFeature.subclasses.length;
        selectedCount = characterFeature.subclass?.name ? 1 : 0;
    }
    
    const featureDescription = parseDescription(gameFeature.description, 'charactercreator');
    
    // Build summary
    const summaryEl = document.createElement('summary');
    summaryEl.classList.add('cc-manager-feature-summary');
    summaryEl.innerHTML = `
        <div class="cc-manager-feature-summary-info">
            <div class="cc-manager-feature-summary-title header">${gameFeature.name}</div>
            <div class="cc-manager-feature-summary-meta">
                ${choicesCount > 0 ? `<div class="cc-manager-feature-summary-meta-item">${selectedCount}/${choicesCount} Choices</div>` : ''}
                ${source === 'class' || subsource === 'subclass' && gameFeature.level ? `<div class="cc-manager-feature-summary-meta-item">Level ${gameFeature.level}</div>` : ''}
            </div>
        </div>
    `;
    
    // Build content
    const contentEl = document.createElement('div');
    contentEl.classList.add('cc-manager-feature-content');
    contentEl.innerHTML = `
        <div class="cc-manager-feature-content-description">
            ${featureDescription}
        </div>
    `;
    
    // Add options UI if feature has options
    if (featureHasOptions(gameFeature)) {
        const choicesContainer = document.createElement('div');
        choicesContainer.classList.add('cc-manager-feature-content-choices');
        
        const count = gameFeature.count || 1;
        for (let i = 0; i < count; i++) {
            const choiceEl = document.createElement('div');
            choiceEl.classList.add('cc-manager-feature-content-choice');
            
            choiceEl.id = `cc-manager-feature-content-choice-${sanitizeFeatureName(gameFeature.name)}-${i}`;
            choiceEl.dataset.choiceIndex = i;
            
            const selectEl = document.createElement('select');
            selectEl.classList.add('cc-manager-feature-content-choice-select');
            selectEl.dataset.featureName = gameFeature.name;
            selectEl.dataset.choiceIndex = i;
            selectEl.dataset.source = source;
            selectEl.dataset.subsource = subsource;
            selectEl.onchange = () => handleOptionSelection(gameFeature.name, i, selectEl.value, source, subsource);
            
            // Add default option
            const defaultOption = document.createElement('option');
            defaultOption.value = -1;
            defaultOption.textContent = 'Choose an Option';
            selectEl.appendChild(defaultOption);
            
            // Add all available options
            gameFeature.options.forEach(option => {
                const optionEl = document.createElement('option');
                optionEl.value = option.name;
                optionEl.textContent = option.name;
                // Mark as selected if this option is already chosen
                if (characterFeature.options && characterFeature.options[i]) {
                    const optionName = typeof characterFeature.options[i] === 'string' 
                        ? characterFeature.options[i] 
                        : characterFeature.options[i].optionName;
                    if (optionName === option.name) {
                        optionEl.selected = true;
                    }
                }
                selectEl.appendChild(optionEl);
            });
            
            // Show description of selected option
            const descriptionEl = document.createElement('div');
            descriptionEl.classList.add('cc-manager-feature-content-choice-description', 'paragraph');
            descriptionEl.id = `cc-manager-feature-content-choice-description-${sanitizeFeatureName(gameFeature.name)}-${i}`;
            
            // Set initial description if option is already selected
            if (characterFeature.options && characterFeature.options[i]) {
                const optionName = typeof characterFeature.options[i] === 'string' 
                    ? characterFeature.options[i] 
                    : characterFeature.options[i].optionName;
                const selectedOption = gameFeature.options.find(o => o.name === optionName);
                if (selectedOption) {
                    descriptionEl.innerHTML = parseDescription(selectedOption.description, 'charactercreator');
                    
                    // Generate choices UI if the selected option has choice modifiers
                    const characterOption = typeof characterFeature.options[i] === 'object' 
                        ? characterFeature.options[i] 
                        : { optionName: optionName, choices: [] };
                    generateOptionChoices(gameFeature.name, i, selectedOption, characterOption, source, subsource, descriptionEl);
                }
            }
            
            choiceEl.appendChild(selectEl);
            choiceEl.appendChild(descriptionEl);
            choicesContainer.appendChild(choiceEl);
        }
        
        contentEl.appendChild(choicesContainer);
    }

    // Add choices UI if feature has choices (but not options - options are handled above)
    if (featureHasChoices(gameFeature)) {
        const choicesContainer = document.createElement('div');
        choicesContainer.classList.add('cc-manager-feature-content-choices');
        
        const choiceModifiers = getChoiceModifiers(gameFeature);
        choiceModifiers.forEach((modifier, i) => {
            const choiceEl = document.createElement('div');
            choiceEl.classList.add('cc-manager-feature-content-choice');
            choiceEl.id = `cc-manager-feature-content-choice-${sanitizeFeatureName(gameFeature.name)}-${i}`;
            choiceEl.dataset.choiceIndex = i;
            
            const selectEl = document.createElement('select');
            selectEl.classList.add('cc-manager-feature-content-choice-select');
            selectEl.dataset.featureName = gameFeature.name;
            selectEl.dataset.choiceIndex = i;
            selectEl.dataset.source = source;
            selectEl.dataset.subsource = subsource;
            selectEl.onchange = () => handleChoiceSelection(gameFeature.name, i, modifier.type, selectEl.value, source, subsource);
            
            // Add default option
            const defaultOption = document.createElement('option');
            defaultOption.value = -1;
            defaultOption.textContent = 'Choose an Option';
            selectEl.appendChild(defaultOption);
            
            // Add all available options
            if (modifier.from && Array.isArray(modifier.from)) {
                modifier.from.forEach(choice => {
                    const optionEl = document.createElement('option');
                    optionEl.value = choice;
                    optionEl.textContent = choice;
                    // Mark as selected if already chosen
                    if (characterFeature.modifiers && characterFeature.modifiers[i] && characterFeature.modifiers[i].value === choice) {
                        optionEl.selected = true;
                    }
                    selectEl.appendChild(optionEl);
                });
            }

            // Show description of selected option
            const descriptionEl = document.createElement('div');
            descriptionEl.classList.add('cc-manager-feature-content-choice-description', 'paragraph');
            descriptionEl.id = `cc-manager-feature-content-choice-description-${sanitizeFeatureName(gameFeature.name)}-${i}`;
            
            // Set initial description if option is already selected
            if (characterFeature.modifiers && characterFeature.modifiers[i] && characterFeature.modifiers[i].value) {
                const selectedValue = characterFeature.modifiers[i].value;
                // Handle feat descriptions
                if (modifier.type === 'feat' || modifier.type === 'originFeat') {
                    const featData = gameData.feats.find(f => f.name === selectedValue);
                    if (featData) {
                        descriptionEl.innerHTML = parseDescription(featData.description, 'charactercreator');
                    }
                }
            }
            
            choiceEl.appendChild(selectEl);
            choiceEl.appendChild(descriptionEl);
            choicesContainer.appendChild(choiceEl);
        });
        
        contentEl.appendChild(choicesContainer);
    }

    // Add subclass UI if feature is a subclass
    if (gameFeature.type === 'subclass') {
        const choicesContainer = document.createElement('div');
        choicesContainer.classList.add('cc-manager-feature-content-choices');
        
        gameFeature.subclasses.forEach((subclass, i) => {
            const choiceEl = document.createElement('div');
            choiceEl.classList.add('cc-manager-feature-content-choice');
            choiceEl.id = `cc-manager-feature-content-choice-${sanitizeFeatureName(gameFeature.name)}-${i}`;
            choiceEl.dataset.choiceIndex = i;
            
            const selectEl = document.createElement('select');
            selectEl.classList.add('cc-manager-feature-content-choice-select');
            selectEl.dataset.featureName = gameFeature.name;
            selectEl.dataset.choiceIndex = i;
            selectEl.dataset.source = source;
            selectEl.dataset.subsource = subsource;
            selectEl.onchange = () => handleSubclassSelection(gameFeature.name, i, selectEl.value, source, subsource);
            
            // Add default option
            const defaultOption = document.createElement('option');
            defaultOption.value = -1;
            defaultOption.textContent = 'Choose an Option';
            selectEl.appendChild(defaultOption);
            
            // Add all available options
            gameFeature.subclasses.forEach(subclass => {
                const optionEl = document.createElement('option');
                optionEl.value = subclass;
                optionEl.textContent = subclass;
                selectEl.appendChild(optionEl);
            });
            
            choiceEl.appendChild(selectEl);
            choicesContainer.appendChild(choiceEl);
        });
        
        contentEl.appendChild(choicesContainer);
    }
    
    featureEl.appendChild(summaryEl);
    featureEl.appendChild(contentEl);
    
    // Append to container if provided
    if (container) {
        container.appendChild(featureEl);
    }
    
    return featureEl;
}

/**
 * Generate features for a given source (class, race, background)
 * @param {string} source - Source type ('class', 'race', 'background')
 */
function generateFeatures(source = 'class', subsource = null) {
    
    if ((!characterData[source]?.name && source !== 'abilities') || !gameData) return;

    if (subsource && !characterData[source]?.subclass?.name) {
        console.error('Subclass not found for:', source);
    }
    
    const sourceData = getGameFeatureData(source, subsource);
    if (!sourceData) {
        console.error('Source data not found for:', source);
        return;
    }

    const builderTabEl = document.querySelector(`#cc-builder-tab-${source}-manage`);
    
    const featuresContainer = builderTabEl.querySelector('#cc-manager-features');
    if (!featuresContainer) {
        console.error('Features container not found for:', source);
        return;
    }
    
    // Get features - filter by level for classes, all features for others
    let availableFeatures = sourceData.features || [];
    if (source === 'class' && characterData.class.level) {
        const currentLevel = characterData.class.level;
        availableFeatures = availableFeatures.filter(f => f.level <= currentLevel);
    }

    const featuresEl = featuresContainer.querySelectorAll('.cc-manager-feature');

    featuresEl.forEach(featureEl => {
        const featureName = featureEl.dataset.featureName;
        if (subsource === 'subclass' && !sourceData.features.find(f => f.name === featureName)) {
            return;
        } else if (subsource === 'subclass' && sourceData.features.find(f => f.name === featureName)) {
            featureEl.remove();
        }
        else if (!availableFeatures.find(f => f.name === featureName)) {
            featureEl.remove();
        }
    });
    
    availableFeatures.forEach((gameFeature, index) => {
        let characterFeature = null;
        if (subsource) {
            characterFeature = characterData[source][subsource].features.find(f => f.name === gameFeature.name);
        } else {
            characterFeature = characterData[source].features.find(f => f.name === gameFeature.name);
        }
        if (!characterFeature) return;
        
        if (Array.from(featuresEl).find(f => f.dataset.featureName === gameFeature.name)) return;
        generateFeature(gameFeature, characterFeature, source, subsource? subsource : null, featuresContainer);
    });
    
    // Update modifiers after generating features
    updateModifiers();

    updateProwesses();
    updateSpells();
}

/**
 * Generate class features in the class manager section
 * @deprecated Use generateFeatures('class') instead
 */
function generateClassFeatures() {
    generateFeatures('class');
}

/**
 * Generate race features in the race manager section
 * @deprecated Use generateFeatures('race') instead
 */
function generateRaceFeatures() {
    generateFeatures('race');
}

// ============================================================================
// Feature Event Handlers & Data Access
// ============================================================================

/**
 * Get character feature from the specified source
 * @param {string} featureName - Name of the feature
 * @param {string} source - Source type ('class', 'race', 'background')
 * @returns {object|null} Character feature or null if not found
 */
function getCharacterFeature(featureName, source = 'class', subsource = null) {
    if (source === 'feats') {
        return characterData.feats.find(f => f.name === featureName) || null;
    }
    if (subsource) {
        return characterData[source][subsource].features.find(f => f.name === featureName) || null;
    }
    return characterData[source]?.features?.find(f => f.name === featureName) || null;
}

/**
 * Get game data for the specified source
 * @param {string} source - Source type ('class', 'race', 'background')
 * @returns {object|null} Game data or null if not found
 */
function getGameFeatureData(source = 'class', subsource = null) {
    let sourceKey = '';
    if (source === 'class') {
        sourceKey = source + 'es';
        if (subsource === 'subclass') {
            sourceKey = 'subclasses';
            return gameData[sourceKey][characterData.class.name.toLowerCase()].find(s => s.name === characterData.class.subclass.name) || null;
        }
    } else if (source === 'feats') {
        sourceKey = 'feats';
        return gameData.feats;
    }
    else if (source === 'abilities') {
        return gameData.abilities[0];
    }
    else {
        sourceKey = source + 's';
    }
    const sourceName = characterData[source]?.name;
    if (!sourceName || !gameData[sourceKey]) return null;
    return gameData[sourceKey].find(c => c.name === sourceName);
}

/**
 * Get game feature definition from the specified source
 * @param {string} featureName - Name of the feature
 * @param {string} source - Source type ('class', 'race', 'background')
 * @returns {object|null} Game feature or null if not found
 */
function getGameFeature(featureName, source = 'class', subsource = null) {
    if (source === 'feats') {
        return gameData.feats.find(f => f.name === featureName) || null;
    }
    const sourceData = getGameFeatureData(source, subsource);
    return sourceData?.features?.find(f => f.name === featureName) || null;
}

/**
 * Get game feature definition from the specified source
 * @param {string} featureName - Name of the feature
 * @param {string} source - Source type ('class', 'race', 'background')
 * @returns {object|null} Game feature or null if not found
 */
function getGameItem(itemId) {
    return gameData.items.byId[itemId] || null;
}

/**
 * Generate choice UI for a selected option that has choice modifiers
 * @param {string} featureName - Name of the feature
 * @param {number} choiceIndex - Index of the option choice
 * @param {object} selectedOption - The selected option data from game data
 * @param {object} characterOption - The character's option data
 * @param {string} source - Source type ('class', 'race', 'background')
 * @param {string} subsource - Subsource (e.g., 'subclass')
 * @param {HTMLElement} container - Container to append choices to
 */
function generateOptionChoices(featureName, choiceIndex, selectedOption, characterOption, source, subsource, container) {
    if (!selectedOption.modifiers || !Array.isArray(selectedOption.modifiers)) return;
    
    // Get choice modifiers from the option
    const choiceModifiers = selectedOption.modifiers.filter(modifier => 
        modifier.subType === 'choose' || (modifier.from && Array.isArray(modifier.from))
    );
    
    if (choiceModifiers.length === 0) return;
    
    // Remove existing choice container if it exists
    const existingContainer = container.parentElement.querySelector('.cc-manager-feature-content-option-choices');
    if (existingContainer) {
        existingContainer.remove();
    }
    
    // Create container for option choices
    const choicesContainer = document.createElement('div');
    choicesContainer.classList.add('cc-manager-feature-content-option-choices');
    
    choiceModifiers.forEach((modifier, i) => {
        const choiceEl = document.createElement('div');
        choiceEl.classList.add('cc-manager-feature-content-option-choice');
        choiceEl.id = `cc-manager-feature-content-option-choice-${sanitizeFeatureName(featureName)}-${choiceIndex}-${i}`;
        choiceEl.dataset.choiceIndex = i;
        
        const selectEl = document.createElement('select');
        selectEl.classList.add('cc-manager-feature-content-option-choice-select');
        selectEl.dataset.featureName = featureName;
        selectEl.dataset.optionChoiceIndex = choiceIndex;
        selectEl.dataset.choiceIndex = i;
        selectEl.dataset.source = source;
        selectEl.dataset.subsource = subsource;
        selectEl.onchange = () => handleOptionChoiceSelection(featureName, choiceIndex, i, modifier.type, selectEl.value, source, subsource);
        
        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = -1;
        defaultOption.textContent = 'Choose an Option';
        selectEl.appendChild(defaultOption);
        
        // Add all available options
        if (modifier.from && Array.isArray(modifier.from)) {
            modifier.from.forEach(choice => {
                const optionEl = document.createElement('option');
                optionEl.value = choice;
                optionEl.textContent = choice;
                // Mark as selected if already chosen
                if (characterOption.choices && characterOption.choices[i] && characterOption.choices[i].value === choice) {
                    optionEl.selected = true;
                }
                selectEl.appendChild(optionEl);
            });
        }
        
        // Show description of selected option (for feats)
        const descriptionEl = document.createElement('div');
        descriptionEl.classList.add('cc-manager-feature-content-option-choice-description', 'paragraph');
        descriptionEl.id = `cc-manager-feature-content-option-choice-description-${sanitizeFeatureName(featureName)}-${choiceIndex}-${i}`;
        
        // Set initial description if option is already selected
        if (characterOption.choices && characterOption.choices[i] && characterOption.choices[i].value) {
            const selectedValue = characterOption.choices[i].value;
            // Handle feat descriptions
            if (modifier.type === 'feat' || modifier.type === 'originFeat') {
                const featData = gameData.feats.find(f => f.name === selectedValue);
                if (featData) {
                    descriptionEl.innerHTML = parseDescription(featData.description, 'charactercreator');
                }
            }
        }
        
        choiceEl.appendChild(selectEl);
        choiceEl.appendChild(descriptionEl);
        choicesContainer.appendChild(choiceEl);
    });
    
    container.parentElement.appendChild(choicesContainer);
}

/**
 * Handle choice selection within an option
 * @param {string} featureName - Name of the feature
 * @param {number} optionChoiceIndex - Index of the option choice
 * @param {number} choiceIndex - Index of the choice within the option
 * @param {string} type - Selected modifier type
 * @param {string} value - Selected modifier value
 * @param {string} source - Source type ('class', 'race', 'background')
 * @param {string} subsource - Subsource (e.g., 'subclass')
 */
function handleOptionChoiceSelection(featureName, optionChoiceIndex, choiceIndex, type, value, source = 'class', subsource = null) {
    const characterFeature = getCharacterFeature(featureName, source);
    if (!characterFeature) return;
    
    // Get the option data
    const characterOption = characterFeature.options[optionChoiceIndex];
    if (!characterOption) return;
    
    // Initialize choices array if needed
    if (!characterOption.choices) {
        characterOption.choices = [];
    }
    
    // Update the selected choice
    characterOption.choices[choiceIndex] = {
        type: type,
        value: value,
    } || null;
    
    // Update the choice description if its a Feat
    if (type === 'feat' || type === 'originFeat') {
        if (value == -1) {
            // Remove feat if deselected
            const featToRemove = characterData.feats.find(f => 
                f.source.feature === featureName && 
                f.source.optionChoiceIndex === optionChoiceIndex && 
                f.source.choiceIndex === choiceIndex
            );
            if (featToRemove) {
                removeFeat(featToRemove.source);
            }
        } else {
            const featData = gameData.feats.find(f => f.name === value);
            
            let characterFeat = characterData.feats.find(f => 
                f.source.feature === featureName && 
                f.source.optionChoiceIndex === optionChoiceIndex && 
                f.source.choiceIndex === choiceIndex
            );
            
            if (!characterFeat) {
                characterFeat = {
                    name: value,
                    source: {
                        type: source,
                        feature: featureName,
                        optionChoiceIndex: optionChoiceIndex,
                        choiceIndex: choiceIndex
                    },
                    modifiers: [],
                    options: []
                };
                characterData.feats.push(characterFeat);
            } else {
                // Update existing feat name if changed
                characterFeat.name = value;
            }
            
            const choiceEl = document.querySelector(`#cc-manager-feature-content-option-choice-${sanitizeFeatureName(featureName)}-${optionChoiceIndex}-${choiceIndex}`);
            
            if (featData && choiceEl) {
                generateFeature(featData, characterFeat, 'feats', null, choiceEl);
            } else if (choiceEl) {
                const existingFeature = choiceEl.querySelector('.cc-manager-feature');
                if (existingFeature) {
                    existingFeature.remove();
                }
            }
        }
    }
    
    // Update modifiers
    updateModifiers();

    updateProwesses();
    updateSpells();
}

/**
 * Handle option selection from a dropdown
 * @param {string} featureName - Name of the feature
 * @param {number} choiceIndex - Index of the choice
 * @param {string} optionName - Name of the selected option
 * @param {string} source - Source type ('class', 'race', 'background')
 */
function handleOptionSelection(featureName, choiceIndex, optionName, source = 'class', subsource = null) {
    const characterFeature = getCharacterFeature(featureName, source);
    if (!characterFeature) return;
    
    // Initialize options array if needed
    if (!characterFeature.options) {
        characterFeature.options = [];
    }
    
    // Update the selected option - store as object to support nested choices
    if (optionName) {
        // Initialize option object if it doesn't exist or if changing option
        if (!characterFeature.options[choiceIndex] || characterFeature.options[choiceIndex].optionName !== optionName) {
            characterFeature.options[choiceIndex] = {
                optionName: optionName,
                choices: []
            };
        }
    } else {
        // Clear option if deselected
        characterFeature.options[choiceIndex] = null;
    }
    
    // Update the description display
    const sanitizedName = sanitizeFeatureName(featureName);
    const descriptionEl = document.querySelector(`#cc-manager-feature-content-choice-description-${sanitizedName}-${choiceIndex}`);
    if (descriptionEl) {
        if (optionName) {
            const gameFeature = getGameFeature(featureName, source);
            if (gameFeature && gameFeature.options) {
                const selectedOption = gameFeature.options.find(o => o.name === optionName);
                if (selectedOption) {
                    descriptionEl.innerHTML = parseDescription(selectedOption.description, 'charactercreator');
                    
                    // Generate choices UI if the selected option has choice modifiers
                    generateOptionChoices(featureName, choiceIndex, selectedOption, characterFeature.options[choiceIndex], source, subsource, descriptionEl);
                }
            }
        } else {
            descriptionEl.innerHTML = '';
            // Remove any existing choice UI when option is deselected
            const choiceContainer = descriptionEl.parentElement.querySelector('.cc-manager-feature-content-option-choices');
            if (choiceContainer) {
                choiceContainer.remove();
            }
        }
    }
    
    // Update the summary to reflect selected count
    const featureEl = document.querySelector(`[data-feature-name="${featureName}"]`);
    if (featureEl) {
        const selectedCount = characterFeature.options.filter(o => {
            if (!o) return false;
            return typeof o === 'string' ? true : (o.optionName ? true : false);
        }).length;
        const gameFeature = getGameFeature(featureName, source);
        const choicesCount = gameFeature?.count || 1;
        const metaItem = featureEl.querySelector('.cc-manager-feature-summary-meta-item');
        if (metaItem && choicesCount > 0) {
            metaItem.textContent = `${selectedCount}/${choicesCount} Choices`;
        }
    }
    
    // Update modifiers
    updateModifiers();

    updateProwesses();
    updateSpells();
}

/**
 * Handle choice selection from a dropdown
 * @param {string} featureName - Name of the feature
 * @param {number} choiceIndex - Index of the choice
 * @param {string} type - Selected modifier type
 * @param {string} value - Selected modifier value
 * @param {string} source - Source type ('class', 'race', 'background')
 */
function handleChoiceSelection(featureName, choiceIndex, type, value, source = 'class') {
    
    const characterFeature = getCharacterFeature(featureName, source);
    if (!characterFeature) return;
    
    // Initialize modifiers array if needed
    if (!characterFeature.modifiers) {
        characterFeature.modifiers = [];
    }
    
    // Update the selected option
    characterFeature.modifiers[choiceIndex] = {
        type: type,
        value: value,
    } || null;
    
    // Update the choice description if its a Feat
    if (type === 'feat' || type === 'originFeat') {
        const featData = gameData.feats.find(f => f.name === value);

        let characterFeature = getCharacterFeature(featureName, 'feats');
        if (!characterFeature) {
            characterFeature = {
                name: value,
                source: {
                    type: source,
                    feature: featureName,
                    choiceIndex: choiceIndex
                },
                modifiers: [],  // For feat choices
                options: []      // If feat has options
            };
            if (value != -1) {
                characterData.feats.push(characterFeature);
            } else {
                removeFeat(characterFeature.source);
            }
        }

        const choiceEl = document.querySelector(`#cc-manager-feature-content-choice-${sanitizeFeatureName(featureName)}-${choiceIndex}`);
        
        if (featData) {
            generateFeature(featData, characterFeature, 'feats', null, choiceEl);
        } else {
            choiceEl.querySelector('.cc-manager-feature').remove();
        }
    }
    
    // Update the summary to reflect selected count
    const featureEl = document.querySelector(`[data-feature-name="${featureName}"]`);
    if (featureEl) {
        const selectedCount = characterFeature.modifiers.filter(m => m).length;
        const gameFeature = getGameFeature(featureName, source);
        const choiceModifiers = getChoiceModifiers(gameFeature);
        const choicesCount = choiceModifiers.length;
        const metaItem = featureEl.querySelector('.cc-manager-feature-summary-meta-item');
        if (metaItem && choicesCount > 0) {
            metaItem.textContent = `${selectedCount}/${choicesCount} Choices`;
        }
    }
    
    // Update modifiers
    updateModifiers();

    updateProwesses();
    updateSpells();
} 

function handleSubclassSelection(featureName, choiceIndex, subclassName, source = 'class') {
    console.log('handleSubclassSelection', featureName, choiceIndex, subclassName, source);
    const characterFeature = getCharacterFeature(featureName, source);
    if (!characterFeature) return;
    
    characterFeature.subclass.name = subclassName;

    characterData.class.subclass.name = subclassName;

    const featureEl = document.querySelector(`[data-feature-name="${featureName}"]`);
    if (featureEl) {
        const selectedCount = characterFeature.subclass?.name ? 1 : 0;
        const gameFeature = getGameFeature(featureName, source);
        const choicesCount = gameFeature.subclasses.length;
        const metaItem = featureEl.querySelector('.cc-manager-feature-summary-meta-item');
        if (metaItem && choicesCount > 0) {
            metaItem.textContent = `${selectedCount}/${choicesCount} Choices`;
        }
    }

    if (subclassName != -1) {
        initializeNewSubclassLevelFeatures(characterData.class.level);

        generateFeatures('class', 'subclass');
    } else {
        removeSubclass();
    }

    // Update modifiers
    updateModifiers();

    updateProwesses();
    updateSpells();
}

function removeSubclass() {
    characterData.class.subclass = {
        name: null
    };
    characterData.class.subclass.features = [];

    const builderTabEl = document.querySelector(`#cc-builder-tab-class-manage`);

    const featuresEl = builderTabEl.querySelectorAll('.cc-manager-feature');

    const classFeatures = characterData.class.features;
    
    featuresEl.forEach(featureEl => {
        const featureName = featureEl.dataset.featureName;
        if (!classFeatures.find(f => f.name === featureName)) {
            featureEl.remove();
        }
    });
}

function removeFeat(source) {
    const feat = characterData.feats.find(f => {
        if (f.source.feature !== source.feature) return false;
        // Handle both old format (choiceIndex) and new format (optionChoiceIndex + choiceIndex)
        if (source.choiceIndex !== undefined) {
            return f.source.choiceIndex === source.choiceIndex;
        } else if (source.optionChoiceIndex !== undefined && source.choiceIndex !== undefined) {
            return f.source.optionChoiceIndex === source.optionChoiceIndex && 
                   f.source.choiceIndex === source.choiceIndex;
        }
        return false;
    });
    if (feat) {
        characterData.feats.splice(characterData.feats.indexOf(feat), 1);
    }
}

function removeClass() {
    characterData.class = {
        name: null,
        level: 0,
        proficiencies: {
            skills: [],
        },
        features: [],
        prowesses: [],
        spells: {
            cantrips: [],
            spells: [],
        },
        subclass: {
            name: null,
            features: [],
        },
    };

    characterData.characterInfo.class = null;
    characterData.characterInfo.level = 0;

    document.querySelector('#cc-builder-tab-class-manage').classList.add('hidden');
    document.querySelector('#cc-builder-tab-class-choose').classList.remove('hidden');

    updateModifiers();

    updateProwesses();
    updateSpells();
}

function removeRace() {
    characterData.race = {
        name: null,
        features: [],
    };
    document.querySelector('#cc-builder-tab-race-manage').classList.add('hidden');
    document.querySelector('#cc-builder-tab-race-choose').classList.remove('hidden');

    updateModifiers();

    updateProwesses();
    updateSpells();
}

function removeBackground() {
    characterData.background = {
        name: null,
        features: [],
    };
    document.querySelector('#cc-builder-tab-background-manage').classList.add('hidden');
    document.querySelector('#cc-builder-tab-background-choose').classList.remove('hidden');

    updateModifiers();

    updateProwesses();
    updateSpells();
}
function handleAbilityModifierSelection(selectEl) {
    const ability = selectEl.getAttribute('ability');
    const value = selectEl.value;
    
    console.log('Ability modifier selected:', ability, value);
    
    characterData.abilities[ability].modifier = parseInt(value);

    updatePointBuy();
}

function updatePointBuy() {
    let points = 24;
    const pointCostMap = {
        "-1": 0,
        "0": 2,
        "1": 4,
        "2": 8,
    };

    for (const ability in characterData.abilities) {
        if (ability === 'features') continue;
        const selectionContainerEl = document.querySelector(`#cc-abilities-point-buy-selection-${ability}`);
        const totalEl = selectionContainerEl.querySelector('#cc-abilities-point-buy-selection-total');
        const selectEl = selectionContainerEl.querySelector(`#cc-abilities-point-buy-selection-${ability}-select`);
        
        points -= pointCostMap[characterData.abilities[ability].modifier];

        if (selectEl) {
            Object.values(selectEl.options).forEach(option => {
                const pointCost = pointCostMap[characterData.abilities[ability].modifier] - pointCostMap[parseInt(option.value)];
                const pointCostEl = option.querySelector(`#cc-abilities-point-buy-selection-cost`);
                if (pointCost === 0) {
                    pointCostEl.innerHTML = '';
                } else if (pointCost > 0) {
                    pointCostEl.innerHTML = `(+${pointCost})`;   
                } else {
                    pointCostEl.innerHTML = `(${pointCost})`;   
                }
            });
        }
        
        const total = characterData.abilities[ability].modifier + characterData.calculatedModifiers.abilityModifierIncrease[ability].bonus;
        if (total > 0) {
            totalEl.innerHTML = `Total: +${total}`;
        } else if (total == 0) {
            totalEl.innerHTML = `Total: ${total}`;
        } 
        else {
            totalEl.innerHTML = `Total: ${total}`;
        }
    }

    for (const ability in characterData.abilities) {
        if (ability === 'features') continue;
        const selectionContainerEl = document.querySelector(`#cc-abilities-point-buy-selection-${ability}`);
        const selectEl = selectionContainerEl.querySelector(`#cc-abilities-point-buy-selection-${ability}-select`);

        if (selectEl) {
            Object.values(selectEl.options).forEach(option => {
                const pointCost = pointCostMap[characterData.abilities[ability].modifier] - pointCostMap[parseInt(option.value)];
                if (Math.abs(pointCost) > points && pointCost < 0) {
                    option.classList.add('hidden');
                } else {
                    option.classList.remove('hidden');
                }
            });
        }
    }

    const pointBuyDisplayValueEl = document.querySelector('#cc-abilities-point-display-value');
    const pointBuyDisplayMaxEl = document.querySelector('#cc-abilities-point-display-max');
    pointBuyDisplayValueEl.textContent = points;
    pointBuyDisplayMaxEl.textContent = 24;
}

// ============================================================================
// MODIFIER PROCESSING & CALCULATION
// ============================================================================

/**
 * Extract modifiers from all selected options and update characterData.modifiers
 * Processes features from all sources: class, race, background
 */
function updateModifiers() {
    if (!gameData) return;
    
    // Clear existing modifiers
    characterData.modifiers = [];
    
    // Process features from all sources
    const sources = ['class', 'subclass', 'race', 'background', 'abilities'];
    
    sources.forEach(source => {
        let subsource = null;
        if (source === 'subclass') {
            source = 'class';
            subsource = 'subclass';
        }
        // Skip if source doesn't have a name (not selected)
        if (!characterData[source]?.name && source !== 'abilities') return;

        // Get game data for this source
        const sourceData = getGameFeatureData(source, subsource);
        if (!sourceData) return;
        
        // Process each feature from this source
        const features = subsource ? characterData[source][subsource].features : characterData[source]?.features || [];
        features.forEach(characterFeature => {
            const gameFeature = sourceData.features?.find(f => f.name === characterFeature.name);
            if (!gameFeature) return;
            
            // If feature has direct modifiers (not choices, not from options)
            if (gameFeature.modifiers && Array.isArray(gameFeature.modifiers)) {
                const directModifiers = gameFeature.modifiers.filter(modifier => 
                    modifier.subType !== 'choose' && !modifier.from && !featureHasOptions(gameFeature)
                );
                // Check both modifiers and directModifiers properties
                const modifiersToProcess = characterFeature.directModifiers || characterFeature.modifiers;
                if (directModifiers.length > 0 && modifiersToProcess) {
                    directModifiers.forEach(modifier => {
                        const modifierData = { ...modifier };
                        modifierData.source = {
                            source: source,
                            subsource: subsource,
                            feature: characterFeature.name,
                            option: null,
                        };
                        characterData.modifiers.push(modifierData);
                    });
                }
            }

            // If feature has choices, extract modifiers from selected choices
            if (featureHasChoices(gameFeature) && characterFeature.modifiers && Array.isArray(characterFeature.modifiers)) {
                const choiceModifiers = getChoiceModifiers(gameFeature);
                characterFeature.modifiers.forEach((selectedChoice, index) => {
                    if (!selectedChoice || index >= choiceModifiers.length) return;
                    
                    const choiceModifier = choiceModifiers[index];
                    if (!choiceModifier) return;
                    
                    // Find the selected value in the modifier's 'from' array
                    const selectedModifier = {
                        type: selectedChoice.type,
                        value: selectedChoice.value,
                        bonus: choiceModifier.bonus,
                        source: {
                            source: source,
                            subsource: subsource,
                            feature: characterFeature.name,
                            option: null,
                            modifierIndex: index,
                        }
                    };
                    if (selectedModifier.value != -1) {
                        characterData.modifiers.push(selectedModifier);
                    }
                });
            }
            
            // If feature has options, extract modifiers from selected options
            if (featureHasOptions(gameFeature) && characterFeature.options && Array.isArray(characterFeature.options)) {
                characterFeature.options.forEach((optionData, optionIndex) => {
                    if (!optionData) return;
                    
                    // Handle both old format (string) and new format (object)
                    const optionName = typeof optionData === 'string' ? optionData : optionData.optionName;
                    if (!optionName) return;
                    
                    const option = gameFeature.options.find(o => o.name === optionName);
                    if (option && option.modifiers) {
                        option.modifiers.forEach(modifier => {
                            // Skip choice modifiers - they're handled separately
                            if (modifier.subType === 'choose' || (modifier.from && Array.isArray(modifier.from))) {
                                return;
                            }
                            
                            // Direct modifiers from the option
                            const modifierData = { ...modifier };
                            modifierData.source = {
                                source: source,
                                subsource: subsource,
                                feature: characterFeature.name,
                                option: optionName,
                            };
                            if (modifierData.value != -1) {
                                characterData.modifiers.push(modifierData);
                            }
                        });
                        
                        // Process choices within the option
                        if (optionData.choices && Array.isArray(optionData.choices)) {
                            const choiceModifiers = option.modifiers.filter(mod => 
                                mod.subType === 'choose' || (mod.from && Array.isArray(mod.from))
                            );
                            
                            optionData.choices.forEach((selectedChoice, choiceIndex) => {
                                if (!selectedChoice || choiceIndex >= choiceModifiers.length) return;
                                
                                const choiceModifier = choiceModifiers[choiceIndex];
                                if (!choiceModifier) return;
                                
                                // Create modifier from the selected choice
                                const modifierData = {
                                    type: selectedChoice.type,
                                    value: selectedChoice.value,
                                    bonus: choiceModifier.bonus,
                                    source: {
                                        source: source,
                                        subsource: subsource,
                                        feature: characterFeature.name,
                                        option: optionName,
                                        choiceIndex: choiceIndex,
                                    }
                                };
                                if (modifierData.value != -1) {
                                    characterData.modifiers.push(modifierData);
                                }
                            });
                        }
                    }
                });
            }
        });
    });
    
    characterData.feats.forEach(feat => {
        const characterFeature = feat;
        const gameFeature = getGameFeatureData('feats').find(f => f.name === feat.name);
        if (gameFeature) {
            if (gameFeature.modifiers && Array.isArray(gameFeature.modifiers)) {
                const directModifiers = gameFeature.modifiers.filter(modifier => 
                    modifier.subType !== 'choose' && !modifier.from && !featureHasOptions(gameFeature)
                );
                directModifiers.forEach(modifier => {
                    const modifierData = { ...modifier };
                    modifierData.source = {
                        source: 'feats',
                        subsource: null,
                        feature: feat.name,
                        option: null,
                    };
                    if (modifierData.value != -1) {
                        characterData.modifiers.push(modifierData);
                    }
                });
            }
            // If feature has choices, extract modifiers from selected choices
            if (featureHasChoices(gameFeature) && characterFeature.modifiers && Array.isArray(characterFeature.modifiers)) {
                const choiceModifiers = getChoiceModifiers(gameFeature);
                characterFeature.modifiers.forEach((selectedChoice, index) => {
                    if (!selectedChoice || index >= choiceModifiers.length) return;
                    
                    const choiceModifier = choiceModifiers[index];
                    if (!choiceModifier) return;
                    
                    // Find the selected value in the modifier's 'from' array
                    const selectedModifier = {
                        type: selectedChoice.type,
                        value: selectedChoice.value,
                        bonus: choiceModifier.bonus,
                        source: {
                            source: 'feats',
                            subsource: null,
                            feature: characterFeature.name,
                            option: null,
                            modifierIndex: index,
                        }
                    };
                    if (selectedModifier.value != -1) {
                        characterData.modifiers.push(selectedModifier);
                    }
                });
            }
            
            // If feature has options, extract modifiers from selected options
            if (featureHasOptions(gameFeature) && characterFeature.options && Array.isArray(characterFeature.options)) {
                characterFeature.options.forEach((optionData, optionIndex) => {
                    if (!optionData) return;
                    
                    // Handle both old format (string) and new format (object)
                    const optionName = typeof optionData === 'string' ? optionData : optionData.optionName;
                    if (!optionName) return;
                    
                    const option = gameFeature.options.find(o => o.name === optionName);
                    if (option && option.modifiers) {
                        option.modifiers.forEach(modifier => {
                            // Skip choice modifiers - they're handled separately
                            if (modifier.subType === 'choose' || (modifier.from && Array.isArray(modifier.from))) {
                                return;
                            }
                            
                            // Direct modifiers from the option
                            const modifierData = { ...modifier };
                            modifierData.source = {
                                source: 'feats',
                                subsource: null,
                                feature: characterFeature.name,
                                option: optionName,
                            };
                            if (modifierData.value != -1) {
                                characterData.modifiers.push(modifierData);
                            }
                        });
                        
                        // Process choices within the option
                        if (optionData.choices && Array.isArray(optionData.choices)) {
                            const choiceModifiers = option.modifiers.filter(mod => 
                                mod.subType === 'choose' || (mod.from && Array.isArray(mod.from))
                            );
                            
                            optionData.choices.forEach((selectedChoice, choiceIndex) => {
                                if (!selectedChoice || choiceIndex >= choiceModifiers.length) return;
                                
                                const choiceModifier = choiceModifiers[choiceIndex];
                                if (!choiceModifier) return;
                                
                                // Create modifier from the selected choice
                                const modifierData = {
                                    type: selectedChoice.type,
                                    value: selectedChoice.value,
                                    bonus: choiceModifier.bonus,
                                    source: {
                                        source: 'feats',
                                        subsource: null,
                                        feature: characterFeature.name,
                                        option: optionName,
                                        choiceIndex: choiceIndex,
                                    }
                                };
                                if (modifierData.value != -1) {
                                    characterData.modifiers.push(modifierData);
                                }
                            });
                        }
                    }
                });
            }
        }
    });
    
    console.log('Updated modifiers:', characterData.modifiers);
    calculateFinalModifiers();
}

function updateProwesses() {
    if (!gameData) return;
    
    // Clear existing modifiers
    const characterProwesses = characterData.class.prowesses.filter(p => p.source.type !== "granted" || p.source.type !== "choose");
    
    // Process features from all sources
    const sources = ['class', 'race', 'background'];
    
    sources.forEach(source => {
        // Skip if source doesn't have a name (not selected)
        if (!characterData[source]?.name) return;
        
        // Get game data for this source
        const sourceData = getGameFeatureData(source);
        if (!sourceData) return;
        
        // Process each feature from this source
        const features = characterData[source]?.features || [];
        features.forEach(characterFeature => {
            const gameFeature = sourceData.features?.find(f => f.name === characterFeature.name);
            if (!gameFeature) return;

            if (!gameFeature.prowesses || !Array.isArray(gameFeature.prowesses)) { return; }

            const availableProwesses = gameFeature.prowesses.filter(prowess => prowess.grantedAtLevel <= characterData.characterInfo.level);
            
            // If feature has direct modifiers (not choices, not from options)
            if (availableProwesses && Array.isArray(availableProwesses)) {
                availableProwesses.filter(prowess => prowess.type !== 'choose').forEach(prowess => {
                    const prowessData = { 
                        name: prowess.name,
                        grantedAtLevel: prowess.grantedAtLevel,
                        countsAsKnown: prowess.countsAsKnown,
                        flipped: false,
                        source: {
                            source: source,
                            feature: characterFeature.name,
                            type: prowess.type,
                            option: null,
                        }
                     };
                    characterProwesses.push(prowessData);
                });
            }
        });

            // If feature has choices, extract modifiers from selected choices
            /*if (featureHasProwessChoices(gameFeature) && characterFeature.prowesses && Array.isArray(characterFeature.prowesses)) {
                const choiceProwesses = getProwessChoices(gameFeature);
                characterFeature.prowesses.forEach((selectedChoice, index) => {
                    if (!selectedChoice || index >= choiceProwesses.length) return;
                    
                    const choiceProwess = choiceProwesses[index];
                    if (!choiceProwess) return;
                    
                    // Find the selected value in the modifier's 'from' array
                    const selectedProwess = {
                        type: selectedProwess.type,
                        value: selectedProwess.value,
                        source: {
                            source: source,
                            feature: characterFeature.name,
                            option: null,
                            modifierIndex: index,
                        }
                    };
                    if (selectedModifier.value != -1) {
                        characterData.modifiers.push(selectedModifier);
                    }
                });
            }
            
            // If feature has options, extract modifiers from selected options
            if (featureHasOptions(gameFeature) && characterFeature.options && Array.isArray(characterFeature.options)) {
                characterFeature.options.forEach(optionName => {
                    if (!optionName) return;
                    
                    const option = gameFeature.options.find(o => o.name === optionName);
                    if (option && option.modifiers) {
                        option.modifiers.forEach(modifier => {
                            const modifierData = { ...modifier };
                            modifierData.source = {
                                source: source,
                                feature: characterFeature.name,
                                option: optionName,
                            };
                            if (modifierData.value != -1) {
                                characterData.modifiers.push(modifierData);
                            }
                        });
                    }
                }); 
            }
        }); */
    });
    
    characterData.feats.forEach(feat => {
        const characterFeature = feat;
        const gameFeature = getGameFeatureData('feats').find(f => f.name === feat.name);
        if (gameFeature && gameFeature.prowesses && Array.isArray(gameFeature.prowesses)) {
            if (gameFeature.modifiers && Array.isArray(gameFeature.modifiers)) {
                const directProwesses = gameFeature.prowesses.filter(prowess => prowess.type !== 'choose');
                directProwesses.forEach(prowess => {
                    const prowessData = { 
                        name: prowess.name,
                        grantedAtLevel: prowess.grantedAtLevel,
                        countsAsKnown: prowess.countsAsKnown,
                        flipped: false,
                        source: {
                            source: 'feats',
                            feature: feat.name,
                            type: prowess.type,
                            option: null,
                        }
                    };
                    characterProwesses.push(prowessData);
                });
            }
        }
    });
    console.log('Updated prowesses:', characterProwesses);
}

function updateSpells() {
    if (!gameData) return;
    
    // Clear existing spells that weren't learned from the class
    const characterSpells = characterData.class.spells.spells.filter(s => s.source.type !== "granted" || s.source.type !== "choose");
    const characterCantrips = characterData.class.spells.cantrips.filter(c => c.source.type !== "granted" || c.source.type !== "choose");
    
    // Process features from all sources
    const sources = ['class', 'subclass', 'race', 'background'];
    
    sources.forEach(source => {
        let subsource = null;
        if (source === 'subclass') {
            source = 'class';
            subsource = 'subclass';
        }
        // Skip if source doesn't have a name (not selected)
        if (!characterData[source]?.name) return;
        
        // Get game data for this source
        const sourceData = getGameFeatureData(source, subsource);
        if (!sourceData) return;
        
        // Process each feature from this source
        const features = subsource ? characterData[source][subsource].features : characterData[source]?.features || [];
        features.forEach(characterFeature => {
            const gameFeature = sourceData.features?.find(f => f.name === characterFeature.name);
            if (!gameFeature) return;

            if (!gameFeature.spells || !Array.isArray(gameFeature.spells)) { return; }

            const availableSpells = gameFeature.spells.filter(spell => spell.grantedAtLevel <= characterData.characterInfo.level).filter(spell => characterData.class.spells.spells.find(s => s.name === spell.name) === undefined && characterData.class.spells.cantrips.find(c => c.name === spell.name) === undefined);
            
            // If feature has direct modifiers (not choices, not from options)
            if (availableSpells && Array.isArray(availableSpells)) {
                availableSpells.filter(spell => spell.type !== 'choose').forEach(spell => {
                    const spellData = { 
                        name: spell.name,
                        isCantrip: spell.isCantrip || false,
                        grantedAtLevel: spell.grantedAtLevel,
                        alwaysPrepared: spell.alwaysPrepared,
                        countsAsKnown: spell.countsAsKnown,
                        flipped: false,
                        source: {
                            source: source,
                            subsource: subsource,
                            feature: characterFeature.name,
                            type: spell.type,
                            option: null,
                        }
                     };
                    if (spellData.isCantrip) {
                        characterCantrips.push(spellData);
                    } else {
                        characterSpells.push(spellData);
                    }
                });
            }
        });

            // If feature has choices, extract modifiers from selected choices
            /*if (featureHasProwessChoices(gameFeature) && characterFeature.prowesses && Array.isArray(characterFeature.prowesses)) {
                const choiceProwesses = getProwessChoices(gameFeature);
                characterFeature.prowesses.forEach((selectedChoice, index) => {
                    if (!selectedChoice || index >= choiceProwesses.length) return;
                    
                    const choiceProwess = choiceProwesses[index];
                    if (!choiceProwess) return;
                    
                    // Find the selected value in the modifier's 'from' array
                    const selectedProwess = {
                        type: selectedProwess.type,
                        value: selectedProwess.value,
                        source: {
                            source: source,
                            feature: characterFeature.name,
                            option: null,
                            modifierIndex: index,
                        }
                    };
                    if (selectedModifier.value != -1) {
                        characterData.modifiers.push(selectedModifier);
                    }
                });
            }
            
            // If feature has options, extract modifiers from selected options
            if (featureHasOptions(gameFeature) && characterFeature.options && Array.isArray(characterFeature.options)) {
                characterFeature.options.forEach(optionName => {
                    if (!optionName) return;
                    
                    const option = gameFeature.options.find(o => o.name === optionName);
                    if (option && option.modifiers) {
                        option.modifiers.forEach(modifier => {
                            const modifierData = { ...modifier };
                            modifierData.source = {
                                source: source,
                                feature: characterFeature.name,
                                option: optionName,
                            };
                            if (modifierData.value != -1) {
                                characterData.modifiers.push(modifierData);
                            }
                        });
                    }
                }); 
            }
        }); */

        characterData.class.spells.spells = characterSpells;
        characterData.class.spells.cantrips = characterCantrips;
    });
    
    characterData.feats.forEach(feat => {
        const characterFeature = feat;
        const gameFeature = getGameFeatureData('feats').find(f => f.name === feat.name);
        if (gameFeature && gameFeature.spells && Array.isArray(gameFeature.spells)) {
            if (gameFeature.modifiers && Array.isArray(gameFeature.modifiers)) {
                const directSpells = gameFeature.spells.filter(spell => spell.type !== 'choose');
                directSpells.forEach(spell => {
                    const spellData = { 
                        name: spell.name,
                        isCantrip: spell.isCantrip || false,
                        grantedAtLevel: spell.grantedAtLevel,
                        alwaysPrepared: spell.alwaysPrepared,
                        countsAsKnown: spell.countsAsKnown,
                        flipped: false,
                        source: {
                            source: 'feats',
                            feature: feat.name,
                            type: spell.type,
                            option: null,
                        }
                    };
                    if (spellData.isCantrip) {
                        characterCantrips.push(spellData);
                    } else {
                        characterSpells.push(spellData);
                    }
                });
            }
        }
    });
    console.log('Updated spells:', characterSpells);
}



/**
 * Get the default structure for calculatedModifiers
 * @returns {object} Default calculatedModifiers structure
 */
function getDefaultCalculatedModifiers() {
    return {
        abilityModifierIncrease: {
            strength: {
                bonus: 0,
            },
            dexterity: {
                bonus: 0,
            },
            constitution: {
                bonus: 0,
            },
            intelligence: {
                bonus: 0,
            },
            wisdom: {
                bonus: 0,
            },
            charisma: {
                bonus: 0,
            },
        },
        savingThrowIncrease: {
            fortitude: {
                bonus: 0,
            },
            reflex: {
                bonus: 0,
            },
            will: {
                bonus: 0,
            },
        },
        skillProficiency: {
            acrobatics: {
                proficient: false,
            },
            animalHandling: {
                proficient: false,
            },
            athletics: {
                proficient: false,
            },
            arcana: {
                proficient: false,
            },
            deception: {
                proficient: false,
            },
            history: {
                proficient: false,
            },
            insight: {
                proficient: false,
            },
            intimidation: {
                proficient: false,
            },
            investigation: {
                proficient: false,  
            },
            medicine: {
                proficient: false,
            },
            nature: {
                proficient: false,
            },
            perception: {
                proficient: false,
            },
            performance: {
                proficient: false,
            },
            persuasion: {
                proficient: false,
            },
            religion: {
                proficient: false,
            },
            sleightOfHand: {
                proficient: false,
            },
            stealth: {
                proficient: false,
            },
            survival: {
                proficient: false,
            },
        },
        skillExpertise: {
            acrobatics: {
                expertise: false,
            },
            animalHandling: {
                expertise: false,
            },
            athletics: {
                expertise: false,
            },
            arcana: {
                expertise: false,
            },
            deception: {
                expertise: false,
            },
            history: {
                expertise: false,
            },
            insight: {
                expertise: false,
            },
            intimidation: {
                expertise: false,
            },
            investigation: {
                expertise: false,  
            },
            medicine: {
                expertise: false,
            },
            nature: {
                expertise: false,
            },
            perception: {
                expertise: false,
            },
            performance: {
                expertise: false,
            },
            persuasion: {
                expertise: false,
            },
            religion: {
                expertise: false,
            },
            sleightOfHand: {
                expertise: false,
            },
            stealth: {
                expertise: false,
            },
            survival: {
                expertise: false,
            },
        },
        toolProficiency: [],
        armorProficiency: {
            lightArmor: {
                proficient: false,
            },
            mediumArmor: {
                proficient: false,
            },
            heavyArmor: {
                proficient: false,
            },
            shields: {
                proficient: false,
            }
        },
        weaponProficiency: {
            simpleWeapons: {
                proficient: false,
            },
            martialWeapons: {
                proficient: false,
            },
            club: {
                proficient: false,
            },
            dagger: {
                proficient: false,
            },
            greatclub: {
                proficient: false,
            },
            handaxe: {
                proficient: false,
            },
            javelin: {
                proficient: false,
            },
            lightHammer: {
                proficient: false,
            },
            mace: {
                proficient: false,
            },
            quarterstaff: {
                proficient: false,
            },
            sickle: {
                proficient: false,
            },
            spear: {
                proficient: false,
            },
            crossbowLight: {
                proficient: false,
            },
            dart: {
                proficient: false,
            },
            shortbow: {
                proficient: false,
            },
            sling: {
                proficient: false,
            },
            battleaxe: {
                proficient: false,
            },
            flail: {
                proficient: false,
            },
            glaive: {
                proficient: false,
            },
            greataxe: {
                proficient: false,
            },
            greatsword: {
                proficient: false,
            },
            halberd: {
                proficient: false,
            },
            lance: {
                proficient: false,
            },
            longsword: {
                proficient: false,
            },
            maul: {
                proficient: false,
            },
            morningstar: {
                proficient: false,
            },
            pike: {
                proficient: false,
            },
            rapier: {
                proficient: false,
            },
            scimitar: {
                proficient: false,
            },
            shortsword: {
                proficient: false,
            },
            trident: {
                proficient: false,
            },
            warpick: {
                proficient: false,
            },
            warhammer: {
                proficient: false,
            },
            whip: {
                proficient: false,
            },
            blowgun: {
                proficient: false,
            },
            crossbowHand: {
                proficient: false,
            },
            crossbowHeavy: {
                proficient: false,
            },
            longbow: {
                proficient: false,
            },
            net: {
                proficient: false,
            },
        },
        rangedWeaponAttack: {
            bonus: 0,
        },
        meleeWeaponAttack: {
            bonus: 0,
        },
        bonusStressSlots: {
            bonus: 0,
        },
        bonusInitiative: {
            bonus: 0,
        },
        innateAbsorb: {
            bonus: 0,
        },
        armorAbsorb: {
            bonus: 0,
        },
        oneHandedMeleeWeaponDamage: {
            bonus: 0,
        },
        language: [],
        feat: [],
    };
}

function calculateFinalModifiers() {
    debugger;
    // Reset calculatedModifiers to default structure
    characterData.calculatedModifiers = getDefaultCalculatedModifiers();
    
    const finalModifiers = characterData.calculatedModifiers;
    const modifiers = characterData.modifiers;

    
    Object.values(modifiers).forEach(modifier => {
        const type = modifier.type;
        const value = toCamelCase(modifier.value);
        const bonus = modifier.bonus;

        console.log('modifier', modifier);

        if (type === 'feat' || type === 'originFeat') {
            finalModifiers.feat.push(modifier.value);
            return;
        }

        const finalModifier = finalModifiers[type];
        if (value && finalModifier[value]) {
            if (type.toLowerCase().includes('proficiency')) {
                finalModifier[value].proficient = true;
            } else if (type.toLowerCase().includes('expertise')) {
                finalModifier[value].expertise = true;
            } else if (bonus) {
                finalModifier[value].bonus += bonus
            }
        } else if (value) {
            finalModifier.push(value);
        } else if (bonus) {
            finalModifier.bonus += bonus;
        }
    });

    const feats = [];
    characterData.feats.forEach(feat => {
        if (finalModifiers.feat.includes(feat.name)) {
            feats.push(feat);
        }
    });
    characterData.feats = feats;

    console.log('Final modifiers:', characterData.calculatedModifiers);

    updatePointBuy();
}

// ============================================================================
// EQUIPMENT MANAGEMENT
// ============================================================================

function generateEquipment() {
    
    debugger;
    if (!characterData.class.name) return;

    if (!characterData.background.name) return;

    const classEquipment = getGameFeatureData('class').startingEquipment;
    const backgroundEquipment = getGameFeatureData('background').startingEquipment;

    const classEquipmentSelectionsEl = document.querySelector('#cc-equipment-class .cc-equipment-selections');
    classEquipmentSelectionsEl.innerHTML = '';

    const backgroundEquipmentSelectionsEl = document.querySelector('#cc-equipment-background .cc-equipment-selections');
    backgroundEquipmentSelectionsEl.innerHTML = '';

    classEquipment.forEach((equipment, index) => {

        const equipmentSelectionEl = generateEquipmentSelection(equipment, index, 'class');

        classEquipmentSelectionsEl.appendChild(equipmentSelectionEl);
    });

    backgroundEquipment.forEach((equipment, index) => {

        const equipmentSelectionEl = generateEquipmentSelection(equipment, index, 'background');

        backgroundEquipmentSelectionsEl.appendChild(equipmentSelectionEl);
    });
}

function generateEquipmentSelection(equipment, selectionIndex, source) {
    const equipmentSelectionEl = document.createElement('div');
    equipmentSelectionEl.classList.add('cc-equipment-selection');
    equipmentSelectionEl.id = `cc-equipment-selection-${source}-${selectionIndex}`;
    equipmentSelectionEl.dataset.source = source;
    equipmentSelectionEl.dataset.selectionIndex = selectionIndex;
    equipmentSelections[source][selectionIndex] = {};
    Object.keys(equipment).forEach((key, optionIndex) => {
        const equipmentOption = equipment[key];
        const equipmentOptionEl = document.createElement('div');
        equipmentOptionEl.classList.add('cc-equipment-option');
        equipmentOptionEl.id = `cc-equipment-option-${source}-${selectionIndex}-${optionIndex}`;
        equipmentOptionEl.dataset.source = source;
        equipmentOptionEl.dataset.selectionIndex = selectionIndex;
        equipmentOptionEl.dataset.optionIndex = optionIndex;

        const equipmentOptionInfoEl = document.createElement('div');
        equipmentOptionInfoEl.classList.add('cc-equipment-option-info');


        const equipmentOptionCheckboxEl = document.createElement('input');
        equipmentOptionCheckboxEl.type = 'checkbox';
        equipmentOptionCheckboxEl.classList.add('cc-equipment-option-checkbox');
        equipmentOptionCheckboxEl.onchange = () => selectEquipmentOption(equipmentSelectionEl.id, optionIndex);
        equipmentOptionInfoEl.appendChild(equipmentOptionCheckboxEl);

        const equipmentOptionDescriptionEl = document.createElement('div');
        equipmentOptionDescriptionEl.classList.add('cc-equipment-option-description');
        equipmentOptionDescriptionEl.innerHTML = parseDescription(equipmentOption.description);
        equipmentOptionInfoEl.appendChild(equipmentOptionDescriptionEl);
        equipmentOptionEl.appendChild(equipmentOptionInfoEl);

        if (equipmentOption.items) {
            const itemSelectorsEl = document.createElement('div');
            itemSelectorsEl.classList.add('cc-equipment-item-selectors', 'hidden');
            
            equipmentOption.items.forEach((item, itemSelectIndex) => {
                if (item.type === 'choose') {
                    
                    const itemSelectEl = document.createElement('select');
                    itemSelectEl.classList.add('cc-equipment-item-select');
                    itemSelectEl.id = `cc-equipment-item-select-${source}-${selectionIndex}-${optionIndex}-${itemSelectIndex}`;
                    itemSelectEl.dataset.source = source;
                    itemSelectEl.dataset.itemSelectIndex = itemSelectIndex;
                    itemSelectEl.dataset.selectionIndex = selectionIndex;
                    itemSelectEl.dataset.optionIndex = optionIndex;

                    if (item.subType === 'category') { 
                        const category = item.category;
                        const subCategory = item.subCategory;
                        let items = gameData.items[category];
                        if (subCategory === 'all') {
                            const tempItems = [];
                            Object.keys(items).forEach(key => {
                                items[key].forEach(item => {
                                    tempItems.push(item);
                                });
                            });
                            items = tempItems;
                        } else if (subCategory) {
                            const tempItems = [];
                            subCategory.forEach(subCategoryItem => {
                                items[subCategoryItem].forEach(item => {
                                    tempItems.push(item);
                                });
                            });
                            items = tempItems;  
                        }
                        const optionEl = document.createElement('option');
                        optionEl.value = -1;
                        optionEl.textContent = 'Choose an option';
                        itemSelectEl.appendChild(optionEl);
                        console.log("Items: ", items);
                        items.forEach(item => {
                            const optionEl = document.createElement('option');
                            optionEl.value = item.id;
                            optionEl.textContent = item.name;
                            itemSelectEl.appendChild(optionEl);
                        });
                    }


                    
                    itemSelectEl.onchange = () => handleEquipmentOptionSelection(itemSelectEl);
                    
                    itemSelectorsEl.appendChild(itemSelectEl);
                }
            });
            equipmentOptionEl.appendChild(itemSelectorsEl);
        }



        equipmentSelectionEl.appendChild(equipmentOptionEl);
    });
    return equipmentSelectionEl;
}

function selectEquipmentOption(selectionId, optionIndex) {
    const equipmentSelectionEl = document.getElementById(selectionId);
    console.log('equipmentSelectionEl', equipmentSelectionEl);
    if (!equipmentSelectionEl) return;

    const equipmentOptionsEls = equipmentSelectionEl.querySelectorAll('.cc-equipment-option');
    equipmentOptionsEls.forEach((equipmentOptionEl, index) => {
        const itemSelectorsEl = equipmentOptionEl.querySelector('.cc-equipment-item-selectors');
        const equipmentOptionCheckboxEl = equipmentOptionEl.querySelector('.cc-equipment-option-checkbox');

        if (index === optionIndex && equipmentOptionCheckboxEl.checked) {    
            equipmentOptionEl.dataset.selected = true;
            equipmentOptionCheckboxEl.checked = true;
            itemSelectorsEl.classList.remove('hidden');

            const source = equipmentOptionEl.dataset.source;
            const selectionIndex = equipmentOptionEl.dataset.selectionIndex;
            const optionIndex = equipmentOptionEl.dataset.optionIndex;
            equipmentSelections[source][selectionIndex][optionIndex] = [];
        } else {
            equipmentOptionEl.dataset.selected = false;
            equipmentOptionCheckboxEl.checked = false;
            itemSelectorsEl.classList.add('hidden');

            const source = equipmentOptionEl.dataset.source;
            const selectionIndex = equipmentOptionEl.dataset.selectionIndex;
            const optionIndex = equipmentOptionEl.dataset.optionIndex;
            delete equipmentSelections[source][selectionIndex][optionIndex];
            
            const selectEls = equipmentOptionEl.querySelectorAll('.cc-equipment-item-select');
            selectEls.forEach(selectEl => {
                selectEl.value = -1;
            });
        }
    });
}

function handleEquipmentOptionSelection(itemSelectEl) {
    const itemSelectValue = itemSelectEl.value;
    const source = itemSelectEl.dataset.source;
    const itemSelectIndex = itemSelectEl.dataset.itemSelectIndex;
    const selectionIndex = itemSelectEl.dataset.selectionIndex;
    const optionIndex = itemSelectEl.dataset.optionIndex;

    equipmentSelections[source][selectionIndex][optionIndex][itemSelectIndex] = itemSelectValue;

    console.log('equipmentSelections', equipmentSelections);
}

function clearInventory() {
    characterData.inventory = {
        equipment: [],
        items: [],
        currency: {
            copper: 0,
            gold: 0,
            silver: 0,
            platinum: 0,
        },
    };
}

function addStartingEquipment() {
    const classStartingEquipment = getGameFeatureData('class').startingEquipment;
    const backgroundStartingEquipment = getGameFeatureData('background').startingEquipment;
    
    console.log('classStartingEquipment', classStartingEquipment);
    console.log('backgroundStartingEquipment', backgroundStartingEquipment);
    console.log('equipmentSelections', equipmentSelections);

    let source = 'class';

    Object.values(classStartingEquipment).forEach((selection, selectionIndex) => {
        Object.values(selection).forEach((option, optionIndex) => {
            option.items.forEach((item, itemIndex) => {
                if (item.type === 'choose') {
                    const itemId = equipmentSelections?.[source]?.[selectionIndex]?.[optionIndex]?.[itemIndex];
                    if (itemId) {
                        const itemData = getGameItem(itemId);
                        const i = {
                            id: itemId,
                            name: itemData.name,
                            equipment: itemData.equipment,
                            quantity: item.quantity? item.quantity : 1,
                            equipped: false,
                        }
                        if (i.equipment) {
                            characterData.inventory.equipment.push(i);
                        } else {
                            characterData.inventory.items.push(i);
                        }
                    }
                } else if (item.type === 'granted') {
                    const itemId = item.value;
                    const isSelected = equipmentSelections?.[source]?.[selectionIndex]?.[optionIndex];
                    if (isSelected) {
                        if (itemId === 'gold') {
                            characterData.inventory.currency.gold += item.quantity;
                        } else if (itemId === 'silver') {
                            characterData.inventory.currency.silver += item.quantity;
                        } else if (itemId === 'copper') {
                            characterData.inventory.currency.copper += item.quantity;
                        } else if (itemId === 'platinum') {
                            characterData.inventory.currency.platinum += item.quantity;
                        } else if (itemId) {
                            const itemData = getGameItem(itemId);
                            let i = null;
                            if (itemData) {
                                i = {
                                    id: itemId,
                                    name: itemData.name,
                                    equipment: itemData.equipment,
                                    equipped: false,
                                }
                            } else {
                                i = {
                                    id: itemId,
                                    name: itemId,
                                    equipment: false,
                                    equipped: false,
                                }
                            }
                            if (i.equipment) {
                                characterData.inventory.equipment.push(i);
                            } else {
                                characterData.inventory.items.push(i);
                            }
                        }
                    }
                }
            });
        });
    });

    source = 'background';

    Object.values(backgroundStartingEquipment).forEach((selection, selectionIndex) => {
        Object.values(selection).forEach((option, optionIndex) => {
            option.items.forEach((item, itemIndex) => {
                if (item.type === 'choose') {
                    const itemId = equipmentSelections?.[source]?.[selectionIndex]?.[optionIndex]?.[itemIndex];
                    if (itemId) {
                        const itemData = getGameItem(itemId);
                        const i = {
                            id: itemId,
                            name: itemData.name,
                            equipment: itemData.equipment,
                            quantity: item.quantity? item.quantity : 1,
                            equipped: false,
                        }
                        if (i.equipment) {
                            characterData.inventory.equipment.push(i);
                        } else {
                            characterData.inventory.items.push(i);
                        }
                    }
                } else if (item.type === 'granted') {
                    const itemId = item.value;
                    const isSelected = equipmentSelections?.[source]?.[selectionIndex]?.[optionIndex];
                    if (isSelected) {
                        if (itemId === 'gold') {
                            characterData.inventory.currency.gold += item.quantity;
                        } else if (itemId === 'silver') {
                            characterData.inventory.currency.silver += item.quantity;
                        } else if (itemId === 'copper') {
                            characterData.inventory.currency.copper += item.quantity;
                        } else if (itemId === 'platinum') {
                            characterData.inventory.currency.platinum += item.quantity;
                        } else if (itemId) {
                            const itemData = getGameItem(itemId);
                            let i = null;
                            if (itemData) {
                                i = {
                                    id: itemId,
                                    name: itemData.name,
                                    equipment: itemData.equipment,
                                    quantity: item.quantity? item.quantity : 1,
                                    equipped: false,
                                }
                            } else {
                                i = {
                                    id: itemId,
                                    name: itemId,
                                    equipment: false,
                                    quantity: item.quantity? item.quantity : 1,
                                    equipped: false,
                                }
                            }
                            if (i.equipment) {
                                characterData.inventory.equipment.push(i);
                            } else {
                                characterData.inventory.items.push(i);
                            }
                        }
                    }
                }
            });
        });
    });
    console.log('characterData.inventory', characterData.inventory);
}

// ============================================================================
// LEVEL MANAGEMENT
// ============================================================================

function handleClassLevelChange(selectEl) {
    const newLevel = selectEl.value;
    changeClassLevel(newLevel);
}

function changeClassLevel(level) {
    
    const levelUp = level > characterData.class.level;
    const difference = level - characterData.class.level;

    characterData.class.level = level;
    characterData.characterInfo.level = level;

    const levelDisplayEl = document.querySelector('#cc-character-level');
    levelDisplayEl.textContent = level;

    const vitals = characterData.vitals;
    vitals.hitPoints.rolledHP += vitals.hitPoints.fixed * difference;

    if (levelUp) {

        initializeNewClassLevelFeatures(level);
        initializeNewSubclassLevelFeatures(level);
        generateFeatures('class');
        generateProwesses();
        generateSpells();
    } else {
        removeClassLevelFeatures(level);
        removeSubclassLevelFeatures(level);
        generateFeatures('class');
        generateProwesses();
        generateSpells();
    }
    generateSpellSlots();
}

function initializeNewClassLevelFeatures(level) {
    const classData = getGameFeatureData('class');
    
    const availableFeatures = classData.features.filter(f => f.level <= level);
    
    // Initialize features - auto-detect options and choices
    availableFeatures.forEach(feature => {
        if (characterData.class.features.find(f => f.name === feature.name)) return;
        const characterFeature = {
            name: feature.name,
        };
        
        // If feature has options, initialize options array
        if (featureHasOptions(feature)) {
            characterFeature.options = [];
        }
        
        // If feature has choices, initialize modifiers array for storing selections
        if (featureHasChoices(feature)) {
            // Initialize as empty array for storing selected choices
            characterFeature.modifiers = [];
        }

        if (feature.type === 'subclass') {
            characterFeature.subclass = {
                name: null,
            };
        }
        
        characterData.class.features.push(characterFeature);
    });
}

function initializeNewSubclassLevelFeatures(level) {
    const subclassData = getGameFeatureData('class','subclass');

    if (!subclassData) return;
    
    const availableFeatures = subclassData.features.filter(f => f.level <= level);
    
    // Initialize features - auto-detect options and choices
    availableFeatures.forEach(feature => {
        if (characterData.class.subclass.features.find(f => f.name === feature.name)) return;
        const characterFeature = {
            name: feature.name,
        };
        
        // If feature has options, initialize options array
        if (featureHasOptions(feature)) {
            characterFeature.options = [];
        }
        
        // If feature has choices, initialize modifiers array for storing selections
        if (featureHasChoices(feature)) {
            // Initialize as empty array for storing selected choices
            characterFeature.modifiers = [];
        }
        
        characterData.class.subclass.features.push(characterFeature);
    });
}

function removeClassLevelFeatures(level) {
    const classData = getGameFeatureData('class');
    if (!classData) return;
    
    // Filter out features that are above the specified level
    // Need to look up the game feature to get its level property
    characterData.class.features = characterData.class.features.filter(characterFeature => {
        const featureData = classData.features.find(f => f.name === characterFeature.name);
        if (!featureData) return false; // Keep if game feature not found (safety)
        return featureData.level <= level;
    });

    const characterProwessInfo = getCharacterProwessInfo(level, classData.prowessInfo.prowessGrowthRate);
    const characterSpellInfo = getCharacterSpellInfo(level, classData.spellInfo.spellGrowthRate);

    if (characterData.class.prowesses) {
        characterData.class.prowesses = characterData.class.prowesses.filter(prowess => {
            
            const prowessData = gameData.prowesses.find(p => p.name === prowess.name);
            if (!prowessData) return false; // Keep if game prowess not found (safety)
            console.log('prowessData', prowessData);
            console.log('characterProwessInfo.maximumProwessLevel', characterProwessInfo.maximumProwessLevel);
            return prowessData.level <= characterProwessInfo.maximumProwessLevel;
        });
    }

    if (characterData.class.spells.spells) {
        characterData.class.spells = characterData.class.spells.filter(spell => {
            const spellData = gameData.spells.find(s => s.name === spell.name);
            if (!spellData) return false; // Keep if game spell not found (safety)
            return spellData.level <= characterSpellInfo.maximumSpellLevel;
        });
    }
    
    // Modifiers will be automatically removed when updateModifiers() is called
    // (which happens in generateFeatures('class') after this function)
}

function removeSubclassLevelFeatures(level) {
    const subclassData = getGameFeatureData('class','subclass');
    if (!subclassData) return;
    
    // Filter out features that are above the specified level
    // Need to look up the game feature to get its level property
    characterData.class.subclass.features = characterData.class.subclass.features.filter(characterFeature => {
        const featureData = subclassData.features.find(f => f.name === characterFeature.name);
        if (!featureData) return false; // Keep if game feature not found (safety)
        return featureData.level <= level;
    });
}
// ============================================================================
// EVENT HANDLERS & LISTENERS
// ============================================================================

function showSection(sectionButton) {
    if (sectionButton.dataset.section === 'equipment') {
        generateEquipment();
    }

    if (currentSection) {
        currentSection.classList.remove('active');
    }
    
    const sectionEl = document.querySelector(`#cc-builder-tab-${sectionButton.dataset.section}`);
    sectionEl.classList.add('active');
    
    currentSection = sectionEl;
}

window.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded');

    const urlParams = new URLSearchParams(window.location.search);
    const hexId = urlParams.get('hexId');
    
    // Load character data (will use hexId from URL if present)
    loadCharacterBuilderData(hexId);
    
    currentSection = document.querySelector('#cc-builder-tab-class');
    
    const content = document.querySelector('#content-container');
    if (content) {
        content.classList.remove('content-loading');
    }
});