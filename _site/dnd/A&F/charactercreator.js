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
        level: 1,
        proficiencies: {
            skills: [],
        },
        features: [],
        prowesses: [],
    },
    race: {
        name: null,
        features: [],
    },
    vitals: {
        hitPoints: { current: 0, max: 0 },
    },
    background: {
        name: null,
        features: [],
    },
    coreTraits: {
        armorClass: 10,
        initiative: 0,
        absorb: 0,
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
    },
    notes: '',
};
let currentSection = null;

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

/**
 * Get all choice modifiers from a feature
 * @param {object} feature - The feature definition
 * @returns {Array} Array of modifiers that require choices
 */
function getChoiceModifiers(feature) {
    if (!feature.modifiers || !Array.isArray(feature.modifiers)) return [];
    return feature.modifiers.filter(modifier => 
        modifier.subType === 'choose' || (modifier.from && Array.isArray(modifier.from))
    );
}

// ============================================================================
// INITIALIZATION
// ============================================================================

async function loadCharacterBuilderData(hexId=null) {
    console.log('Loading character builder...');
    try {
        gameData = await loadBuilderGameData();
        if (gameData) {
            console.log('Game data:', gameData);
        }
        if (hexId) {
            console.log("Editing existing character...");
            const loadedData = JSON.parse(localStorage.getItem(`characterData-${hexId}`));
            if (loadedData) {
                // Merge loaded data into characterData
                Object.assign(characterData, loadedData);
                // Ensure modifiers array exists
                if (!characterData.modifiers) {
                    characterData.modifiers = [];
                }
                console.log('Character data:', characterData);
            }
        }
        else {
            console.log("Creating new character...");
        }
        
        generateCharacterBuilder();
    }
    catch (error) {
        console.error('Error loading character builder:', error);
    }
}

function generateCharacterBuilder() {
    console.log('Generating character builder...');

    generateClasses();
    generateRaces();
    generateBackgrounds();
    generateAbilities();
    generateEquipment();
}

// ============================================================================
// CLASS SELECTION & MANAGEMENT
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

    // Initialize features - auto-detect options and choices
    classData.features.forEach(feature => {
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
        
        characterData.class.features.push(characterFeature);
    });

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
    
    // Generate class features
    generateFeatures('class');
}

// ============================================================================
// RACE SELECTION & MANAGEMENT
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
// BACKGROUND SELECTION & MANAGEMENT
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
// ABILITY SELECTION & MANAGEMENT
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
// FEATURE GENERATION & MANAGEMENT
// ============================================================================

/**
 * Generate features for a given source (class, race, background)
 * @param {string} source - Source type ('class', 'race', 'background')
 */
