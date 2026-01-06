// Character Sheet Data Loader and Populator
// Loads character data from JSON and generates the HTML character sheet
//
// To use game data (classes, races, backgrounds, feats):
// 1. Include data-loader.js in your HTML: <script src="/dnd/A&F/data-loader.js"></script>
// 2. Load game data after loading character data:
//    const gameData = await loadCharacterGameData(characterData);
// 3. Use gameData to populate static information (proficiencies, features, etc.)

let characterData = null;
let gameData = null;

// Debounce timer for auto-saving
let saveTimeout = null;

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

// Load character data from JSON file
async function loadCharacterData(hexId=null) {
    console.log('Loading character data...');
    try {
        if (hexId) {
            const characterDataString = localStorage.getItem(`characterData-${hexId}`);
            if (characterDataString) {
                characterData = JSON.parse(characterDataString);
            } else {
                console.error('Character data not found for hex id:', hexId);
                return;
            }
        } else {
            const response = await fetch('/dnd/A&F/characterdatatemplate.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            characterData = await response.json();
            hexId = characterData.hexId;
        }

        console.log('Character data loaded:', characterData);

        // Wrap characterData in a deep proxy for auto-saving
        // This intercepts ALL property changes, even nested ones
        characterData = createDeepProxy(characterData, debouncedSave);

        // Optionally load game data (classes, races, backgrounds, feats)
        // Uncomment the following lines once data-loader.js is included:
        if (typeof loadCharacterGameData !== 'undefined') {
            gameData = await loadCharacterGameData(characterData);
            console.log('Game data loaded:', gameData);
        }
        
        generateCharacterSheet();

        document.querySelector('.cs').classList.remove('hidden');
    } catch (error) {
        console.error('Error loading character data:', error);
    }
}

function saveCharacter() {
    console.log('Saving character...');
    console.log('Character data:', characterData);

    const characterDataString = JSON.stringify(characterData);
    const hexId = characterData.hexId;
    localStorage.setItem(`characterData-${hexId}`, characterDataString);

    let characterHexIds = localStorage.getItem('characterHexIds');
    if (characterHexIds) {
        characterHexIds = JSON.parse(characterHexIds);
        if (!characterHexIds.includes(hexId)) {
            characterHexIds.push(hexId);
        }
    } else {
        characterHexIds = [hexId];
    }
    localStorage.setItem('characterHexIds', JSON.stringify(characterHexIds));
}

// Format modifier with + sign
function formatModifier(modifier) {
    return modifier >= 0 ? `+${modifier}` : `${modifier}`;
}

// Calculate proficiency bonus from level
function getProficiencyBonus(level=null) {
    if (level === null) {
        level = characterData.characterInfo?.level || 1;
    }
    const proficiencyBonus = Math.ceil(level / 4) + 1;
    return proficiencyBonus;
}

// Get ability modifier
function getAbilityModifier(abilityName) {
    const ability = characterData.abilities?.[abilityName.toLowerCase()];
    if (!ability) return 0;
    let modifier = ability.modifier || 0;
    modifier += characterData.calculatedModifiers.abilityModifierIncrease[abilityName].bonus;
    return modifier;
}

function showSection(sectionId) {
    const sections = document.querySelectorAll('.cs-section');
    sections.forEach(section => {
        if (section.id === `cs-${sectionId}`) {
            section.classList.add('active');
        }
        else {
            section.classList.remove('active');
        }
    });
}

function toTitleCase(string) {
    return string.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

// generate all character sheet fields
function generateCharacterSheet() {
    if (!characterData) return;

    // Character Info
    generateCharacterInfo();
    
    // Abilities
    generateAbilities();
    
    // Combat Stats
    generateCombatStats();
    
    // Saving Throws
    generateSavingThrows();
    
    // Skills
    generateSkills();
    
    // Senses & Movement
    generateSensesAndMovement();
    
    // Defenses & Conditions
    generateDefensesAndConditions();
    
    // Proficiencies
    generateProficiencies();
    
    // Attacks
    generateAttacks();

    // Generate Universal Actions
    generateUniversalActions();
    
    // Prowesses
    generateProwesses();

    // Features
    generateFeatures();

    // Check Features Columns
    checkFeatureColumns();

    // Check Prowesses/Spells Columns
    checkProwessesSpellsColumns();

    // Inventory
    generateInventory();
}
    
// generate character info section
function generateCharacterInfo() {
    const nameEl = document.querySelector('.cs-character-name');
    if (nameEl && characterData.characterInfo) {
        nameEl.textContent = characterData.characterInfo.name || 'Character Name';
    }

    const classEl = document.querySelector('#cs-character-class');
    const levelEl = document.querySelector('#cs-character-level');
    const raceEl = document.querySelector('#cs-character-race');

    if (classEl && characterData.class) {
        classEl.textContent = characterData.class.name || 'Class';
    }
    if (levelEl && characterData.characterInfo) {
        levelEl.textContent = characterData.characterInfo.level || 'Level';
    }
    if (raceEl && characterData.race) {
        raceEl.textContent = characterData.race.name || 'Race';
    }
}

// generate ability scores
function generateAbilities() {
    const abilities = characterData.abilities;
    if (!abilities) return;

    const abilityMap = {
        'strength': abilities.strength,
        'dexterity': abilities.dexterity,
        'constitution': abilities.constitution,
        'intelligence': abilities.intelligence,
        'wisdom': abilities.wisdom,
        'charisma': abilities.charisma
    };

    const abilityElements = document.querySelectorAll('#cs-abilities .cs-trait');
    abilityElements.forEach((trait, index) => {
        const abilityName = trait.getAttribute('data-ability');
        if (abilityName && abilityMap[abilityName]) {
            const modifier = getAbilityModifier(abilityName);
            const valueEl = trait.querySelector('.cs-value');
            if (valueEl) {
                valueEl.textContent = formatModifier(modifier);
            }
        }
    });
}

// generate combat stats
function generateCombatStats() {
    const vitals = characterData.vitals;
    const coreTraits = characterData.coreTraits;
    const level = characterData.characterInfo?.level || 1;

    // Hit Points
    const hpCurrentEl = document.querySelector('#cs-hp-current .cs-value');
    const hpMaxEl = document.querySelector('#cs-hp-max .cs-value');

    const maxHP = getMaxHitPoints();
    const currentHP = vitals.hitPoints.current !== -1 ? vitals.hitPoints.current : maxHP;

    vitals.hitPoints.current = currentHP;
    vitals.hitPoints.max = maxHP;

    if (hpCurrentEl && vitals?.hitPoints) {
        hpCurrentEl.textContent = currentHP || 10;
    }
    if (hpMaxEl && vitals?.hitPoints) {
        hpMaxEl.textContent = maxHP || 10;
    }

    // Armor Class
    const acTrait = Array.from(document.querySelectorAll('#cs-core-traits .cs-trait')).find(
        trait => trait.querySelector('.cs-trait-name')?.textContent.trim() === 'Armor'
    );
    if (acTrait && coreTraits) {
        const valueEl = acTrait.querySelector('.cs-value');
        if (valueEl) valueEl.textContent = getArmorClass() || 10;
    }

    // Initiative
    const initTrait = Array.from(document.querySelectorAll('#cs-core-traits .cs-trait')).find(
        trait => trait.querySelector('.cs-trait-name')?.textContent.trim() === 'Initiative'
    );
    if (initTrait && coreTraits) {
        const valueEl = initTrait.querySelector('.cs-value');
        if (valueEl) valueEl.textContent = formatModifier(getInitiative());
    }

    // Absorb
    const absorbTrait = Array.from(document.querySelectorAll('#cs-core-traits .cs-trait')).find(
        trait => trait.querySelector('.cs-trait-name')?.textContent.trim() === 'Absorb'
    );
    if (absorbTrait && coreTraits) {
        const valueEl = absorbTrait.querySelector('.cs-value');
        if (valueEl) valueEl.textContent = getAbsorb().totalAbsorb;
    }

    // Proficiency Bonus
    const profTrait = Array.from(document.querySelectorAll('#cs-initiative-inspiration .cs-trait')).find(
        trait => trait.querySelector('.cs-trait-name')?.textContent.trim() === 'Proficiency'
    );
    if (profTrait) {
        const valueEl = profTrait.querySelector('.cs-value');
        if (valueEl) {
            const profBonus = getProficiencyBonus(level);
            valueEl.textContent = formatModifier(profBonus);
        }
    }

    // Stress Slots
    if (vitals?.stressSlots) {
        generateStressSlots(vitals.stressSlots);
    }

    // Heroic Inspiration
    if (coreTraits) {
        generateHeroicInspiration(coreTraits.heroicInspiration);
    }
}

function getMaxHitPoints() {
    const vitals = characterData.vitals;
    let maxHP = vitals.hitPoints.rolledHP;
    maxHP += characterData.characterInfo.level * getAbilityModifier('constitution');
    return maxHP;
}

function getArmorClass() {
    let baseArmorClass = 10;
    let ability = 'dexterity';
    let bonusAC = 0;
    let maxAbilityBonus = 99;

    characterData.inventory.equipment.filter(i => i.equipped).forEach(i => {
        const itemData = gameData.items.byId[i.id];
        if (itemData?.type === 'armor') {
            baseArmorClass = itemData.armorTraits.AC ?? baseArmorClass;
            ability = itemData.armorTraits.ability ?? ability;
            bonusAC = itemData.armorTraits.bonusAC ?? bonusAC;
            maxAbilityBonus = itemData.armorTraits.maxAbilityBonus ?? maxAbilityBonus;
        }
    });

    return baseArmorClass + bonusAC + Math.min(getAbilityModifier(ability), maxAbilityBonus);
}

function getInitiative() {
    const coreTraits = characterData.coreTraits;
    let initiative = coreTraits.initiative;
    initiative += getAbilityModifier('dexterity');

    return initiative;
}

function getAbsorb() {
    let absorb = 0;
    let bonusAbsorb = 0;
    let isArmorEquipped = false;

    characterData.inventory.equipment.filter(i => i.equipped).forEach(i => {
        const itemData = gameData.items.byId[i.id];
        if (itemData?.type === 'armor') {
            isArmorEquipped = true;
            absorb = itemData.armorTraits.absorb ?? absorb;
            bonusAbsorb = itemData.armorTraits.bonusAbsorb ?? bonusAbsorb;
        }
    });

    absorb = absorb + bonusAbsorb;
    let totalAbsorb = absorb * getProficiencyBonus();

    return {absorb: absorb, totalAbsorb: totalAbsorb};
}

// generate stress slots
function generateStressSlots(stressSlots) {
    if (!stressSlots) return;
    
    const slotsContainer = document.querySelector('.cs-stress .cs-slots');
    if (!slotsContainer) return;

    // Clear existing slots
    slotsContainer.innerHTML = '';

    // Create slots based on max
    const maxSlots = stressSlots.max || 2;
    const currentSlots = stressSlots.current || 0;

    for (let i = 0; i < maxSlots; i++) {
        const slot = document.createElement('div');
        slot.className = 'cs-slot';
        if (i < currentSlots) {
            slot.classList.add('filled');
        }
        slotsContainer.appendChild(slot);
    }
}

// generate heroic inspiration slots
function generateHeroicInspiration(heroicInspiration) {
    if (heroicInspiration === undefined || heroicInspiration === null) return;
    
    const slotsContainer = document.querySelector('.cs-inspiration .cs-slots');
    if (!slotsContainer) return;

    // Clear existing slots
    slotsContainer.innerHTML = '';

    // Heroic inspiration is stored as a number (current), max is typically 3
    const maxSlots = heroicInspiration.max;
    const currentSlots = heroicInspiration.current;

    for (let i = 0; i < maxSlots; i++) {
        const slot = document.createElement('div');
        slot.className = 'cs-slot';
        if (i < currentSlots) {
            slot.classList.add('filled');
        }
        slotsContainer.appendChild(slot);
    }
}

// generate saving throws
function generateSavingThrows() {
    const savingThrows = characterData.savingThrows;
    const level = characterData.characterInfo?.level || 1;
    const classData = characterData.class;
    
    if (!savingThrows) return;

    // Determine which saves are proficient (from class)
    const proficientSaves = [];
    if (classData?.saveAbility) {
        const saveAbility = classData.saveAbility.toLowerCase();
        if (saveAbility === 'strength' || saveAbility === 'constitution') {
            proficientSaves.push('fortitude');
        } else if (saveAbility === 'dexterity') {
            proficientSaves.push('reflex');
        } else if (saveAbility === 'wisdom' || saveAbility === 'intelligence' || saveAbility === 'charisma') {
            proficientSaves.push('will');
        }
    }

    const proficiencyBonus = getProficiencyBonus(level);

    const savingThrowElements = document.querySelectorAll('#cs-saving-throws .cs-saving-throw');
    savingThrowElements.forEach(throwEl => {

        const throwName = throwEl.getAttribute('data-saving-throw');
        const modifier = getSavingThrowModifier(throwName);

        const modifierEl = throwEl.querySelector('.cs-saving-throw-modifier');
        if (modifierEl) {
            modifierEl.textContent = formatModifier(modifier);
        }
    });
}

function getSavingThrowModifier(throwName) {
    
    const abilityMap = {
        'fortitude': ['strength', 'constitution'],
        'reflex': ['dexterity','wisdom'],
        'will': [ 'intelligence', 'charisma']
    };
    const throwData = characterData.savingThrows[throwName];
    if (!throwData) return 0;
    const abilities = abilityMap[throwName] || [];
    const abilityMod = abilities.length > 0 
        ? Math.max(...abilities.map(ab => getAbilityModifier(ab)))
        : 0;
    const startingBonus = throwData.startingBonus || 0;
    const savingThrowIncrease = characterData.calculatedModifiers.savingThrowIncrease[throwName].bonus || 0;

    const modifier = abilityMod + startingBonus + savingThrowIncrease;
    return modifier;
}

// generate skills
function generateSkills() {
    const skillElements = document.querySelectorAll('#cs-skills .cs-skill');
    skillElements.forEach(skillEl => {
        const skillName = skillEl.getAttribute('data-skill');
        if (!skillName) return;

        const { totalModifier, passive, isProficient } = getSkillInfo(skillName);

        // Update proficiency indicator
        const proficiencyIcon = skillEl.querySelector('.cs-skill-proficiency');
        if (proficiencyIcon) {
            if (isProficient) {
                proficiencyIcon.className = 'cs-skill-proficiency fa-solid fa-circle';
            } else {
                proficiencyIcon.className = 'cs-skill-proficiency fa-regular fa-circle';
            }
        }

        // Update modifier
        const modifierEl = skillEl.querySelector('.cs-skill-modifier');
        if (modifierEl) {
            modifierEl.textContent = formatModifier(totalModifier);
        }

        // Update passive
        const passiveEl = skillEl.querySelector('.cs-skill-passive');
        if (passiveEl) {
            passiveEl.textContent = passive;
        }
    });
}

function getSkillInfo(skillName) {
    // Skill to ability mapping
    const skillAbilityMap = {
        'acrobatics': 'dexterity',
        'animalHandling': 'wisdom',
        'arcana': 'intelligence',
        'athletics': 'strength',
        'deception': 'charisma',
        'history': 'intelligence',
        'insight': 'wisdom',
        'intimidation': 'charisma',
        'investigation': 'intelligence',
        'medicine': 'wisdom',
        'nature': 'intelligence',
        'perception': 'wisdom',
        'performance': 'charisma',
        'persuasion': 'charisma',
        'religion': 'intelligence',
        'sleightOfHand': 'dexterity',
        'stealth': 'dexterity',
        'survival': 'wisdom'
    };
    const abilityName = skillAbilityMap[skillName];
    if (!abilityName) return { totalModifier: 0, passive: 10, isProficient: false };
    const abilityMod = getAbilityModifier(abilityName);
    
    const isProficient = characterData.calculatedModifiers.skillProficiency[skillName].proficient;
    const proficiencyBonus = isProficient ? getProficiencyBonus() : 0;

    const totalModifier = abilityMod + proficiencyBonus;
    const passive = 10 + totalModifier;
    return { totalModifier, passive, isProficient };
}

// generate senses and movement
function generateSensesAndMovement() {
    // Senses
    const sensesEl = document.querySelector('#cs-physical-traits .cs-trait-list-item:first-child .cs-description');
    if (sensesEl && characterData.senses) {
        sensesEl.innerHTML = parseDescription(characterData.senses.description) || '';
    }

    // Movement
    const movement = characterData.movement;
    if (movement) {
        const movementEl = document.querySelector('#cs-physical-traits .cs-trait-list-item:last-child .cs-description');
        if (movementEl) {
            const movementParts = [];
            if (movement.walking) movementParts.push(`Walking ${movement.walking} ft.`);
            if (movement.flying) movementParts.push(`Flying ${movement.flying} ft.`);
            if (movement.swimming) movementParts.push(`Swimming ${movement.swimming} ft.`);
            if (movement.climbing) movementParts.push(`Climbing ${movement.climbing} ft.`);
            movementEl.textContent = movementParts.join(', ') || 'Walking 30 ft.';
        }
    }
}

// generate defenses and conditions
function generateDefensesAndConditions() {
    const defenses = characterData.defenses;
    const conditions = characterData.conditions;

    // Defenses
    const defensesEl = document.querySelector('#cs-defenses .cs-trait-list-item:first-child .cs-description');
    if (defensesEl && defenses) {
        const defenseParts = [];
        if (defenses.resistances && defenses.resistances.length > 0) {
            defenseParts.push(`Resistance - ${defenses.resistances.join(', ')}`);
        }
        if (defenses.immunities && defenses.immunities.length > 0) {
            defenseParts.push(`Immunity - ${defenses.immunities.join(', ')}`);
        }
        if (defenses.vulnerabilities && defenses.vulnerabilities.length > 0) {
            defenseParts.push(`Vulnerability - ${defenses.vulnerabilities.join(', ')}`);
        }
        defensesEl.textContent = defenseParts.join(', ') || 'None';
    }

    // Conditions
    const conditionsEl = document.querySelector('#cs-defenses .cs-trait-list-item:last-child .cs-description');
    if (conditionsEl && conditions) {
        conditionsEl.textContent = conditions.length > 0 ? conditions.join(', ') : 'None';
    }
}

// generate proficiencies
function generateProficiencies() {
    const proficiencies = characterData.proficiencies;
    if (!proficiencies) return;

    proficiencies.armor = getArmorProficiency();
    proficiencies.weapons = getWeaponProficiency();
    proficiencies.tools = getToolProficiency();
    proficiencies.languages = getLanguageProficiency();

    
    const proficiencyItems = document.querySelectorAll('#cs-proficiencies .cs-trait-list-item');
    proficiencyItems.forEach(item => {
        const nameEl = item.querySelector('.cs-trait-name');
        if (!nameEl) return;

        const proficiencyType = nameEl.textContent.trim();
        let proficiencyData = null;

        if (proficiencyType === 'Armor') {
            proficiencyData = proficiencies.armor;
        } else if (proficiencyType === 'Weapons') {
            proficiencyData = proficiencies.weapons;
        } else if (proficiencyType === 'Tools') {
            proficiencyData = proficiencies.tools;
        } else if (proficiencyType === 'Languages') {
            proficiencyData = proficiencies.languages;
        }

        if (proficiencyData && Array.isArray(proficiencyData) && proficiencyData.length > 0) {
            const descEl = item.querySelector('.cs-description');
            if (descEl) {
                descEl.textContent = proficiencyData.join(', ');
            }
        } else if (proficiencyData && Array.isArray(proficiencyData) && proficiencyData.length === 0) {
            const descEl = item.querySelector('.cs-description');
            if (descEl) {
                descEl.textContent = 'None';
            }
        }
    });
}

function getArmorProficiency() {
    const armorMap = {
        'lightArmor': 'Light Armor',
        'mediumArmor': 'Medium Armor',
        'heavyArmor': 'Heavy Armor',
        'shields': 'Shields',
    };
    const armorProficiency = characterData.calculatedModifiers.armorProficiency;
    if (!armorProficiency) return [];

    const armorProficiencyList = [];
    Object.entries(armorProficiency).forEach(([key, value]) => {
        if (value.proficient) {
            armorProficiencyList.push(armorMap[key]);
        }
    });

    return armorProficiencyList;
}

function getWeaponProficiency() {
    const weaponMap = {
        'simpleWeapons': 'Simple Weapons',
        'martialWeapons': 'Martial Weapons',
        'club': 'Club',
        'dagger': 'Dagger',
        'greatclub': 'Greatclub',
        'handaxe': 'Handaxe',
        'javelin': 'Javelin',
        'lightHammer': 'Light Hammer',
        'mace': 'Mace',
        'quarterstaff': 'Quarterstaff',
        'sickle': 'Sickle',
        'spear': 'Spear',
        'crossbowLight': 'Crossbow, Light',
        'dart': 'Dart',
        'shortbow': 'Shortbow',
        'sling': 'Sling',
        'battleaxe': 'Battleaxe',
        'flail': 'Flail',
        'glaive': 'Glaive',
        'greataxe': 'Greataxe',
        'greatsword': 'Greatsword',
        'halberd': 'Halberd',
        'lance': 'Lance',
        'longsword': 'Longsword',
        'maul': 'Maul',
        'morningstar': 'Morningstar',
        'pike': 'Pike',
        'rapier': 'Rapier',
        'scimitar': 'Scimitar',
        'shortsword': 'Shortsword',
        'trident': 'Trident',
        'warpick': 'Warpick',
        'warhammer': 'Warhammer',
        'whip': 'Whip',
        'blowgun': 'Blowgun',
        'crossbowHand': 'Crossbow, Hand',
        'crossbowHeavy': 'Crossbow, Heavy',
        'longbow': 'Longbow',
        'net': 'Net',
    };
    const weaponProficiency = characterData.calculatedModifiers.weaponProficiency;
    if (!weaponProficiency) return [];

    const weaponProficiencyList = [];
    Object.entries(weaponProficiency).forEach(([key, value]) => {
        if (value.proficient) {
            weaponProficiencyList.push(weaponMap[key]);
        }
    });

    return weaponProficiencyList;
}

function getToolProficiency() {
    const toolProficiency = characterData.calculatedModifiers.toolProficiency;
    if (!toolProficiency) return [];
    return toolProficiency;
}

function getLanguageProficiency() {
    const languageProficiency = characterData.calculatedModifiers.language;
    if (!languageProficiency) return [];
    return languageProficiency;
}

// generate attacks
function generateAttacks() {
    const equipment = characterData.inventory.equipment;
    if (!equipment) return;

    const attacksContainer = document.querySelector('#cs-combat-attacks');
    if (!attacksContainer) return;

    attacksContainer.innerHTML = '';

    equipment.filter(item => item.equipped).forEach(item => {
        const proficiencyBonus = getProficiencyBonus(characterData.characterInfo.level);
        const itemData = gameData.items.byId[item.id];

        console.log("Item data:", itemData);

        if (itemData.type === 'weapon') {
            const ability = itemData.weaponTraits.ability;
            const abilityMod = getAbilityModifier(ability);
            let toHit = abilityMod + proficiencyBonus;
            let damageModifier = abilityMod;
        
            const attackEl = document.createElement('div');
            attackEl.className = 'cs-action';
            attackEl.innerHTML = `
                <div class="cs-action-title">${itemData.name}</div>
                <div class="cs-action-range">${itemData.weaponTraits.range}</div>
                <div class="cs-action-to-hit">${toHit > 0 ? "+" + toHit : toHit}</div>
                <div class="cs-action-damage">${itemData.weaponTraits.damage} ${damageModifier > 0 ? " + " + damageModifier : " - " + Math.abs(damageModifier)}</div>
            `;
            attacksContainer.appendChild(attackEl);
        }
    });


    // If there are attacks in inventory or a separate attacks array, generate them here
    // This is a placeholder for future implementation
}

function updateAttacks() {
    generateAttacks();
}

async function generateAttack(weaponName, attacksContainer) {
   
    const weaponData = gameData.items.byId[weaponName];
    if (!weaponData) return;

}

// generate universal actions
function generateUniversalActions() {
    const universalActionsContainer = document.querySelector('#cs-combat-content');
    if (!universalActionsContainer) return;
    
    Object.values(gameData.universal).forEach(universal => {
        const universalEl = document.createElement('div');
        const universalDescription = universal.snippet || universal.snippet === '' ? universal.snippet : universal.description;
        universalEl.className = 'cs-column-card';
        universalEl.innerHTML = `
            <div class="cs-column-card-title">${universal.name}</div>
            <div class="cs-column-card-content">${parseDescription(universalDescription)}</div>
        `;
        universalActionsContainer.appendChild(universalEl);
    });
}

// generate prowesses/features
function generateProwesses() {
    const classData = characterData.class;
    if (!classData?.prowesses || classData.prowesses.length === 0) return;

    const prowessesContainer = document.querySelector('#cs-prowesses-content');
    if (!prowessesContainer) return;

    // Clear existing prowesses
    prowessesContainer.innerHTML = '';

    // Note: Prowess descriptions should be loaded from class data at runtime
    // For now, we'll just display the names
    characterData.class.prowesses.forEach(prowess => {
        console.log("Prowess:", prowess);
        const prowessData = gameData.prowesses.find(p => p.name === prowess.name);

        console.log("Prowess data:", prowessData);
        
        const prowessEl = document.createElement('div');
        prowessEl.id = `cs-prowess-${prowess.name.toLowerCase().replace(/ /g, '-')}`;
        prowessEl.className = 'cs-column-card';

        if (prowess.flipped) {
            prowessEl.classList.add('flipped');
        }
        
        // Parse description as markdown
        const prowessDescription = prowessData?.description 
            ? parseDescription(prowessData.description)
            : 'Prowess description will be loaded from class data.';
        
        prowessEl.innerHTML = `
            <div class="cs-column-card-title">${prowess.name || ''}</div>
            <div class="cs-column-card-content">${prowessDescription}</div>
        
            <div class="cs-card-buttons">
                <button id="cs-prowess-use-button-${prowessEl.id}" class="cs-column-card-button ${prowess.flipped ? 'flipped' : ''}" onclick="useProwess('${prowessEl.id}')" name="${prowess.name}">${prowess.flipped ? 'Reset' : 'Use'}</button>
            </div>
        `;

        prowessesContainer.appendChild(prowessEl);
    });
}
function generateFeatures() {
    
    generateClassFeatures();
    generateRaceFeatures();
    generateBackgroundFeatures();
    generateFeatFeatures();
}

function generateClassFeatures() {
    const featuresContainer = document.querySelector('#cs-class-features');
    if (!featuresContainer) console.error('Features container not found');
    featuresContainer.innerHTML = '';

    const classFeatureData = gameData.class.features;
    if (!classFeatureData) console.error('Class feature data not found');

    characterData.class.features.forEach(feature => {
        const featureData = classFeatureData.find(f => f.name === feature.name);
        if (!featureData) console.error('Feature data not found');

        if (!featureData.showInSheet) {
            console.log('Feature not shown in sheet:', feature.name);
            return;
        }

        const featureEl = generateFeature(feature, featureData, 'class');
        featuresContainer.appendChild(featureEl);
    });
}

function generateRaceFeatures() {
    const featuresContainer = document.querySelector('#cs-race-features');
    if (!featuresContainer) console.error('Features container not found');
    featuresContainer.innerHTML = '';

    const raceFeatureData = gameData.race.features;
    if (!raceFeatureData) console.error('Race feature data not found');

    characterData.race.features.forEach(feature => {
        const featureData = raceFeatureData.find(f => f.name === feature.name);
        if (!featureData) console.error('Feature data not found');

        if (!featureData.showInSheet) {
            console.log('Feature not shown in sheet:', feature.name);
            return;
        }

        const featureEl = generateFeature(feature, featureData, 'race');
        featuresContainer.appendChild(featureEl);
    });
}

function generateBackgroundFeatures() {
    const featuresContainer = document.querySelector('#cs-background-features');
    if (!featuresContainer) console.error('Features container not found');
    featuresContainer.innerHTML = '';

    const backgroundFeatureData = gameData.background.features;
    if (!backgroundFeatureData) console.error('Background feature data not found');

    characterData.background.features.forEach(feature => {
        const featureData = backgroundFeatureData.find(f => f.name === feature.name);
        if (!featureData) console.error('Feature data not found');

        if (!featureData.showInSheet) {
            console.log('Feature not shown in sheet:', feature.name);
            return;
        }

        const featureEl = generateFeature(feature, featureData, 'background');
        featuresContainer.appendChild(featureEl);
    });
}

function generateFeatFeatures() {
    const featuresContainer = document.querySelector('#cs-feat-features');
    if (!featuresContainer) console.error('Features container not found');
    featuresContainer.innerHTML = '';

    const featFeatureData = gameData.feats;
    if (!featFeatureData) console.error('Feat feature data not found');

    characterData.feats.forEach(feat => {
        const featureData = featFeatureData.find(f => f.name === feat.name);
        if (!featureData) console.error('Feature data not found');

        if (!featureData.showInSheet) {
            console.log('Feature not shown in sheet:', feat.name);
            return;
        }

        const featureEl = generateFeature(feat, featureData, 'feat');
        featuresContainer.appendChild(featureEl);
    });
}

// check if any columns have no content
function checkFeatureColumns() {
    debugger;
    const actionSections = document.querySelector('#cs-actions-and-features');

    const featureColumns = actionSections.querySelectorAll('.cs-section-column');
    featureColumns.forEach(column => {
        const contents = column.querySelectorAll('.cs-column-content');
        let count = 0; 
        contents.forEach(content => {
            console.log("Content:", content);
            if (content.children.length === 0) {
                count++;
            }
        });
        if (count === contents.length) {
            column.classList.remove('active');
        }
    });
}

function checkProwessesSpellsColumns() {
    const prowessesColumnContent = document.querySelector('#cs-prowesses-content');
    const spellsColumnContent = document.querySelector('#cs-spells-content');

    const prowessesTitleEl = document.querySelector('#cs-martial-prowesses-title');
    const spellsTitleEl = document.querySelector('#cs-spells-title');

    if (prowessesColumnContent.children.length === 0) {
        prowessesTitleEl.classList.add('hidden');
    } else {
        prowessesTitleEl.classList.remove('hidden');
    }
    if (spellsColumnContent.children.length === 0) {
        spellsTitleEl.classList.add('hidden');
    } else {
        spellsTitleEl.classList.remove('hidden');
    }
}

function generateFeature(characterFeature, featureData, source='') {
    const featureEl = document.createElement('div');
    const featureDescription = featureData.snippet || featureData.snippet === '' ? featureData.snippet : featureData.description;
    featureEl.className = 'cs-column-card';
    featureEl.innerHTML = `
        <div class="cs-column-card-title">${featureData.name|| ''} <span class="cs-column-card-title-source">${source !== '' ? toTitleCase(source) + " Feature" : ''}</span></div>
        <div class="cs-column-card-content">${parseDescription(featureDescription) != null ? parseDescription(featureDescription) : 'Feature description will be loaded from class data.'}</div>
    `;
    characterFeature.options?.forEach(option => {
        const optionData = featureData.options?.find(o => o.name === option);
        const optionDescription = optionData.snippet || optionData.snippet === '' ? optionData.snippet : optionData.description;
        if (!optionData) console.error('Option data not found');
        const optionEl = document.createElement('div');
        optionEl.className = 'cs-column-card-option';
        optionEl.innerHTML = `
            <div class="cs-column-card-option-title">${optionData.name || ''}</div>
            <div class="cs-column-card-option-content">${parseDescription(optionDescription) != null ? parseDescription(optionDescription) : 'Option description will be loaded from class data.'}</div>
        `;
        featureEl.appendChild(optionEl);
    });
    const modifiersContainer = document.createElement('div');
    modifiersContainer.className = 'cs-column-card-modifiers';
    characterFeature.modifiers?.forEach(modifier => {
        const modifierEl = document.createElement('div');
        modifierEl.className = 'cs-column-card-modifier';
        modifierEl.textContent = modifier.value;
        modifiersContainer.appendChild(modifierEl);
    });
    featureEl.appendChild(modifiersContainer);
    return featureEl;
}

function generateInventory() {
    const inventoryContainer = document.querySelector('#cs-inventory-content');

    const equipment = characterData.inventory.equipment;
    const items = characterData.inventory.items;
    const currency = characterData.inventory.currency;

    equipment.forEach(item => {
        const itemData = gameData.items.byId[item.id];
        const itemNotes = getNotes(itemData);
        const itemEl = document.createElement('details');
        itemEl.id = `cs-inventory-item-${item.id}`;
        itemEl.className = 'cs-inventory-item';
        itemEl.innerHTML = `
            <summary class="cs-inventory-item-summary">
                <input type="checkbox" class="cs-inventory-item-equip-button">
                <div class="cs-inventory-summary-info">
                    <div class="cs-inventory-summary-info-title">${item.name}</div>
                    <div class="cs-inventory-summary-info-type">${item.equipment ? 'Equipment' : 'Item'}</div>
                </div>
                <div class="cs-inventory-summary-info-quantity">${item.quantity}</div>
                <div class="cs-inventory-summary-info-notes"></div>
            </summary>
            <div class="cs-inventory-item-content">
            </div>
        `;
        const equipButton = itemEl.querySelector('.cs-inventory-item-equip-button');
        equipButton.addEventListener('click', () => {
            equipItem(item);
        });
        if (item.equipment) {
            if (item.equipped) {
                equipButton.checked = true;
            } else {
                equipButton.checked = false;
            }
            equipButton.style.visibility = 'visible';
        } else {
            equipButton.style.visibility = 'hidden';
        }
        
        const itemNotesEl = itemEl.querySelector('.cs-inventory-summary-info-notes');
        if (itemNotesEl) {
            const notesArray = [];
            itemNotes.forEach(note => {
                console.log("Note:", note);
                if (note.displayType === false) {
                    notesArray.push(`${toTitleCase(note.value)}`);
                } else {
                    notesArray.push(`${toTitleCase(note.key)}: ${toTitleCase(note.value)}`);
                }
            });
            itemNotesEl.textContent = notesArray.join(', ');
        }

        const itemContentEl = itemEl.querySelector('.cs-inventory-item-content');
        if (itemContentEl) {
            itemNotes.forEach(note => {
                const noteEl = document.createElement('div');
                noteEl.className = 'cs-inventory-item-content-item';
                if (typeof note.value === 'string') {
                    noteEl.innerHTML = `<span class="bold">${toTitleCase(note.key)}:</span> ${toTitleCase(note.value)}`;
                } else {
                    noteEl.innerHTML = `<span class="bold">${toTitleCase(note.key)}:</span> ${note.value}`;
                }
                itemContentEl.appendChild(noteEl);
            });
        }
        
        inventoryContainer.appendChild(itemEl);
    });

    items.forEach(item => {
        const itemData = gameData.items.byId[item.id];
        const itemNotes = getNotes(itemData);
        const itemEl = document.createElement('details');
        itemEl.id = `cs-inventory-item-${item.id}`;
        itemEl.className = 'cs-inventory-item';
        itemEl.innerHTML = `
            <summary class="cs-inventory-item-summary">
                <input type="checkbox" class="cs-inventory-item-equip-button">
                <div class="cs-inventory-summary-info">
                    <div class="cs-inventory-summary-info-title">${item.name}</div>
                    <div class="cs-inventory-summary-info-type">${item.equipment ? 'Equipment' : 'Item'}</div>
                </div>
                <div class="cs-inventory-summary-info-quantity">${item.quantity ? item.quantity : 1}</div>
                <div class="cs-inventory-summary-info-notes"></div>
            </summary>
            <div class="cs-inventory-item-content">
            </div>
        `;
        const equipButton = itemEl.querySelector('.cs-inventory-item-equip-button');

        if (item.equipment) {
            if (item.equipped) {
                equipButton.checked = true;
            } else {
                equipButton.checked = false;
            }
            equipButton.style.visibility = 'visible';
        } else {
            equipButton.style.visibility = 'hidden';
        }
        const itemNotesEl = itemEl.querySelector('.cs-inventory-summary-info-notes');
        if (itemNotesEl) {
            itemNotes.forEach(note => {
                console.log("Note:", note);
                const noteEl = document.createElement('div');
                noteEl.className = 'cs-inventory-summary-info-notes-item';
                if (note.displayType === false) {
                    noteEl.textContent = `${note.value}`;
                } else {
                    noteEl.textContent = `${note.key}: ${note.value}`;
                }
                itemNotesEl.appendChild(noteEl);
            });
        }
        inventoryContainer.appendChild(itemEl);
    });
    
    Object.entries(currency).forEach(([key, value]) => {
        const currencyItemEl = document.querySelector(`#cs-inventory-currency-${key}`);
        currencyItemEl.querySelector('.cs-inventory-currency-item-value').textContent = value;
    });
}

function equipItem(item) {
    const itemEl = document.querySelector(`#cs-inventory-item-${item.id}`);
    const equipButton = itemEl.querySelector('.cs-inventory-item-equip-button');
    if (equipButton.checked) {
        item.equipped = true;
    } else {
        item.equipped = false;
    }

    const itemData = gameData.items.byId[item.id];

    if (itemData.type === 'armor') {
        updateCoreTraits();
    } else if (itemData.type === 'weapon') {
        updateAttacks();
    }
}

function updateCoreTraits() {
    const coreTraits = characterData.coreTraits;
    coreTraits.armorClass = getArmorClass();
    coreTraits.absorb = getAbsorb();
    generateCombatStats();
}

function getNotes(item) {
    const notes = [];
    if (!item) {
        return notes;
    }
    if (item.type) {
        notes.push({key: 'type', value: `${item.type}`, displayType: false});
    }
    if (item.equipment) {
        notes.push({key: 'equipment', value: 'Equipment', displayType: false});
    }

    if (item.type === 'weapon') {
        Object.entries(item.weaponTraits).forEach(([key, value]) => {
            if (typeof value === 'string') {
                notes.push({key: key, value: `${value}`, displayType: false});
            } else if (typeof value === 'number') {
                notes.push({key: key, value: `${value}`, displayType: true});
            } else if (typeof value === 'array') {
                value.forEach(v => {
                    notes.push({key: key, value: `${v}`, displayType: false});
                });
            }
        });
    } else if (item.type === 'armor') {
        Object.entries(item.armorTraits).forEach(([key, value]) => {
            if (typeof value === 'string') {
                notes.push({key: key, value: `${value}`, displayType: false});
            } else if (typeof value === 'number') {
                notes.push({key: key, value: `${value}`, displayType: true});
            } else if (typeof value === 'array') {
                value.forEach(v => {
                    notes.push({key: key, value: `${v}`, displayType: false});
                });
            }
        });
    }
    return notes;
}

function adjustCurrency(button) {
    const currency = characterData.inventory.currency;
    const currencyInputEl = document.querySelector('#cs-inventory-currency-input');
    const currencyInputValue = parseInt(currencyInputEl.value) ? parseInt(currencyInputEl.value) : 1;

    if (!currency[button.dataset.currency] || currency[button.dataset.currency] < 0) {
        currency[button.dataset.currency] = 0;
    }

    if (button.dataset.type === 'plus') {
        currency[button.dataset.currency] = Math.max(currency[button.dataset.currency] + currencyInputValue, 0);
    } else if (button.dataset.type === 'minus') {
        currency[button.dataset.currency] = Math.max(currency[button.dataset.currency] - currencyInputValue, 0);
    }

    const currencyItemEl = document.querySelector(`#cs-inventory-currency-${button.dataset.currency}`);
    currencyItemEl.querySelector('.cs-inventory-currency-item-value').textContent = currency[button.dataset.currency];
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    // Check for hexId in URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const hexId = urlParams.get('hexId');
    
    // Load character data (will use hexId from URL if present)
    await loadCharacterData(hexId);
    
    const content = document.querySelector('#content-container');
    if (content) {
        content.classList.remove('content-loading');
    }
});

// Save immediately when page is about to unload (prevents data loss on reload)
// This ensures changes are saved even if the debounce timer hasn't fired yet
window.addEventListener('beforeunload', () => {
    // Clear any pending debounced save
    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }
    // Save immediately (synchronous localStorage write)
    if (characterData) {
        saveCharacter();
    }
});

