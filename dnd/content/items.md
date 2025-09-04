---
layout: default
---

# Magic Items

A collection of custom magic items for D&D 5e campaigns.

## Weapons

{% for item in site.items %}
{% if item.category == 'weapon' %}
### [{{ item.title }}]({{ item.url }})
{{ item.description }}
{% endif %}
{% endfor %}

## Armor

{% for item in site.items %}
{% if item.category == 'armor' %}
### [{{ item.title }}]({{ item.url }})
{{ item.description }}
{% endif %}
{% endfor %}

## Wondrous Items

{% for item in site.items %}
{% if item.category == 'wondrous' %}
### [{{ item.title }}]({{ item.url }})
{{ item.description }}
{% endif %}
{% endfor %}

## Consumables

{% for item in site.items %}
{% if item.category == 'consumable' %}
### [{{ item.title }}]({{ item.url }})
{{ item.description }}
{% endif %}
{% endfor %}

## Creating New Items

To add a new magic item:

1. Create a markdown file in the items collection directory:
   - `_items/itemname.md`
2. The page will automatically be accessible at `/dnd/items/itemname/`
3. Update this overview page with a link to your new item

## Item Rarity Guidelines

- **Common:** Simple magical effects, minor utility
- **Uncommon:** Moderate power, useful in many situations  
- **Rare:** Significant power, specialized effects
- **Very Rare:** Powerful effects, campaign-changing abilities
- **Legendary:** Game-changing power, unique abilities

## Balance Considerations

When creating magic items:

- Consider the level of characters who might find them
- Balance attunement requirements appropriately
- Ensure effects don't overshadow class abilities
- Provide clear rules for how abilities work
- Include interesting lore and history
