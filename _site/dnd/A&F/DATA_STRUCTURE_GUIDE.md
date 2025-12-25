# Character Sheet Data Structure Guide

## Overview

The character sheet system uses a two-tier data structure:
1. **Character Data** (`characterdatatemplate.json`) - Stores only player choices and current state
2. **Game Data** (`data/` directory) - Stores static game rules (classes, races, backgrounds, feats)

## Why This Structure?

### Benefits:
- **Smaller character files**: Only store what's unique to each character
- **Easier updates**: Change game rules without touching character files
- **Consistency**: All characters use the same base rules
- **Maintainability**: Update class features in one place, affects all characters

## Character Data Structure

Stored in `characterdatatemplate.json` - **ONLY player choices and current state**:

```json
{
  "characterInfo": {
    "name": "Character Name",
    "class": "Fighter",        // Selection only
    "level": 1,
    "race": "Human",           // Selection only
    "background": "Criminal"   // Selection only
  },
  "abilities": {
    "strength": { "modifier": -1 }  // Player's ability scores
  },
  "class": {
    "name": "Fighter",
    "level": 1,
    "proficiencies": {
      "skills": ["Acrobatics", "Animal Handling"]  // Player's skill choices
    },
    "features": [
      {
        "name": "Fighting Style",
        "choices": [
          { "name": "Archery" }  // Player's feature choice
        ]
      }
    ],
    "prowesses": [
      { "name": "Second Wind", "flipped": false }  // Player's prowess state
    ]
  },
  "race": {
    "name": "Human",
    "variant": true,           // Player's variant choice
    "features": [
      {
        "name": "Skills",
        "choices": ["Intimidation"]  // Player's skill choice
      }
    ]
  },
  "vitals": {
    "hitPoints": { "current": 10, "max": 10 },  // Current state
    "stressSlots": { "current": 0, "max": 3 }
  }
}
```

## Game Data Structure

Stored in `data/` directory - **Static game rules**:

### Classes (`data/classes/fighter.json`)
Contains all class information:
- Hit die, hit points
- Proficiencies (armor, weapons, tools, skills)
- All available features and choices
- All prowesses with descriptions
- Level progression

### Races (`data/races/human.json`)
Contains all race information:
- Ability score increases
- Size, speed
- Languages
- All available features and choices
- Variant options

### Backgrounds (`data/backgrounds/criminal.json`)
Contains all background information:
- Skill proficiencies
- Tool proficiencies
- Languages
- Equipment
- Features

### Feats (`data/feats/*.json`)
Contains all feat information:
- Prerequisites
- Effects
- Descriptions

## How It Works

1. **Character loads** → Reads `characterdatatemplate.json`
2. **Game data loads** → Based on character selections, loads:
   - Class data from `data/classes/{class}.json`
   - Race data from `data/races/{race}.json`
   - Background data from `data/backgrounds/{background}.json`
   - Feat data from `data/feats/{feat}.json`
3. **Sheet generates** → Combines character choices with game data:
   - Calculates proficiencies from class + race + background
   - Loads feature descriptions from class data
   - Loads prowess descriptions from class data
   - Calculates modifiers, AC, saves, etc.

## Example: Loading and Using Data

```javascript
// 1. Load character data
const characterData = await fetch('/dnd/A&F/characterdatatemplate.json').then(r => r.json());

// 2. Load game data based on character selections
const gameData = await loadCharacterGameData(characterData);
// Returns: { class: {...}, race: {...}, background: {...}, feats: [...] }

// 3. Use game data to populate sheet
// Example: Get all available fighting styles
const fightingStyleFeature = gameData.class.features.find(f => f.name === "Fighting Style");
const availableStyles = fightingStyleFeature.choices;

// Example: Get prowess description
const secondWind = gameData.class.prowesses.find(p => p.name === "Second Wind");
console.log(secondWind.description); // Full description from class data

// Example: Calculate total proficiencies
const classProfs = gameData.class.proficiencies.armor || [];
const raceProfs = gameData.race.proficiencies?.armor || [];
const totalArmorProfs = [...new Set([...classProfs, ...raceProfs])];
```

## File Organization

```
dnd/A&F/
├── characterdatatemplate.json  # Character choices only
├── charactersheet.js           # Main sheet logic
├── data-loader.js             # Loads game data
└── data/
    ├── classes/
    │   ├── fighter.json
    │   ├── wizard.json
    │   └── ...
    ├── races/
    │   ├── human.json
    │   ├── elf.json
    │   └── ...
    ├── backgrounds/
    │   ├── criminal.json
    │   ├── noble.json
    │   └── ...
    └── feats/
        ├── great-weapon-master.json
        └── ...
```

## Best Practices

1. **Character files should NEVER contain:**
   - Full feature descriptions
   - All available choices for a feature
   - Static proficiencies (only store custom additions)
   - Calculated values (modifiers, AC, etc.)

2. **Character files SHOULD contain:**
   - Player selections (class, race, background)
   - Player choices (which fighting style, which skills)
   - Current state (HP, conditions, equipment)
   - Custom additions (homebrew items, custom features)

3. **Game data files should contain:**
   - Complete descriptions
   - All available options
   - Rules and mechanics
   - Prerequisites and requirements

## Migration Path

If you have existing character files with full data:

1. Extract static data → Move to `data/` directory
2. Keep only choices → Update character file
3. Update JavaScript → Use data loader to combine

Example migration:
```javascript
// OLD: Everything in character file
{
  "class": {
    "name": "Fighter",
    "features": [{
      "name": "Fighting Style",
      "description": "Full description here...",  // ❌ Remove
      "choices": [{
        "name": "Archery",
        "description": "Full description..."     // ❌ Remove
      }]
    }]
  }
}

// NEW: Only choices in character file
{
  "class": {
    "name": "Fighter",
    "features": [{
      "name": "Fighting Style",
      "choices": [{ "name": "Archery" }]  // ✅ Only choice
    }]
  }
}

// Description loaded from data/classes/fighter.json
```