function setHitPoints(hitPoints) {
    const hitPointsCurrentEl = document.querySelector('#cs-hp-current .cs-value');
    hitPointsCurrentEl.textContent = hitPoints.current;

    if (hitPointsCurrentEl > hitPoints.max) {
        hitPointsCurrentEl.textContent = hitPoints.max;
    }
    if (hitPointsCurrentEl < 0) {
        hitPointsCurrentEl.textContent = 0;
    }
}

function adjustHitPoints(button, type) {
    const hitPoints = characterData.vitals.hitPoints;
    const hitPointsInputEl = document.querySelector('#cs-hp-adjust-input');

    let inputValue = parseInt(hitPointsInputEl.value);

    if (type === 'heal') {
        hitPoints.current = Math.min(hitPoints.current + inputValue, hitPoints.max);
    } else if (type === 'damage') {
        if (hitPoints.temporary > 0) {
            const tempValue = hitPoints.temporary;
            hitPoints.temporary = Math.max(hitPoints.temporary - inputValue, 0);
            inputValue = Math.max(inputValue - tempValue, 0);
            setTemporaryHitPoints(hitPoints.temporary);
        }
        hitPoints.current = Math.max(hitPoints.current - inputValue, 0);
    }

    setHitPoints(hitPoints);
}

function setTemporaryHitPoints(temporaryHitPoints) {
    const temporaryHitPointsButtonEl = document.querySelector('#cs-temp-hp-button');
    temporaryHitPointsButtonEl.textContent = temporaryHitPoints > 0 ? temporaryHitPoints : '--';
}

