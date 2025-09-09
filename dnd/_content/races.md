---
layout: bare
title: D&D Races
permalink: /dnd/content/races
race_icon: fas fa-users fa-8x
---
<div class="section toc no-border" markdown="1">
<div class="section-icon {{ page.race_icon }}"></div>
<div class="race-content" markdown="1">
# Races
{% for race in site.races %}
{% if race.finished %}
- [{{ race.title }}]({{ race.url }}) <i class="fa-solid fa-star"></i>
{% else %}
- [{{ race.title }}]({{ race.url }})
{% endif %}
{% endfor %}
</div>
</div>