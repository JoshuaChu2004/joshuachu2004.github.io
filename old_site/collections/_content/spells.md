---
layout: bare
title: D&D Spells
permalink: /dnd/content/spells
spell_icon: fas fa-book-open fa-8x
---


<div class="section toc no-border" markdown="1">
<div class="section-icon {{ page.spell_icon }}"></div>
<div class="spell-content" markdown="1">
# Spells 

## [All Spells](/dnd/spells/)
{% for class in site.classes %}
{% if class.custom_spells %}
- [{{ class.title }} Spells](/dnd/spells/?type={{ class.class | downcase | replace: " ", "-" }})
{% endif %}
{% endfor %}
{% for subclass in site.subclasses %}
{% if subclass.custom_spells %}
- [{{ subclass.title }} Spells](/dnd/spells/?type={{ subclass.title | downcase | replace: " ", "-" }})
{% endif %}
{% endfor %}
</div>
</div>