function adjustTemporaryHitPoints(button) {
    const temporaryHitPoints = characterData.vitals.hitPoints.temporary;
    const temporaryHitPointsInputEl = document.querySelector('#cs-temp-hp-adjust-input');
    
    button.classList.add('hidden');
    temporaryHitPointsInputEl.classList.remove('hidden');
    temporaryHitPointsInputEl.value = temporaryHitPoints;
    temporaryHitPointsInputEl.focus();
    temporaryHitPointsInputEl.select();
}

function changeTemporaryHitPoints(input) {
    const hitPoints = characterData.vitals.hitPoints;
    const temporaryHitPointsInputEl = document.querySelector('#cs-temp-hp-adjust-input');
    const temporaryHitPointsButtonEl = document.querySelector('#cs-temp-hp-button');

    const inputValue = parseInt(temporaryHitPointsInputEl.value);
    hitPoints.temporary = inputValue > 0 ? inputValue : 0;
    temporaryHitPointsInputEl.value = '';
    temporaryHitPointsInputEl.classList.add('hidden');
    temporaryHitPointsButtonEl.classList.remove('hidden');

    setTemporaryHitPoints(hitPoints.temporary);
}

function adjustStressSlots(button) {
    const stressSlots = characterData.vitals.stressSlots;
    const exhaustionSlots = characterData.vitals.exhaustion;

    const stressSlotsEl = document.querySelector('#cs-stress-slots');
    const exhaustSlotsEl = document.querySelector('#cs-exhaust-slots');

    if (button.id === 'cs-stress-minus-button') {
        reduceStressSlots(stressSlots, exhaustionSlots, stressSlotsEl, exhaustSlotsEl);
    } else if (button.id === 'cs-stress-plus-button') {
        increaseStressSlots(stressSlots, exhaustionSlots, stressSlotsEl, exhaustSlotsEl);
    }

    console.log("Stress slots:", stressSlots);
    console.log("Exhaustion slots:", exhaustionSlots);
    console.log("Character data stress slots:", characterData.vitals.stressSlots);
}

