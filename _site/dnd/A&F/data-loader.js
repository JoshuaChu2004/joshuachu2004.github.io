// Data Loader for Character Sheet
// Loads static game data (classes, races, backgrounds, feats) from JSON files

const gameDataCache = {};

async function loadBuilderGameData() {
    try {
        const gameData = {
            classes: await loadAllClasses(),
            subclasses: await loadAllSubclasses(),
            races: await loadAllRaces(),
            backgrounds: await loadAllBackgrounds(),
            feats: await loadAllFeats(),
            items: await loadAllItems(),
            prowesses: await loadAllProwesses(),
            spells: await loadAllSpells(),
            abilities: await loadAllAbilities()
        };
        return gameData;
    } catch (error) {
        console.error(`Error loading builder game data:`, error);
        return null;
    }
}

async function loadAllClasses() {
    try {
        const response = await fetch(`/dnd/A&F/data/dataLists/classlist.json`);
        if (!response.ok) {
            throw new Error(`Failed to load all classes`);
        }

        const classList = await response.json();

        const classesData = [];
        
        for (const className of classList.classes) {
            const classData = await loadClass(className);
            if (classData) {
                classesData.push(classData);
            }
        }
        console.log("Classes Data:", classesData);

        return classesData;

    } catch (error) {
        console.error(`Error loading all classes:`, error);
        return null;
    }
}

async function loadAllSubclasses() {
    try {
        const response = await fetch(`/dnd/A&F/data/dataLists/subclasslist.json`);
        if (!response.ok) {
            throw new Error(`Failed to load all subclasses`);
        }
        const subclassList = await response.json();
        const subclassesData = {
            "cleric": [],
            "fighter": [],
            "rogue": [],
            "wizard": [],
            "bard": [],
            "druid": [],
            "paladin": [],
            "ranger": [],
            "sorcerer": [],
            "warlock": []
        };
        for (const className of Object.keys(subclassList)) {
            for (const subclassName of subclassList[className]) {
                const subclassData = await loadSubclass(subclassName);
                if (subclassData) {
                    subclassesData[className].push(subclassData);
                }
            }
        }
        return subclassesData;
    }
    catch (error) {
        console.error(`Error loading all subclasses:`, error);
        return null;
    }
}
async function loadAllRaces() {
    try {
        const response = await fetch(`/dnd/A&F/data/dataLists/racelist.json`);
        if (!response.ok) {
            throw new Error(`Failed to load all races`);
        }
        const raceList = await response.json();
        const racesData = [];
        for (const raceName of raceList.races) {
            const raceData = await loadRace(raceName);
            if (raceData) {
                racesData.push(raceData);
            }
        }
        return racesData;
    }
    catch (error) {
        console.error(`Error loading all races:`, error);
        return null;
    }
}

async function loadAllBackgrounds() {
    try {
        const response = await fetch(`/dnd/A&F/data/dataLists/backgroundlist.json`);
        if (!response.ok) {
            throw new Error(`Failed to load all backgrounds`);
        }
        const backgroundList = await response.json();
        const backgroundsData = [];
        for (const backgroundName of backgroundList.backgrounds) {
            const backgroundData = await loadBackground(backgroundName);
            if (backgroundData) {
                backgroundsData.push(backgroundData);
            }
        }
        return backgroundsData;
    }
    catch (error) {
        console.error(`Error loading all backgrounds:`, error);
        return null;
    }
}

async function loadAllFeats() {
    try {
        const response = await fetch(`/dnd/A&F/data/dataLists/featlist.json`);
        if (!response.ok) {
            throw new Error(`Failed to load all feats`);
        }
        const featList = await response.json();
        const featsData = [];
        for (const featName of featList.feats) {
            const featData = await loadFeat(featName);
            if (featData) {
                featsData.push(featData);
            }
        }
        return featsData;
    }
    catch (error) {
        console.error(`Error loading all feats:`, error);
        return null;
    }
}

async function loadAllProwesses() {
    try {
        const response = await fetch(`/dnd/A&F/data/dataLists/prowesslist.json`);
        if (!response.ok) {
            throw new Error(`Failed to load all prowesses`);
        }
        const prowessList = await response.json();
        const prowessesData = [];
        for (const prowessName of prowessList.prowesses) {
            const prowessData = await loadProwess(prowessName);
            if (prowessData) {
                prowessesData.push(prowessData);
            }
        }
        return prowessesData;
    }
    catch (error) {
        console.error(`Error loading all prowesses:`, error);
        return null;
    }
}

