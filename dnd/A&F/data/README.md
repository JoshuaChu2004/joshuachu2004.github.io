# Character Sheet Data Structure

This directory contains static game data (classes, races, backgrounds, feats) that is loaded at runtime to populate the character sheet.

## Directory Structure

```
data/
├── classes/
│   └── fighter.json
├── races/
│   └── human.json
├── backgrounds/
│   └── criminal.json
└── feats/
    └── example.json
```

## Data File Structure

### Classes (`classes/*.json`)

Classes define:
- **hitDie**: The hit die type (e.g., "d10")
- **hitPointsAtFirstLevel**: Base HP at level 1
- **proficiencies**: Armor, weapons, tools, languages, and skills
- **features**: Class features with choices (e.g., Fighting Style)
- **prowesses**: Martial prowesses/abilities available to the class
- **levelFeatures**: Features gained at each level

Example:
```json
{
  "name": "Fighter",
  "hitDie": "d10",
  "proficiencies": {
    "armor": ["Light", "Medium", "Heavy"],
    "weapons": ["Simple", "Martial"],
    "skills": {
      "choose": 2,
      "from": ["Acrobatics", "Athletics", ...]
    }
  },
  "features": [...],
  "prowesses": [...]
}
```

### Races (`races/*.json`)

Races define:
- **size**: Creature size
- **speed**: Movement speeds
- **languages**: Starting languages
- **features**: Racial features (may include choices)
- **variants**: Optional variant rules (e.g., Variant Human)

Example:
```json
{
  "name": "Human",
  "abilityScoreIncrease": {
    "strength": 1,
    "dexterity": 1,
    ...
  },
  "speed": { "walking": 30 },
  "features": [...],
  "variants": {
    "variant": { ... }
  }
}
```

### Backgrounds (`backgrounds/*.json`)

Backgrounds define:
- **skillProficiencies**: Skills granted by the background
- **toolProficiencies**: Tool proficiencies
- **languages**: Languages granted
- **equipment**: Starting equipment
- **features**: Background features

Example:
```json
{
  "name": "Criminal",
  "skillProficiencies": ["Deception", "Stealth"],
  "toolProficiencies": ["Thieves' Tools"],
  "features": [...]
}
```

### Feats (`feats/*.json`)

Feats define:
- **prerequisites**: Requirements (ability scores, level, etc.)
- **description**: What the feat does
- **effects**: Ability score increases, features, etc.

Example:
```json
{
  "name": "Example Feat",
  "prerequisites": {
    "abilityScores": { "strength": 13 }
  },
  "effects": {
    "abilityScoreIncrease": { "strength": 1 },
    "features": [...]
  }
}
```

## Usage

Load data using the `data-loader.js` module:

```javascript
// Load a class
const fighterData = await loadClass("Fighter");

// Load a race (with variant)
const humanData = await loadRace("Human", true);

// Load a background
const criminalData = await loadBackground("Criminal");

// Load all data for a character
const gameData = await loadCharacterGameData(characterData);
```

## File Naming Convention

- Use lowercase filenames
- Replace spaces with hyphens or underscores
- Match the name field in the JSON (case-insensitive)

Examples:
- `Fighter` → `fighter.json`
- `Variant Human` → `variant-human.json` or `human.json` (with variant flag)

## Adding New Data

1. Create a new JSON file in the appropriate directory
2. Follow the structure of existing files
3. Ensure the `name` field matches the filename (case-insensitive)
4. Test loading the data in the character sheet