function generateFeatures(source = 'class') {
    if ((!characterData[source]?.name && source !== 'abilities') || !gameData) return;
    
    const sourceData = getGameFeatureData(source);
    if (!sourceData) return;

    const builderTabEl = document.querySelector(`#cc-builder-tab-${source}-manage`);
    
    const featuresContainer = builderTabEl.querySelector('.cc-manager-features');
    if (!featuresContainer) return;
    
    featuresContainer.innerHTML = '';
    
    // Get features - filter by level for classes, all features for others
    let availableFeatures = sourceData.features || [];
    if (source === 'class' && characterData.class.level) {
        const currentLevel = characterData.class.level;
        availableFeatures = availableFeatures.filter(f => f.level <= currentLevel);
    }
    
    availableFeatures.forEach((gameFeature, index) => {
        const characterFeature = characterData[source].features.find(f => f.name === gameFeature.name);
        if (!characterFeature) return;
        
        const featureEl = document.createElement('details');
        featureEl.classList.add('cc-manager-feature');
        featureEl.dataset.featureName = gameFeature.name;
        
        // Determine how many options/choices are available
        let choicesCount = 0;
        let selectedCount = 0;
        
        if (featureHasOptions(gameFeature)) {
            choicesCount = gameFeature.count || 1;
            selectedCount = characterFeature.options ? characterFeature.options.filter(o => o).length : 0;
        } else if (featureHasChoices(gameFeature)) {
            const choiceModifiers = getChoiceModifiers(gameFeature);
            choicesCount = choiceModifiers.length;
            selectedCount = characterFeature.modifiers ? characterFeature.modifiers.filter(m => m).length : 0;
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
                    ${source === 'class' && gameFeature.level ? `<div class="cc-manager-feature-summary-meta-item">Level ${gameFeature.level}</div>` : ''}
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
                choiceEl.dataset.choiceIndex = i;
                
                const selectEl = document.createElement('select');
                selectEl.classList.add('cc-manager-feature-content-choice-select');
                selectEl.dataset.featureName = gameFeature.name;
                selectEl.dataset.choiceIndex = i;
                selectEl.dataset.source = source;
                selectEl.onchange = () => handleOptionSelection(gameFeature.name, i, selectEl.value, source);
                
                // Add default option
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = 'Choose an Option';
                selectEl.appendChild(defaultOption);
                
                // Add all available options
                gameFeature.options.forEach(option => {
                    const optionEl = document.createElement('option');
                    optionEl.value = option.name;
                    optionEl.textContent = option.name;
                    // Mark as selected if this option is already chosen
                    if (characterFeature.options && characterFeature.options[i] === option.name) {
                        optionEl.selected = true;
                    }
                    selectEl.appendChild(optionEl);
                });
                
                // Show description of selected option
                const descriptionEl = document.createElement('div');
                descriptionEl.classList.add('cc-manager-feature-content-choice-description', 'paragraph');
                descriptionEl.id = `cc-manager-feature-content-choice-description-${sanitizeFeatureName(gameFeature.name)}-${i}`;
                
                // Set initial description if option is already selected
                if (characterFeature.options && characterFeature.options[i]) {
                    const selectedOption = gameFeature.options.find(o => o.name === characterFeature.options[i]);
                    if (selectedOption) {
                        descriptionEl.innerHTML = parseDescription(selectedOption.description, 'charactercreator');
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
                choiceEl.dataset.choiceIndex = i;
                
                const selectEl = document.createElement('select');
                selectEl.classList.add('cc-manager-feature-content-choice-select');
                selectEl.dataset.featureName = gameFeature.name;
                selectEl.dataset.choiceIndex = i;
                selectEl.dataset.source = source;
                selectEl.onchange = () => handleChoiceSelection(gameFeature.name, i, modifier.type, selectEl.value, source);
                
                // Add default option
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = 'Choose an Option';
                selectEl.appendChild(defaultOption);
                
                // Add all available options
                if (modifier.from && Array.isArray(modifier.from)) {
                    modifier.from.forEach(choice => {
                        const optionEl = document.createElement('option');
                        optionEl.value = choice;
                        optionEl.textContent = choice;
                        // Mark as selected if already chosen
                        if (characterFeature.modifiers && characterFeature.modifiers[i] === choice) {
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
                if (characterFeature.options && characterFeature.options[i]) {
                    const selectedOption = gameFeature.options.find(o => o.name === characterFeature.options[i]);
                    if (selectedOption) {
                        descriptionEl.innerHTML = parseDescription(selectedOption.description, 'charactercreator');
                    }
                }
                
                choiceEl.appendChild(selectEl);
                choiceEl.appendChild(descriptionEl);
                choicesContainer.appendChild(choiceEl);
            });
            
            contentEl.appendChild(choicesContainer);
        }
        
        featureEl.appendChild(summaryEl);
        featureEl.appendChild(contentEl);
        featuresContainer.appendChild(featureEl);
    });
    
    // Update modifiers after generating features
    updateModifiers();
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
// FEATURE EVENT HANDLERS
// ============================================================================

/**
 * Get character feature from the specified source
 * @param {string} featureName - Name of the feature
 * @param {string} source - Source type ('class', 'race', 'background')
 * @returns {object|null} Character feature or null if not found
 */
function getCharacterFeature(featureName, source = 'class') {
    return characterData[source]?.features?.find(f => f.name === featureName) || null;
}

/**
 * Get game data for the specified source
 * @param {string} source - Source type ('class', 'race', 'background')
 * @returns {object|null} Game data or null if not found
 */
function getGameFeatureData(source = 'class') {
    let sourceKey = '';
    if (source === 'class') {
        sourceKey = 'classes';
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
function getGameFeature(featureName, source = 'class') {
    const sourceData = getGameFeatureData(source);
    return sourceData?.features?.find(f => f.name === featureName) || null;
}

/**
 * Handle option selection from a dropdown
 * @param {string} featureName - Name of the feature
 * @param {number} choiceIndex - Index of the choice
 * @param {string} optionName - Name of the selected option
 * @param {string} source - Source type ('class', 'race', 'background')
 */
function handleOptionSelection(featureName, choiceIndex, optionName, source = 'class') {
    const characterFeature = getCharacterFeature(featureName, source);
    if (!characterFeature) return;
    
    // Initialize options array if needed
    if (!characterFeature.options) {
        characterFeature.options = [];
    }
    
    // Update the selected option
    characterFeature.options[choiceIndex] = optionName || null;
    
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
                }
            }
        } else {
            descriptionEl.innerHTML = '';
        }
    }
    
    // Update the summary to reflect selected count
    const featureEl = document.querySelector(`[data-feature-name="${featureName}"]`);
    if (featureEl) {
        const selectedCount = characterFeature.options.filter(o => o).length;
        const gameFeature = getGameFeature(featureName, source);
        const choicesCount = gameFeature?.count || 1;
        const metaItem = featureEl.querySelector('.cc-manager-feature-summary-meta-item');
        if (metaItem && choicesCount > 0) {
            metaItem.textContent = `${selectedCount}/${choicesCount} Choices`;
        }
    }
    
    // Update modifiers
    updateModifiers();
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
        const descriptionEl = document.querySelector(`#cc-manager-feature-content-choice-description-${sanitizeFeatureName(featureName)}-${choiceIndex}`);
        if (featData) {
            descriptionEl.innerHTML = parseDescription(featData.description, 'charactercreator');
        } else {
            descriptionEl.innerHTML = '';
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
}

/**
 * Handle choice selection from a dropdown
 * @param {HTMLSelectElement} selectEl - The select element that was changed
 */
function handleAbilityModifierSelection(selectEl) {
    const ability = selectEl.getAttribute('ability');
    const value = selectEl.value;
    
    console.log('Ability modifier selected:', ability, value);
    
    characterData.abilities[ability].modifier = parseInt(value);

    updatePointBuy();
}

function updatePointBuy() {
    let points = 27;

    for (const ability in characterData.abilities) {
        if (ability === 'features') continue;
        points -= 3*(characterData.abilities[ability].modifier + 1);
        const selectEl = document.querySelector(`#cc-abilities-point-buy-selection-${ability}-select`);
        if (selectEl) {
            Object.values(selectEl.options).forEach(option => {
                const pointCost = 3*(characterData.abilities[ability].modifier - parseInt(option.value));
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
    }

    const pointBuyDisplayValueEl = document.querySelector('#cc-abilities-point-display-value');
    pointBuyDisplayValueEl.textContent = points;
}

// ============================================================================
// MODIFIER PROCESSING
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
    const sources = ['class', 'race', 'background', 'ability'];
    
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
                        source: {
                            source: source,
                            feature: characterFeature.name,
                            option: null,
                            modifierIndex: index,
                        }
                    };
                    characterData.modifiers.push(selectedModifier);
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
                            characterData.modifiers.push(modifierData);
                        });
                    }
                });
            }
        });
    });
    
    console.log('Updated modifiers:', characterData.modifiers);
}

// ============================================================================
// OTHER GENERATION FUNCTIONS (Placeholders - implement as needed)
// ============================================================================

function generateEquipment() {
    // TODO: Implement equipment generation
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

window.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded');

    const content = document.querySelector('#content-container');
    if (content) {
        content.classList.remove('content-loading');
    }

    currentSection = document.querySelector('#cc-builder-tab-class');

    loadCharacterBuilderData();
});


// ============================================================================
// EVENT HANDLERS
// ============================================================================

function showSection(sectionButton) {
    if (currentSection) {
        currentSection.classList.remove('active');
    }
    
    const sectionEl = document.querySelector(`#cc-builder-tab-${sectionButton.dataset.section}`);
    sectionEl.classList.add('active');
    
    currentSection = sectionEl;
}