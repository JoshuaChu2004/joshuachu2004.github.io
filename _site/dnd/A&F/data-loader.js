// Data Loader for Character Sheet
// Loads static game data (classes, races, backgrounds, feats) from JSON files

const gameDataCache = {};

/**
 * Load a class definition from JSON
 * @param {string} className - Name of the class (e.g., "Fighter")
 * @returns {Promise<Object>} Class data
 */
async function loadClass(className) {
    if (gameDataCache[`class_${className}`]) {
        return gameDataCache[`class_${className}`];
    }

    try {
        const response = await fetch(`/dnd/A&F/data/classes/${className.toLowerCase()}.json`);
        if (!response.ok) {
            throw new Error(`Failed to load class: ${className}`);
        }
        const classData = await response.json();
        gameDataCache[`class_${className}`] = classData;
        return classData;
    } catch (error) {
        console.error(`Error loading class ${className}:`, error);
        return null;
    }
}

/**
 * Load a race definition from JSON
 * @param {string} raceName - Name of the race (e.g., "Human")
 * @param {boolean} variant - Whether to load variant (if applicable)
 * @returns {Promise<Object>} Race data
 */
async function loadRace(raceName, variant = false) {
    const cacheKey = `race_${raceName}_${variant ? 'variant' : 'base'}`;
    if (gameDataCache[cacheKey]) {
        return gameDataCache[cacheKey];
    }

    try {
        const response = await fetch(`/dnd/A&F/data/races/${raceName.toLowerCase()}.json`);
        if (!response.ok) {
            throw new Error(`Failed to load race: ${raceName}`);
        }
        const raceData = await response.json();
        
        // If variant is requested and exists, merge variant data
        if (variant && raceData.variants && raceData.variants.variant) {
            const variantData = {
                ...raceData,
                ...raceData.variants.variant,
                name: raceData.variants.variant.name || raceData.name
            };
            gameDataCache[cacheKey] = variantData;
            return variantData;
        }
        
        gameDataCache[cacheKey] = raceData;
        return raceData;
    } catch (error) {
        console.error(`Error loading race ${raceName}:`, error);
        return null;
    }
}

/**
 * Load a background definition from JSON
 * @param {string} backgroundName - Name of the background (e.g., "Criminal")
 * @returns {Promise<Object>} Background data
 */
async function loadBackground(backgroundName) {
    if (gameDataCache[`background_${backgroundName}`]) {
        return gameDataCache[`background_${backgroundName}`];
    }

    try {
        const response = await fetch(`/dnd/A&F/data/backgrounds/${backgroundName.toLowerCase()}.json`);
        if (!response.ok) {
            throw new Error(`Failed to load background: ${backgroundName}`);
        }
        const backgroundData = await response.json();
        gameDataCache[`background_${backgroundName}`] = backgroundData;
        return backgroundData;
    } catch (error) {
        console.error(`Error loading background ${backgroundName}:`, error);
        return null;
    }
}

/**
 * Load a feat definition from JSON
 * @param {string} featName - Name of the feat
 * @returns {Promise<Object>} Feat data
 */
async function loadFeat(featName) {
    if (gameDataCache[`feat_${featName}`]) {
        return gameDataCache[`feat_${featName}`];
    }

    try {
        // Feats might be stored with spaces replaced by dashes or underscores
        const normalizedName = featName.toLowerCase().replace(/\s+/g, '-');
        const response = await fetch(`/dnd/A&F/data/feats/${normalizedName}.json`);
        if (!response.ok) {
            throw new Error(`Failed to load feat: ${featName}`);
        }
        const featData = await response.json();
        gameDataCache[`feat_${featName}`] = featData;
        return featData;
    } catch (error) {
        console.error(`Error loading feat ${featName}:`, error);
        return null;
    }
}

/**
 * Load all game data needed for a character
 * @param {Object} characterData - Character data object
 * @returns {Promise<Object>} Object containing all loaded game data
 */
async function loadCharacterGameData(characterData) {
    const gameData = {
        class: null,
        race: null,
        background: null,
        feats: [],
        prowesses: []
    };

    // Load class
    if (characterData.class?.name) {
        gameData.class = await loadClass(characterData.class.name);
    }

    // Load race
    if (characterData.race?.name) {
        gameData.race = await loadRace(characterData.race.name, characterData.race.variant || false);
    }

    // Load background
    if (characterData.background?.name) {
        gameData.background = await loadBackground(characterData.background.name);
    }

    // Load feats
    if (characterData.feats && Array.isArray(characterData.feats)) {
        for (const featName of characterData.feats) {
            const featData = await loadFeat(featName);
            if (featData) {
                gameData.feats.push(featData);
            }
        }
    }

    if (gameData.class?.classType === "Martial") {
        console.log("Loading prowesses for martial class");
        for (const level in gameData.class.prowesses) {
            console.log("Loading prowess for level", level);
            for (const prowessName of gameData.class.prowesses[level]) {
                console.log("Loading prowess", prowessName);
                const prowessData = await loadProwess(prowessName);
                if (prowessData) {
                    gameData.prowesses.push(prowessData);
                }
            }
        }
    }

    return gameData;
}

/**
 * Load a prowess definition from JSON
 * @param {string} prowessName - Name of the prowess
 * @returns {Promise<Object>} Prowess data
 */
async function loadProwess(prowessName) {
    try {
        const response = await fetch(`/dnd/A&F/data/prowesses/${prowessName.toLowerCase().replace(/\s+/g, '')}.json`);
        if (!response.ok) {
            throw new Error(`Failed to load prowess: ${prowessName}`);
        }
        const prowessData = await response.json();
        gameDataCache[`prowess_${prowessName}`] = prowessData;
        return prowessData;
    } catch (error) {
        console.error(`Error loading prowess ${prowessName}:`, error);
        return null;
    }
}

/**
 * Load an item definition from JSON
 * @param {string} itemName - Name of the item
 * @returns {Promise<Object>} Item data
 */
async function loadItem(itemName) {
    try {
        const response = await fetch(`/dnd/A&F/data/items/${itemName.toLowerCase().replace(/\s+/g, '')}.json`);
        if (!response.ok) {
            throw new Error(`Failed to load item: ${itemName}`);
        }
        const itemData = await response.json();
        gameDataCache[`item_${itemName}`] = itemData;
        return itemData;
    } catch (error) {
        console.error(`Error loading item ${itemName}:`, error);
        return null;
    }
}

// Export functions for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        loadClass,
        loadRace,
        loadBackground,
        loadFeat,
        loadProwess,
        loadItem,
        loadCharacterGameData
    };
}

