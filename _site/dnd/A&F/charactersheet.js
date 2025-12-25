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

    const characterHexIds = localStorage.getItem('characterHexIds');
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
function getProficiencyBonus(level) {
    return Math.ceil(level / 4) + 1;
}

// Get ability modifier
function getAbilityModifier(abilityName) {
    const ability = characterData.abilities?.[abilityName.toLowerCase()];
    if (!ability) return 0;
    return ability.modifier || 0;
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
    
    // Prowesses
    generateProwesses();

    // Class Features
    generateClassFeatures();

    // Check Features Columns
    checkFeatureColumns();
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
        'Strength': abilities.strength,
        'Dexterity': abilities.dexterity,
        'Constitution': abilities.constitution,
        'Intelligence': abilities.intelligence,
        'Wisdom': abilities.wisdom,
        'Charisma': abilities.charisma
    };

    const abilityElements = document.querySelectorAll('#cs-abilities .cs-trait');
    abilityElements.forEach((trait, index) => {
        const abilityName = trait.querySelector('.cs-trait-name')?.textContent.trim();
        if (abilityName && abilityMap[abilityName]) {
            const ability = abilityMap[abilityName];
            // Abilities now store modifiers directly
            const modifier = ability.modifier !== undefined ? ability.modifier : 0;
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
    if (hpCurrentEl && vitals?.hitPoints) {
        hpCurrentEl.textContent = vitals.hitPoints.current || 10;
    }
    if (hpMaxEl && vitals?.hitPoints) {
        hpMaxEl.textContent = vitals.hitPoints.max || 10;
    }

    // Armor Class
    const acTrait = Array.from(document.querySelectorAll('#cs-core-traits .cs-trait')).find(
        trait => trait.querySelector('.cs-trait-name')?.textContent.trim() === 'Armor'
    );
    if (acTrait && coreTraits) {
        const valueEl = acTrait.querySelector('.cs-value');
        if (valueEl) valueEl.textContent = coreTraits.armorClass || 10;
    }

    // Initiative
    const initTrait = Array.from(document.querySelectorAll('#cs-core-traits .cs-trait')).find(
        trait => trait.querySelector('.cs-trait-name')?.textContent.trim() === 'Initiative'
    );
    if (initTrait && coreTraits) {
        const valueEl = initTrait.querySelector('.cs-value');
        if (valueEl) valueEl.textContent = formatModifier(coreTraits.initiative || 0);
    }

    // Absorb
    const absorbTrait = Array.from(document.querySelectorAll('#cs-core-traits .cs-trait')).find(
        trait => trait.querySelector('.cs-trait-name')?.textContent.trim() === 'Absorb'
    );
    if (absorbTrait && coreTraits) {
        const valueEl = absorbTrait.querySelector('.cs-value');
        if (valueEl) valueEl.textContent = coreTraits.absorb || 0;
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
    const maxSlots = 3;
    const currentSlots = typeof heroicInspiration === 'number' ? heroicInspiration : 0;

    for (let i = 0; i < maxSlots; i++) {
        const slot = document.createElement('div');
        slot.className = 'cs-slot';
        if (i < currentSlots) {
            slot.style.backgroundColor = 'var(--fg)'; // Filled slot
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
    const abilityMap = {
        'fortitude': ['strength', 'constitution'],
        'reflex': ['dexterity'],
        'will': ['wisdom', 'intelligence', 'charisma']
    };

    const savingThrowElements = document.querySelectorAll('#cs-saving-throws .cs-saving-throw');
    savingThrowElements.forEach(throwEl => {
        const nameEl = throwEl.querySelector('.cs-saving-throw-name');
        if (!nameEl) return;

        const throwName = nameEl.textContent.trim().toLowerCase();
        const throwData = savingThrows[throwName];
        if (!throwData) return;

        // Calculate modifier: ability modifier + proficiency (if proficient) + startingBonus
        const abilities = abilityMap[throwName] || [];
        const abilityMod = abilities.length > 0 
            ? Math.max(...abilities.map(ab => getAbilityModifier(ab)))
            : 0;
        
        const isProficient = proficientSaves.includes(throwName);
        const profBonus = isProficient ? proficiencyBonus : 0;
        const startingBonus = throwData.startingBonus || 0;
        const totalModifier = abilityMod + profBonus + startingBonus;

        const modifierEl = throwEl.querySelector('.cs-saving-throw-modifier');
        if (modifierEl) {
            modifierEl.textContent = formatModifier(totalModifier);
        }
    });
}

// generate skills
function generateSkills() {
    const level = characterData.characterInfo?.level || 1;
    const proficiencyBonus = getProficiencyBonus(level);
    
    // Get all skill proficiencies from class, race, and background
    const skillProficiencies = new Set();
    
    // From class
    if (characterData.class?.proficiencies?.skills) {
        characterData.class.proficiencies.skills.forEach(skill => skillProficiencies.add(skill));
    }
    
    // From race features (e.g., variant human skills)
    if (characterData.race?.features) {
        characterData.race.features.forEach(feature => {
            if (feature.name === 'Skills' && feature.choices) {
                feature.choices.forEach(skill => skillProficiencies.add(skill));
            }
        });
    }
    
    // From background (if it has skill choices)
    if (characterData.background?.choices) {
        characterData.background.choices.forEach(skill => {
            if (typeof skill === 'string') {
                skillProficiencies.add(skill);
            }
        });
    }

    // Skill to ability mapping
    const skillAbilityMap = {
        'Acrobatics': 'dexterity',
        'Animal Handling': 'wisdom',
        'Arcana': 'intelligence',
        'Athletics': 'strength',
        'Deception': 'charisma',
        'History': 'intelligence',
        'Insight': 'wisdom',
        'Intimidation': 'charisma',
        'Investigation': 'intelligence',
        'Medicine': 'wisdom',
        'Nature': 'intelligence',
        'Perception': 'wisdom',
        'Performance': 'charisma',
        'Persuasion': 'charisma',
        'Religion': 'intelligence',
        'Sleight of Hand': 'dexterity',
        'Stealth': 'dexterity',
        'Survival': 'wisdom'
    };

    const skillElements = document.querySelectorAll('#cs-skills .cs-skill');
    skillElements.forEach(skillEl => {
        const nameEl = skillEl.querySelector('.cs-skill-name');
        if (!nameEl) return;

        const skillName = nameEl.textContent.trim();
        const abilityName = skillAbilityMap[skillName];
        if (!abilityName) return;

        const isProficient = skillProficiencies.has(skillName);
        const abilityMod = getAbilityModifier(abilityName);
        const profBonus = isProficient ? proficiencyBonus : 0;
        const totalModifier = abilityMod + profBonus;
        const passive = 10 + totalModifier;

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

// generate senses and movement
function generateSensesAndMovement() {
    // Senses
    const sensesEl = document.querySelector('#cs-physical-traits .cs-trait-list-item:first-child .cs-description');
    if (sensesEl && characterData.senses) {
        sensesEl.textContent = characterData.senses.description || '';
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

    // Combine proficiencies from class, race, and background
    // For now, we'll use what's stored in the proficiencies object
    // In the future, this could be calculated from class/race/background data

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

// generate attacks
function generateAttacks() {
    const equipment = characterData.inventory.equipment;
    if (!equipment) return;

    const attacksContainer = document.querySelector('#cs-combat-attacks');
    if (!attacksContainer) return;

    attacksContainer.innerHTML = '';

    equipment.forEach(async item => {
        const proficiencyBonus = getProficiencyBonus(characterData.characterInfo.level);
        const itemData = await loadItem(item.name);

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

async function generateAttack(weaponName, attacksContainer) {
   
    const weaponData = await loadItem(weaponName);
    if (!weaponData) return;

}

// generate prowesses/features
function generateProwesses() {
    const classData = characterData.class;
    if (!classData?.prowesses || classData.prowesses.length === 0) return;

    const prowessesContainer = document.querySelector('#cs-martial-prowesses-content');
    if (!prowessesContainer) return;

    // Clear existing prowesses
    prowessesContainer.innerHTML = '';

    // Note: Prowess descriptions should be loaded from class data at runtime
    // For now, we'll just display the names
    classData.prowesses.forEach(prowess => {
        const prowessData = gameData.prowesses.find(p => p.name === prowess.name);

        console.log("Prowess data:", prowessData);
        
        const prowessEl = document.createElement('div');
        prowessEl.id = `cs-prowess-${prowess.name.toLowerCase().replace(/ /g, '-')}`;
        prowessEl.className = 'cs-column-card';

        if (prowess.flipped) {
            prowessEl.classList.add('flipped');
        }
        
        // In the future, load full prowess data from class definition
        // For now, just show the name
        prowessEl.innerHTML = `
            <div class="cs-column-card-title">${prowess.name || ''}</div>
            <div class="cs-column-card-content">${prowessData?.description || 'Prowess description will be loaded from class data.'}</div>
        
            <div class="cs-card-buttons">
                <button id="cs-prowess-use-button-${prowessEl.id}" class="cs-column-card-button ${prowess.flipped ? 'flipped' : ''}" onclick="useProwess('${prowessEl.id}')" name="${prowess.name}"> ${prowess.flipped ? 'Reset' : 'Use'}</button>
            </div>
        `;

        prowessesContainer.appendChild(prowessEl);
    });
}

function generateClassFeatures() {
    const classFeatureData = gameData.class.features;
    const classLevelFeatures = gameData.class.levelFeatures;

    const classLevel = characterData.class.level;
    if (!classLevelFeatures) return;

    const featuresContainer = document.querySelector('#cs-features-content');
    if (!featuresContainer) return;

    // Clear existing features
    featuresContainer.innerHTML = '';

    for (let i = 1; i <= classLevel; i++) {
        const levelFeatures = classLevelFeatures[i];
        if (!levelFeatures) continue;

        console.log("Level features:", levelFeatures);
        
        levelFeatures.forEach(feature => {
            const featureData = classFeatureData.find(f => f.name === feature);
            console.log("Feature data:", featureData);
            if (!featureData) return;
            
            const featureEl = document.createElement('div');

            const description = parseDescription(featureData.description);

            featureEl.className = 'cs-column-card';
            featureEl.innerHTML = `
                <div class="cs-column-card-title">${featureData.name || ''}</div>
                <div class="cs-column-card-content">${description || 'Feature description will be loaded from class data.'}</div>
            `;

            featuresContainer.appendChild(featureEl);
        });
    }
}

// check if any columns have no content
function checkFeatureColumns() {
    const featureColumns = document.querySelectorAll('.cs-section-column');
    featureColumns.forEach(column => {
        const content = column.querySelector('.cs-column-content');
        console.log("Content:", content);
        if (content.children.length === 0) {
            column.classList.remove('active');
        }
    });
}

function parseDescription(description) {
    let descriptionHtml = '';
    if (!description) return '';
    if (typeof description === 'string') return description;
    if (description.header) {
        descriptionHtml += `<div class="cs-description-header">${description.header}</div>`;
    }

    for (let i = 0; i < description.subheaders.length; i++) {
        descriptionHtml += `<div class="cs-description-subheader">${description.subheaders[i]}</div>`;
        descriptionHtml += `<div class="cs-description-body">${description.body[i]}</div>`;
    }

    return descriptionHtml;
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

    const stressSlotsEl = document.querySelector('.cs-stress .cs-slots');

    if (button.id === 'cs-stress-minus-button' && stressSlots.current > 0) {
        stressSlots.current--;
        stressSlotsEl.children[stressSlots.current].classList.remove('filled');
    } else if (button.id === 'cs-stress-plus-button' && stressSlots.current < stressSlots.max) {
        stressSlotsEl.children[stressSlots.current].classList.add('filled');
        stressSlots.current++;
    }

    console.log("Stress slots:", stressSlots);
    console.log("Character data stress slots:", characterData.vitals.stressSlots);
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