async function loadAllSpells() {
    try {
        const response = await fetch(`/dnd/A&F/data/dataLists/spelllist.json`);
        if (!response.ok) {
            throw new Error(`Failed to load all spells`);
        }
        const spellList = await response.json();
        const spellsData = {
            spells: [],
            cantrips: [],
        };
        for (const spellName of spellList.spells) {
            const spellData = await loadSpell(spellName);
            if (spellData) {
                spellsData.spells.push(spellData);
            }
        }
        for (const cantripName of spellList.cantrips) {
            const cantripData = await loadSpell(cantripName);
            if (cantripData) {
                spellsData.cantrips.push(cantripData);
            }
        }
        return spellsData;
    }
    catch (error) {
        console.error(`Error loading all spells:`, error);
        return null;
    }
}

async function loadAllItems() {
    try {
        const response = await fetch(`/dnd/A&F/data/dataLists/itemlist.json`);
        if (!response.ok) {
            throw new Error(`Failed to load all items`);
        }
        const itemList = await response.json();
        const itemsData = {
            "packs": [],
            "weapons": {
                "simple": [],
                "martial": [],
            },
            "armor": {
                "light": [],
                "medium": [],
                "heavy": [],
                "shield": [],
            },
            "items": [],
            "byId": {},
        };
        for (const itemName of itemList.items) {
            const itemData = await loadItem(itemName);
            if (itemData) {
                itemsData.items.push(itemData);
                itemsData.byId[itemData.id] = itemData;
            }
        }
        for (const packName of itemList.packs) {
            const packData = await loadPack(packName);
            if (packData) {
                itemsData.packs.push(packData);
                itemsData.byId[packData.id] = packData;
            }
        }
        for (const weaponName of itemList.weapons) {
            const weaponData = await loadWeapon(weaponName);
            if (weaponData) {
                itemsData.weapons[weaponData.category].push(weaponData);
                itemsData.byId[weaponData.id] = weaponData;
            }
        }
        for (const armorName of itemList.armor) {
            const armorData = await loadArmor(armorName);
            if (armorData) {
                itemsData.armor[armorData.category].push(armorData);
                itemsData.byId[armorData.id] = armorData;
            }
        }
        return itemsData;
    }
    catch (error) {
        console.error(`Error loading all items:`, error);
        return null;
    }
}

async function loadAllAbilities() {
    try {
        const response = await fetch(`/dnd/A&F/data/dataLists/abilitylist.json`);
        if (!response.ok) {
            throw new Error(`Failed to load all abilities`);
        }
        const abilityList = await response.json();
        const abilitiesData = [];
        for (const abilityName of abilityList.abilities) {
            const abilityData = await loadAbility(abilityName);
            if (abilityData) {
                abilitiesData.push(abilityData);
            }
        }
        return abilitiesData;
    }
    catch (error) {
        console.error(`Error loading all abilities:`, error);
        return null;
    }
}

async function loadAllUniversals() {
    try {
        const response = await fetch(`/dnd/A&F/data/dataLists/universallist.json`);
        if (!response.ok) {
            throw new Error(`Failed to load all universals`);
        }
        const universalList = await response.json();
        const universalsData = [];
        for (const universalName of universalList.universals) {
            const universalData = await loadUniversal(universalName);
            if (universalData) {
                universalsData.push(universalData);
            }
        }
        return universalsData;
    }
    catch (error) {
        console.error(`Error loading all universals:`, error);
        return null;
    }
}

async function loadUniversal(universalName) {
    try {
        const response = await fetch(`/dnd/A&F/data/universal/${universalName.toLowerCase()}.json`);
        if (!response.ok) {
            throw new Error(`Failed to load universal: ${universalName}`);
        }
        const universalData = await response.json();
        gameDataCache[`universal_${universalName}`] = universalData;
        return universalData;
    }
    catch (error) {
        console.error(`Error loading universal ${universalName}:`, error);
        return null;
    }
}

async function loadAbility(abilityName) {
    if (gameDataCache[`ability_${abilityName}`]) {
        return gameDataCache[`ability_${abilityName}`];
    }

    try {
        const response = await fetch(`/dnd/A&F/data/abilities/${abilityName.toLowerCase()}.json`);
        if (!response.ok) {
            throw new Error(`Failed to load ability: ${abilityName}`);
        }
        const abilityData = await response.json();
        gameDataCache[`ability_${abilityName}`] = abilityData;
        return abilityData;
    } catch (error) {
        console.error(`Error loading ability ${abilityName}:`, error);
        return null;
    }
}
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



