import json
import os
import re
from pathlib import Path

def parse_markdown_file(filepath):
    """Parse a markdown file with YAML front matter and return the metadata and content."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Split front matter from content
    parts = content.split('---', 2)
    if len(parts) < 3:
        return None, None
    
    front_matter = parts[1].strip()
    description = parts[2].strip()
    
    # Parse YAML front matter (simple key-value parser)
    metadata = {}
    for line in front_matter.split('\n'):
        line = line.strip()
        if ':' in line:
            key, value = line.split(':', 1)
            key = key.strip()
            value = value.strip()
            
            # Remove quotes if present
            if value.startswith('"') and value.endswith('"'):
                value = value[1:-1]
            elif value.startswith("'") and value.endswith("'"):
                value = value[1:-1]
            
            # Convert boolean values
            if value.lower() == 'true':
                value = True
            elif value.lower() == 'false':
                value = False
            # Try to convert to int if it's numeric
            elif value.isdigit():
                value = int(value)
            
            metadata[key] = value
    
    return metadata, description

def map_item_type(item_type_str):
    """Map item_type string to our categories: armor, weapon, wondrous, consumable."""
    if not item_type_str:
        return 'wondrous'
    
    item_type_lower = item_type_str.lower()
    if 'armor' in item_type_lower or 'shield' in item_type_lower:
        return 'armor'
    elif 'weapon' in item_type_lower:
        return 'weapon'
    elif 'potion' in item_type_lower or 'consumable' in item_type_lower:
        return 'consumable'
    else:
        return 'wondrous'

def parse_items_directory(directory_path):
    """Parse all markdown files in the directory and return items organized by rarity and type."""
    # Initialize dictionaries for each rarity
    items_by_rarity = {
        'common': {
            'wondrous': [],
            'consumable': [],
            'weapon': [],
            'armor': [],
        },
        'uncommon': {
            'wondrous': [],
            'consumable': [],
            'weapon': [],
            'armor': [],
        },
        'rare': {
            'wondrous': [],
            'consumable': [],
            'weapon': [],
            'armor': [],
        },
        'very-rare': {
            'wondrous': [],
            'consumable': [],
            'weapon': [],
            'armor': [],
        },
        'legendary': {
            'wondrous': [],
            'consumable': [],
            'weapon': [],
            'armor': [],
        }
    }
    
    # Map rarity rank to rarity name
    rarity_rank_map = {
        1: 'common',
        2: 'uncommon',
        3: 'rare',
        4: 'very-rare',
        5: 'legendary'
    }
    
    # Get all markdown files in the directory
    directory = Path(directory_path)
    markdown_files = list(directory.glob('*.md'))
    
    item_count = 0
    for filepath in markdown_files:
        metadata, description = parse_markdown_file(filepath)
        
        if not metadata:
            print(f"Warning: Could not parse {filepath}")
            continue
        
        # Extract required fields
        name = metadata.get('title', '')
        item_type_str = metadata.get('item_type', '')
        rarity_rank = metadata.get('rarity_rank', 2)
        rarity_str = metadata.get('rarity', '').lower()
        attuned = metadata.get('attuned', False)
        attunement_requirement = metadata.get('attunement_requirement', '')
        
        # Determine rarity from rarity_rank or rarity string
        if rarity_rank in rarity_rank_map:
            rarity = rarity_rank_map[rarity_rank]
        elif rarity_str:
            rarity_map = {
                'common': 'common',
                'uncommon': 'uncommon',
                'rare': 'rare',
                'very-rare': 'very-rare',
                'very rare': 'very-rare',
                'legendary': 'legendary'
            }
            rarity = rarity_map.get(rarity_str, 'uncommon')
        else:
            rarity = 'uncommon'
            rarity_rank = 2
        
        # Map item type
        item_type = map_item_type(item_type_str)
        
        # Create URL (using Jekyll permalink pattern from _config.yml: /dnd/items/:name/)
        filename_without_ext = filepath.stem
        url = f"/dnd/items/{filename_without_ext}/"
        
        # Create item object
        item = {
            "name": name,
            "item_type": item_type,
            "rarity": rarity,
            "rarity_rank": rarity_rank,
            "attuned": attuned,
            "attunement_requirement": attunement_requirement if attunement_requirement else "",
            "description": description,
            "homebrew": True,
            "url": url
        }
        
        items_by_rarity[rarity][item_type].append(item)
        item_count += 1
        print(f"Extracted {item_count} items: {item.get('name')}")
    
    return items_by_rarity

if __name__ == '__main__':
    items_by_rarity = parse_items_directory('collections/_items')
    
    # Sort items alphabetically within each rarity and type
    for rarity in items_by_rarity:
        for item_type in items_by_rarity[rarity]:
            items_by_rarity[rarity][item_type].sort(key=lambda x: x['name'].lower())
    
    # Count total items
    total_items = sum(
        len(items) 
        for rarity_dict in items_by_rarity.values() 
        for items in rarity_dict.values()
    )
    
    with open('dnd/loot/homebrewitems.json', 'w', encoding='utf-8') as f:
        json.dump(items_by_rarity, f, indent=2, ensure_ascii=False)
    
    print(f"\nExtracted {total_items} items total")
    for rarity, rarity_dict in items_by_rarity.items():
        rarity_count = sum(len(items) for items in rarity_dict.values())
        if rarity_count > 0:
            print(f"  {rarity}: {rarity_count} items")
            for item_type, items in rarity_dict.items():
                if items:
                    print(f"    {item_type}: {len(items)} items")
