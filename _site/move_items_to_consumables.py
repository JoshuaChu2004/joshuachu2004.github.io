#!/usr/bin/env python3
"""
Script to move wondrous-items that match names in a txt file to the consumables section
and change their item_type from "wondrous" to "consumable".
"""

import json
import sys
from pathlib import Path


def load_item_names(txt_file_path):
    """Load item names from a text file (one per line)."""
    try:
        with open(txt_file_path, 'r', encoding='utf-8') as f:
            # Read lines, strip whitespace, and filter out empty lines
            names = [line.strip() for line in f if line.strip()]
        return set(names)  # Use set for faster lookup
    except FileNotFoundError:
        print(f"Error: File '{txt_file_path}' not found.")
        sys.exit(1)
    except Exception as e:
        print(f"Error reading '{txt_file_path}': {e}")
        sys.exit(1)


def move_items_to_consumables(json_file_path, item_names, output_file_path=None):
    """
    Move matching wondrous-items to consumables section and update item_type.
    
    Args:
        json_file_path: Path to the JSON file
        item_names: Set of item names to move
        output_file_path: Optional path to save output (defaults to overwriting input)
    """
    # Load JSON file
    try:
        with open(json_file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"Error: File '{json_file_path}' not found.")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in '{json_file_path}': {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Error reading '{json_file_path}': {e}")
        sys.exit(1)
    
    moved_count = 0
    moved_items = set()  # Track which items were actually moved
    
    # Process each rarity level
    for rarity in data.keys():
        if not isinstance(data[rarity], dict):
            continue
            
        # Check if wondrous section exists
        if 'wondrous' not in data[rarity]:
            continue
            
        # Ensure consumable section exists
        if 'consumable' not in data[rarity]:
            data[rarity]['consumable'] = []
        
        # Find items to move
        items_to_move = []
        remaining_items = []
        
        for item in data[rarity]['wondrous']:
            if isinstance(item, dict) and item.get('name') in item_names:
                # Change item_type to consumable
                item['item_type'] = 'consumable'
                items_to_move.append(item)
                moved_items.add(item.get('name'))
                moved_count += 1
                print(f"Moving '{item['name']}' from wondrous to consumable (rarity: {rarity})")
            else:
                remaining_items.append(item)
        
        for item in data[rarity]['weapon']:
            if isinstance(item, dict) and item.get('name') in item_names:
                # Change item_type to consumable
                item['item_type'] = 'consumable'
                items_to_move.append(item)
                moved_items.add(item.get('name'))
                moved_count += 1
                print(f"Moving '{item['name']}' from wondrous to consumable (rarity: {rarity})")
            else:
                remaining_items.append(item)
        
        # Update the arrays
        data[rarity]['wondrous'] = remaining_items
        data[rarity]['consumable'].extend(items_to_move)
    
    # Report results
    print(f"\nTotal items moved: {moved_count}")
    
    # Check which items from the list weren't found
    not_found_items = item_names - moved_items
    if not_found_items:
        print(f"\nWarning: The following items were not found in any wondrous section:")
        for name in sorted(not_found_items):
            print(f"  - {name}")
    
    # Save the updated JSON
    output_path = output_file_path or json_file_path
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"\nUpdated JSON saved to: {output_path}")
    except Exception as e:
        print(f"Error saving JSON to '{output_path}': {e}")
        sys.exit(1)


def main():
    """Main function."""
    if len(sys.argv) < 3:
        print("Usage: python move_items_to_consumables.py <txt_file> <json_file> [output_file]")
        print("\nExample:")
        print("  python move_items_to_consumables.py items_to_move.txt allitems.json")
        print("  python move_items_to_consumables.py items_to_move.txt allitems.json output.json")
        sys.exit(1)
    
    txt_file = Path(sys.argv[1])
    json_file = Path(sys.argv[2])
    output_file = Path(sys.argv[3]) if len(sys.argv) > 3 else None
    
    # Load item names from txt file
    print(f"Loading item names from: {txt_file}")
    item_names = load_item_names(txt_file)
    print(f"Found {len(item_names)} item names to move\n")
    
    # Move items
    move_items_to_consumables(json_file, item_names, output_file)


if __name__ == '__main__':
    main()

