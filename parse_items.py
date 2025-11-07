import json
import re
import requests
from bs4 import BeautifulSoup

def get_html_content(url):
    response = requests.get(url)
    html_content = response.text
    return html_content

def parse_html_for_description(html_content):
    soup = BeautifulSoup(html_content, 'html.parser')
    page_content = soup.find(attrs={'id': 'page-content'})
    children = page_content.findChildren(recursive=False)
    children.pop()
    children.remove(children[0])
    children.remove(children[0])
    description = ""
    for child in children:
        description += str(child) + "\n"
    return description


def parse_html_file(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
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
    
    # Map rarity indices to rarity names
    rarity_map = {0: 'common', 1: 'uncommon', 2: 'rare', 3: 'very-rare', 4: 'legendary'}
    
    # Find all rarity tab sections
    # Pattern: <div id="wiki-tab-0-(\d+)"[^>]*>(.*?)(?=<div id="wiki-tab-0-|</div>\s*</div>\s*</div>\s*</div>)
    tab_pattern = r'<div id="wiki-tab-0-(\d+)"[^>]*>(.*?)(?=<div id="wiki-tab-0-\d+|</div>\s*</div>\s*</div>\s*</div>\s*</div>\s*</div>)'
    
    item_count = 0
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
            
            html_content = get_html_content(url_formatted)
            description = parse_html_for_description(html_content)

            item = {
                "name": name,
                "item_type": item_type,
                "rarity": rarity,
                "rarity_rank": rarity_rank,
                "attuned": attuned,
                "attunement_requirement": "",
                "description": description,
                "homebrew": False,
                "url": url_formatted
            }
            items_by_rarity[rarity][item_type].append(item)
            item_count += 1
            print(f"Extracted {item_count} items: {item.get('name')}")
    
    return items_by_rarity

if __name__ == '__main__':
    items_by_rarity = parse_html_file('assets/Magic Items - DND 5th Edition.html')
    
    # Sort items alphabetically within each rarity
    for rarity in items_by_rarity:
        for item_type in items_by_rarity[rarity]:
            items_by_rarity[rarity][item_type].sort(key=lambda x: x['name'].lower())
    
    # Count total items
    total_items = sum(len(items) for items in items_by_rarity.values())
    
    with open('dnd/loot/allitems.json', 'w', encoding='utf-8') as f:
        json.dump(items_by_rarity, f, indent=2, ensure_ascii=False)
    
    print(f"Extracted {total_items} items")
    for rarity, items in items_by_rarity.items():
        print(f"  {rarity}:")
        for item_type, items in items.items():
            for item in items:
                print(f"    {item_type}: {item.get('name')}")