function reduceStressSlots(stressSlots, exhaustionSlots, stressSlotsEl, exhaustSlotsEl) {
    if (stressSlots.current > 0) {
        stressSlots.current--;
        stressSlotsEl.children[stressSlots.current].classList.remove('filled');
    }
}

function increaseStressSlots(stressSlots, exhaustionSlots, stressSlotsEl, exhaustSlotsEl) {
    if (stressSlots.current < stressSlots.max) {
        stressSlotsEl.children[stressSlots.current].classList.add('filled');
        stressSlots.current++;
    } else if (stressSlots.current === stressSlots.max && exhaustionSlots.current < exhaustionSlots.max) {
        exhaustSlotsEl.children[exhaustionSlots.current].classList.add('filled');
        exhaustionSlots.current++;
    }
}

function adjustHeroicInspiration(button) {
    const heroicInspiration = characterData.coreTraits.heroicInspiration;

    const heroicInspirationEl = document.querySelector('.cs-inspiration .cs-slots');

    if (button.id === 'cs-inspiration-minus-button' && heroicInspiration.current > 0) {
        heroicInspiration.current--;
        heroicInspirationEl.children[heroicInspiration.current].classList.remove('filled');
    } else if (button.id === 'cs-inspiration-plus-button' && heroicInspiration.current < heroicInspiration.max) {
        heroicInspirationEl.children[heroicInspiration.current].classList.add('filled');
        heroicInspiration.current++;
    }
}

