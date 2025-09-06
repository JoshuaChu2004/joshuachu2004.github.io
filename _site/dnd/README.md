# D&D Homebrew - Jekyll Collections

This directory contains all the D&D homebrew content organized using Jekyll collections.

## Structure

```
dnd/
├── _layouts/
│   └── dnd.html          # Layout for all D&D content pages
├── _classes/              # Collection for classes/subclasses
│   └── warpriest.md
├── _items/                # Collection for magic items
│   └── flameblade.md
├── _spells/               # Collection for spells
├── _races/                # Collection for races
├── _feats/                # Collection for feats
├── _house-rules/          # Collection for house rules
├── _reworks/              # Collection for reworks
├── index.html             # Main D&D page
└── dndstyles.css          # Styling for D&D pages
```

## How It Works

### Jekyll Collections
- **`_classes/`** → `/dnd/classes/classname/`
- **`_items/`** → `/dnd/items/itemname/`
- **`_spells/`** → `/dnd/spells/spellname/`
- **`_races/`** → `/dnd/races/racename/`
- **`_feats/`** → `/dnd/feats/featname/`
- **`_house-rules/`** → `/dnd/house-rules/rulename/`
- **`_reworks/`** → `/dnd/reworks/reworkname/`

### Adding New Content

#### 1. Create a new class/subclass:
Create `dnd/_classes/classname.md`:
```markdown
---
layout: dnd
title: Class Name
collection: classes
content_type: Subclass
description: Brief description of the class
---

# Class Name

Your class content here...
```

#### 2. Create a new magic item:
Create `dnd/_items/itemname.md`:
```markdown
---
layout: dnd
title: Item Name
collection: items
content_type: Item
category: weapon  # weapon, armor, wondrous, or consumable
description: Brief description of the item
---

# Item Name

Your item content here...
```

#### 3. Create a new spell:
Create `dnd/_spells/spellname.md`:
```markdown
---
layout: dnd
title: Spell Name
collection: spells
content_type: Spell
description: Brief description of the spell
---

# Spell Name

Your spell content here...
```

## Front Matter Fields

### Required Fields:
- **`layout`**: Always use `dnd`
- **`title`**: The name of the content
- **`collection`**: The collection type (classes, items, spells, etc.)
- **`content_type`**: Human-readable type (Subclass, Item, Spell, etc.)
- **`description`**: Brief description for overview pages

### Optional Fields:
- **`category`**: For items (weapon, armor, wondrous, consumable)
- **`key_features`**: For classes (comma-separated list)

## Benefits of This System

✅ **Automatic URLs**: No need to manage routing manually  
✅ **Clean Structure**: All content organized by type  
✅ **Easy to Add**: Just create a markdown file with front matter  
✅ **Jekyll Compatible**: Works perfectly with GitHub Pages  
✅ **Scalable**: Add unlimited content without configuration  
✅ **SEO Friendly**: Proper URLs and meta descriptions  

## Local Development

1. Install Jekyll: `gem install jekyll bundler`
2. Install dependencies: `bundle install`
3. Run locally: `bundle exec jekyll serve`
4. Visit: `http://localhost:4000`

## Deployment

Simply push to GitHub and GitHub Pages will automatically build your Jekyll site with all the collections!
