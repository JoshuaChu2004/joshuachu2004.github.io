---
layout: bare
title: D&D Reworks
permalink: /dnd/content/reworks
reworks_icon: fas fa-arrows-rotate fa-8x
---
<div class="section toc no-border" markdown="1">
<div class="section-icon {{ page.reworks_icon }}"></div>
<div class="race-content" markdown="1">
# Reworks

## Classes
{% for rework in site.reworks %}
{% if rework.content_type == "Class" %}
{% if rework.finished %}
- [{{ rework.title }}]({{ rework.url }}) <i class="fa-solid fa-star"></i>
{% else %}
- [{{ rework.title }}]({{ rework.url }})
{% endif %}
{% else %}
{% endif %}
{% endfor %}

## Subclasses
{% for rework in site.reworks %}
{% if rework.content_type == "Subclass" %}
{% if rework.finished %}
- [{{ rework.title }}]({{ rework.url }}) <i class="fa-solid fa-star"></i>
{% else %}
- [{{ rework.title }}]({{ rework.url }})
{% endif %}
{% endif %}
{% endfor %}

## Spells
{% assign spells = site.reworks | where: "content_type", "Spell" | group_by: "level" | reverse %}
{% for rework in spells %}
{% for spell in rework.items %}
{% if spell.finished %}
- [{{ spell.title }}]({{ spell.url }}) <i class="fa-solid fa-star"></i>
{% else %}
- [{{ spell.title }}]({{ spell.url }})
{% endif %}
{% endfor %}
{% endfor %}
</div>
</div>