function useProwess(prowessId) {
    const prowessEl = document.getElementById(prowessId);
    const useButton = prowessEl.querySelector(`#cs-prowess-use-button-${prowessId}`);

    const prowess = characterData.class.prowesses.find(p => p.name === useButton.name);
    if (!prowess) return;


    prowess.flipped = !prowess.flipped;
    prowessEl.classList.toggle('flipped');

    useButton.textContent = prowess.flipped ? 'Reset' : 'Use';
}

function longRest() {
    const exhaustionSlots = characterData.vitals.exhaustion;
    const exhaustionSlotsEl = document.querySelector('#cs-exhaust-slots');

    if (exhaustionSlots.current > 0) {
        exhaustionSlots.current--;
        exhaustionSlotsEl.children[exhaustionSlots.current].classList.remove('filled');
    }
}

function shortRest() {
    return;
}

function showProwesses() {
    const martialProwessesTitleEl = document.querySelector('#cs-martial-prowesses-title');
    const spellsTitleEl = document.querySelector('#cs-spells-title');
    const prowessesContentEl = document.querySelector('#cs-prowesses-content');
    const spellsContentEl = document.querySelector('#cs-spells-content');

    martialProwessesTitleEl.classList.add('active');
    spellsTitleEl.classList.remove('active');

    prowessesContentEl.classList.remove('hidden');
    spellsContentEl.classList.add('hidden');
}

function showSpells() {
    const martialProwessesTitleEl = document.querySelector('#cs-martial-prowesses-title');
    const spellsTitleEl = document.querySelector('#cs-spells-title');
    const prowessesContentEl = document.querySelector('#cs-prowesses-content');
    const spellsContentEl = document.querySelector('#cs-spells-content');

    martialProwessesTitleEl.classList.remove('active');
    spellsTitleEl.classList.add('active');

    prowessesContentEl.classList.add('hidden');
    spellsContentEl.classList.remove('hidden');
}