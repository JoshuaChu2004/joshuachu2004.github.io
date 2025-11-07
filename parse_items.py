import json
import re

def parse_html_file(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Initialize dictionaries for each rarity
    items_by_rarity = {
        'common': [],
        'uncommon': [],
        'rare': [],
        'very-rare': [],
        'legendary': []
    }
    
    # Map rarity indices to rarity names
    rarity_map = {0: 'common', 1: 'uncommon', 2: 'rare', 3: 'very-rare', 4: 'legendary'}
    
    # Find all rarity tab sections
    # Pattern: <div id="wiki-tab-0-(\d+)"[^>]*>(.*?)(?=<div id="wiki-tab-0-|</div>\s*</div>\s*</div>\s*</div>)
    tab_pattern = r'<div id="wiki-tab-0-(\d+)"[^>]*>(.*?)(?=<div id="wiki-tab-0-\d+|</div>\s*</div>\s*</div>\s*</div>\s*</div>\s*</div>)'
    
    for tab_match in re.finditer(tab_pattern, content, re.DOTALL):
        rarity_index = int(tab_match.group(1))
        section_content = tab_match.group(2)
        rarity = rarity_map.get(rarity_index, 'uncommon')
        
        # Find all item rows in this section
        # Pattern: <tr> with <td><a href="...">name</a></td><td>type</td><td>attuned</td><td>source</td></tr>
        item_pattern = r'<tr>\s*<td><a href="(https://dnd5e\.wikidot\.com/([^:"]+):([^"]+))">([^<]+)</a></td>\s*<td>([^<]+)</td>\s*<td>([^<]+)</td>\s*<td>([^<]+)</td>\s*</tr>'
        
        for item_match in re.finditer(item_pattern, section_content):
            url = item_match.group(1)
            category = item_match.group(2)  # wondrous-items, armor, weapon, etc.
            item_slug = item_match.group(3)
            name = item_match.group(4).strip()
            item_type_str = item_match.group(5).strip()
            attuned_str = item_match.group(6).strip()
            source = item_match.group(7).strip()
            
            # Map item type to our categories
            item_type_str_lower = item_type_str.lower()
            if 'armor' in item_type_str_lower or 'shield' in item_type_str_lower:
                item_type = 'armor'
            elif 'weapon' in item_type_str_lower:
                item_type = 'weapon'
            elif 'potion' in item_type_str_lower:
                item_type = 'consumable'
            else:
                item_type = 'wondrous'
            
            # Map rarity rank
            rarity_rank_map = {
                'common': 1,
                'uncommon': 2,
                'rare': 3,
                'very-rare': 4,
                'legendary': 5
            }
            rarity_rank = rarity_rank_map.get(rarity, 2)
            
            # Determine attunement
            attuned = attuned_str == 'Attuned'
            
            # Create URL in the requested format
            if category == 'wondrous-items':
                url_formatted = f"https://dnd5e.wikidot.com/wondrous-items:{item_slug}"
            elif category == 'armor':
                url_formatted = f"https://dnd5e.wikidot.com/armor:{item_slug}"
            elif category == 'weapon':
                url_formatted = f"https://dnd5e.wikidot.com/weapon:{item_slug}"
            else:
                url_formatted = f"https://dnd5e.wikidot.com/{category}:{item_slug}"
            
            item = {
                "name": name,
                "item_type": item_type,
                "rarity": rarity,
                "rarity_rank": rarity_rank,
                "attuned": attuned,
                "attunement_requirement": "",
                "description": "",
                "homebrew": False,
                "url": url_formatted
            }
            items_by_rarity[rarity].append(item)
    
    return items_by_rarity

if __name__ == '__main__':
    items_by_rarity = parse_html_file('assets/Magic Items - DND 5th Edition.html')
    
    # Sort items alphabetically within each rarity
    for rarity in items_by_rarity:
        items_by_rarity[rarity].sort(key=lambda x: x['name'].lower())
    
    # Count total items
    total_items = sum(len(items) for items in items_by_rarity.values())
    
    with open('dnd/loot/allitems.json', 'w', encoding='utf-8') as f:
        json.dump(items_by_rarity, f, indent=2, ensure_ascii=False)
    
    print(f"Extracted {total_items} items")
    for rarity, items in items_by_rarity.items():
        print(f"  {rarity}: {len(items)} items")