async function loadSubclass(subclassName) {
    try {
        const response = await fetch(`/dnd/A&F/data/classes/subclasses/${subclassName.toLowerCase().replace(/\s+/g, '')}.json`);
        if (!response.ok) {
            throw new Error(`Failed to load subclass: ${subclassName}`);
        }
        const subclassData = await response.json();
        gameDataCache[`subclass_${subclassName}`] = subclassData;
        return subclassData;
    } catch (error) {
        console.error(`Error loading subclass ${subclassName}:`, error);
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
        prowesses: [],
        spells: {
            spells: [],
            cantrips: [],
        },
        subclass: null,
        universal: null,
        items: await loadAllItems()
    };

    // Load class
    if (characterData.class?.name) {
        gameData.class = await loadClass(characterData.class.name);
    }

    if (characterData.class?.subclass?.name) {
        gameData.subclass = await loadSubclass(characterData.class.subclass.name);
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
        for (const feat of characterData.feats) {
            const featData = await loadFeat(feat.name);
            if (featData) {
                gameData.feats.push(featData);
            }
        }
    }

    if (gameData.class.prowessInfo.canUseProwesses) {
        console.log("Loading prowesses for martial class");
        const prowessList = [];
        Object.values(gameData.class.prowessInfo.prowessList).forEach(level => {
            console.log("Loading prowess for level", level);
            level.forEach((prowessName) => {
                console.log("Loading prowess", prowessName);
                prowessList.push(prowessName);
            });
        });
        
        for (const prowessName of prowessList) {
            const prowessData = await loadProwess(prowessName);
            if (prowessData) {
                gameData.prowesses.push(prowessData);
            }
        }
    }

    if (gameData.class.spellInfo.canCastSpells) {
        console.log("Loading spells for spellcaster class");

        debugger;

        const spellsList = {
            spells: [],
            cantrips: [],
        };
        Object.entries(gameData.class.spellInfo.spellList).forEach(([key, value]) => {
            value.forEach((spellName) => {
                if (key === "0") {
                    spellsList.cantrips.push(spellName);
                } else {
                    spellsList.spells.push(spellName);
                }
            });
        });

        Object.entries(characterData.class.spells.spells).forEach(([key, value]) => {
            if (spellsList.spells.find(s => s.name === value.name) === undefined) {
                spellsList.spells.push(value.name);
            }
        });
        Object.entries(characterData.class.spells.cantrips).forEach(([key, value]) => {
            if (spellsList.cantrips.find(c => c.name === value.name) === undefined) {
                spellsList.cantrips.push(value.name);
            }
        });

        for (const spellName of spellsList.cantrips) {
            const spellData = await loadSpell(spellName);
            if (spellData) {
                gameData.spells.cantrips.push(spellData);
            }
        }
        for (const spellName of spellsList.spells) {
            const spellData = await loadSpell(spellName);
            if (spellData) {
                gameData.spells.spells.push(spellData);
            }
        }
    }

    gameData.universal = await loadAllUniversals();
    
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


async function loadSpell(spellName) {
    try {
        const response = await fetch(`/dnd/A&F/data/spells/${spellName.toLowerCase().replace(/\s+/g, '')}.json`);
        if (!response.ok) {
            throw new Error(`Failed to load spell: ${spellName}`);
        }
        const spellData = await response.json();
        gameDataCache[`spell_${spellName}`] = spellData;
        return spellData;
    }
    catch (error) {
        console.error(`Error loading spell ${spellName}:`, error);
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
        const response = await fetch(`/dnd/A&F/data/items/${itemName.toLowerCase().replace(/\s+/g, '').replace(/,/g, '').replace(/ /g, '').replace(/'/g, '')}.json`);
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

/**
 * Load an item definition from JSON
 * @param {string} packName - Name of the pack
 * @returns {Promise<Object>} Item data
 */
async function loadPack(packName) {
    try {
        const response = await fetch(`/dnd/A&F/data/items/packs/${packName.toLowerCase().replace(/\s+/g, '').replace(/,/g, '').replace(/ /g, '').replace(/'/g, '')}.json`);
        if (!response.ok) {
            throw new Error(`Failed to load pack: ${packName}`);
        }
        const packData = await response.json();
        gameDataCache[`pack_${packName}`] = packData;
        return packData;
    } catch (error) {
        console.error(`Error loading pack ${packName}:`, error);
        return null;
    }
}

async function loadWeapon(weaponName) {
    try {
        const response = await fetch(`/dnd/A&F/data/items/weapons/${weaponName.toLowerCase().replace(/\s+/g, '').replace(/,/g, '').replace(/ /g, '').replace(/'/g, '')}.json`);
        if (!response.ok) {
            throw new Error(`Failed to load weapon: ${weaponName}`);
        }
        const weaponData = await response.json();
        gameDataCache[`weapon_${weaponName}`] = weaponData;
        return weaponData;
    }
    catch (error) {
        console.error(`Error loading weapon ${weaponName}:`, error);
        return null;
    }
}

async function loadArmor(armorName) {
    try {
        const response = await fetch(`/dnd/A&F/data/items/armor/${armorName.toLowerCase().replace(/\s+/g, '').replace(/,/g, '').replace(/ /g, '').replace(/'/g, '')}.json`);
        if (!response.ok) {
            throw new Error(`Failed to load armor: ${armorName}`);
        }
        const armorData = await response.json();
        gameDataCache[`armor_${armorName}`] = armorData;
        return armorData;
    }
    catch (error) {
        console.error(`Error loading armor ${armorName}:`, error);
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
        loadCharacterGameData,
        loadBuilderGameData
    };
}

