---
layout: bare
title: D&D Classes
permalink: /dnd/content/classes
barbarian_icon: fas fa-fire-flame-curved fa-8x
bard_icon: fas fa-guitar fa-8x
cleric_icon: fas fa-person-praying fa-8x
druid_icon: fa-solid fa-tree fa-8x
fighter_icon: fa-solid fa-gavel fa-8x
monk_icon: fa-solid fa-hand-fist fa-8x
paladin_icon: fa-solid fa-shield-halved fa-8x
ranger_icon: fa-solid fa-paw fa-8x
rogue_icon: fa-solid fa-eye-low-vision fa-8x
sorcerer_icon: fa-solid fa-hand-sparkles fa-8x
warlock_icon: fa-solid fa-dragon fa-8x
wizard_icon: fa-solid fa-wand-sparkles fa-8x
---
{% for class in site.classes %}
<div class="section toc" markdown="1">
<div class="section-icon {{ class.icon }}"></div>
<div class="class-content" markdown="1">
{% if class.finished %}

## [{{ class.title }}]( {{ class.url }}) <i class="fa-solid fa-star"></i>

{% else %}

## [{{ class.title }}]( {{ class.url }})

{% endif %}
***{{ class.description }}***
<br>

#### Homebrew Subclasses:
{% assign subclass_count = 0 %}
{% for subclass in site.subclasses %}
{% if subclass.class == class.class %}
{% assign subclass_count = subclass_count | plus: 1 %}

- [{{ subclass.title }}]({{ subclass.url }})
  {% endif %}
  {% endfor %}
  {% if subclass_count == 0 %}
  *None Available*
  {% endif %}
</div>
</div>
  {% endfor %}

<div class="section toc" markdown="1">
<div class="section-icon {{ page.barbarian_icon }}"></div>
<div class="class-content" markdown="1">
## The Barbarian

***For some, their rage springs from a communion with fierce animal spirits. Others draw from a roiling reservoir of anger at a world full of pain. For every barbarian, rage is a power that fuels not just a battle frenzy but also uncanny reflexes, resilience, and feats of strength.***

#### Homebrew Subclasses:
{% assign barbarian_count = 0 %}
{% for subclass in site.subclasses %}
{% if subclass.class == "Barbarian" %}
{% assign barbarian_count = barbarian_count | plus: 1 %}
{% if subclass.finished %}

- [{{ subclass.title }}]({{ subclass.url }}) <i class="fa-solid fa-star"></i>
{% else %}
- [{{ subclass.title }}]({{ subclass.url }})
{% endif %}
  {% endif %}
  {% endfor %}
  {% if barbarian_count == 0 %}
  *None Available*
  {% endif %}
</div>
</div>

<div class="section toc" markdown="1">
<div class="section-icon {{ page.bard_icon }}"></div>
<div class="class-content" markdown="1">

## The Bard

***Whether scholar, skald, or scoundrel, a bard weaves magic through words and music to inspire allies, demoralize foes, manipulate minds, create illusions, and even heal wounds. The bard is a master of song, speech, and the magic they contain.***

#### Homebrew Subclasses:
{% assign bard_count = 0 %}
{% for subclass in site.subclasses %}
{% if subclass.class == "Bard" %}
{% assign bard_count = bard_count | plus: 1 %}
{% if subclass.finished %}

- [{{ subclass.title }}]({{ subclass.url }}) <i class="fa-solid fa-star"></i>
{% else %}
- [{{ subclass.title }}]({{ subclass.url }})
{% endif %}
  {% endif %}
  {% endfor %}
  {% if bard_count == 0 %}
  *None Available*
  {% endif %}
</div>
</div>

<div class="section toc" markdown="1">
<div class="section-icon {{ page.cleric_icon }}"></div>
<div class="class-content" markdown="1">

## The Cleric

***Clerics are intermediaries between the mortal world and the distant planes of the gods. As varied as the gods they serve, clerics strive to embody the handiwork of their deities. No ordinary priest, a cleric is imbued with divine magic.***

#### Homebrew Subclasses:
{% assign cleric_count = 0 %}
{% for subclass in site.subclasses %}
{% if subclass.class == "Cleric" %}
{% assign cleric_count = cleric_count | plus: 1 %}
{% if subclass.finished %}

- [{{ subclass.title }}]({{ subclass.url }}) <i class="fa-solid fa-star"></i>
{% else %}
- [{{ subclass.title }}]({{ subclass.url }})
{% endif %}
  {% endif %}
  {% endfor %}
  {% if cleric_count == 0 %}
  *None Available*
  {% endif %}
</div>
</div>

<div class="section toc" markdown="1">
<div class="section-icon {{ page.druid_icon }}"></div>
<div class="class-content" markdown="1">

## The Druid

***Whether calling on the elemental forces of nature or emulating the creatures of the animal world, druids are an embodiment of nature's resilience, cunning, and fury. They claim no mastery over nature, but see themselves as extensions of nature's indomitable will.***

#### Homebrew Subclasses:
{% assign druid_count = 0 %}
{% for subclass in site.subclasses %}
{% if subclass.class == "Druid" %}
{% assign druid_count = druid_count | plus: 1 %}
{% if subclass.finished %}

- [{{ subclass.title }}]({{ subclass.url }}) <i class="fa-solid fa-star"></i>
{% else %}
- [{{ subclass.title }}]({{ subclass.url }})
{% endif %}
  {% endif %}
  {% endfor %}
  {% if druid_count == 0 %}
  *None Available*
  {% endif %}
</div>
</div>

<div class="section toc" markdown="1">
<div class="section-icon {{ page.fighter_icon }}"></div>
<div class="class-content" markdown="1">

## The Fighter

***Fighters share an unparalleled mastery with weapons and armor, and a thorough knowledge of the skills of combat. They are well acquainted with death, both meting it out and staring it defiantly in the face.***

#### Homebrew Subclasses:
{% assign fighter_count = 0 %}
{% for subclass in site.subclasses %}
{% if subclass.class == "Fighter" %}
{% assign fighter_count = fighter_count | plus: 1 %}
{% if subclass.finished %}

- [{{ subclass.title }}]({{ subclass.url }}) <i class="fa-solid fa-star"></i>
{% else %}
- [{{ subclass.title }}]({{ subclass.url }})
{% endif %}
  {% endif %}
  {% endfor %}
  {% if fighter_count == 0 %}
  *None Available*
  {% endif %}
</div>
</div>

<div class="section toc" markdown="1">
<div class="section-icon {{ page.monk_icon }}"></div>
<div class="class-content" markdown="1">

## The Monk

***Monks are united in their ability to magically harness the energy that flows in their bodies. Whether channeled as a striking display of combat prowess or a subtler focus of defensive ability and speed, this energy infuses all that a monk does.***

#### Homebrew Subclasses:
{% assign monk_count = 0 %}
{% for subclass in site.subclasses %}
{% if subclass.class == "Monk" %}
{% assign monk_count = monk_count | plus: 1 %}
{% if subclass.finished %}

- [{{ subclass.title }}]({{ subclass.url }}) <i class="fa-solid fa-star"></i>
{% else %}
- [{{ subclass.title }}]({{ subclass.url }})
{% endif %}
  {% endif %}
  {% endfor %}
  {% if monk_count == 0 %}
  *None Available*
  {% endif %}
</div>
</div>

<div class="section toc" markdown="1">
<div class="section-icon {{ page.paladin_icon }}"></div>
<div class="class-content" markdown="1">

## The Paladin

***Whether sworn before a god's altar and the witness of a priest, in a sacred glade before nature spirits and fey beings, or in a moment of desperation and grief with the dead as the only witness, a paladin's oath is a powerful bond.***

#### Homebrew Subclasses:
{% assign paladin_count = 0 %}
{% for subclass in site.subclasses %}
{% if subclass.class == "Paladin" %}
{% assign paladin_count = paladin_count | plus: 1 %}
{% if subclass.finished %}

- [{{ subclass.title }}]({{ subclass.url }}) <i class="fa-solid fa-star"></i>
{% else %}  
- [{{ subclass.title }}]({{ subclass.url }})
{% endif %}
  {% endif %}
  {% endfor %}
  {% if paladin_count == 0 %}
  *None Available*
  {% endif %}
</div>
</div>

<div class="section toc" markdown="1">
<div class="section-icon {{ page.ranger_icon }}"></div>
<div class="class-content" markdown="1">

## The Ranger

***Far from the bustle of cities and towns, past the hedges that shelter the most distant farms from the terrors of the wild, amid the dense-packed trees of trackless forests and across wide and empty plains, rangers keep their unending watch.***

#### Homebrew Subclasses:
{% assign ranger_count = 0 %}
{% for subclass in site.subclasses %}
{% if subclass.class == "Ranger" %}
{% assign ranger_count = ranger_count | plus: 1 %}
{% if subclass.finished %}

- [{{ subclass.title }}]({{ subclass.url }}) <i class="fa-solid fa-star"></i>
{% else %}
- [{{ subclass.title }}]({{ subclass.url }})
{% endif %}
  {% endif %}
  {% endfor %}
  {% if ranger_count == 0 %}
  *None Available*
  {% endif %}
</div>
</div>

<div class="section toc" markdown="1">
<div class="section-icon {{ page.rogue_icon }}"></div>
<div class="class-content" markdown="1">

## The Rogue

***Rogues rely on skill, stealth, and their foes' vulnerabilities to get the upper hand in any situation. They have a knack for finding the solution to just about any problem, demonstrating a resourcefulness and versatility that is the cornerstone of any successful adventuring party.***

#### Homebrew Subclasses:
{% assign rogue_count = 0 %}
{% for subclass in site.subclasses %}
{% if subclass.class == "Rogue" %}
{% assign rogue_count = rogue_count | plus: 1 %}
{% if subclass.finished %}

- [{{ subclass.title }}]({{ subclass.url }}) <i class="fa-solid fa-star"></i>
{% else %}
- [{{ subclass.title }}]({{ subclass.url }})
{% endif %}
  {% endif %}
  {% endfor %}
  {% if rogue_count == 0 %}
  *None Available*
  {% endif %}
</div>
</div>

<div class="section toc" markdown="1">
<div class="section-icon {{ page.sorcerer_icon }}"></div>
<div class="class-content" markdown="1">

## The Sorcerer

***Sorcerers carry a magical birthright conferred upon them by an exotic bloodline, some otherworldly influence, or exposure to unknown cosmic forces. No one chooses sorcery; the power chooses the sorcerer.***

#### Homebrew Subclasses:
{% assign sorcerer_count = 0 %}
{% for subclass in site.subclasses %}
{% if subclass.class == "Sorcerer" %}
{% assign sorcerer_count = sorcerer_count | plus: 1 %}
{% if subclass.finished %}

- [{{ subclass.title }}]({{ subclass.url }}) <i class="fa-solid fa-star"></i>
{% else %}
- [{{ subclass.title }}]({{ subclass.url }})
{% endif %}
  {% endif %}
  {% endfor %}
  {% if sorcerer_count == 0 %}
  *None Available*
  {% endif %}
</div>
</div>

<div class="section toc" markdown="1">
<div class="section-icon {{ page.warlock_icon }}"></div>
<div class="class-content" markdown="1">

## The Warlock

***Warlocks are seekers of the knowledge that lies hidden in the fabric of the multiverse. Through pacts made with mysterious beings of supernatural power, warlocks unlock magical effects both subtle and spectacular.***

#### Homebrew Subclasses:
{% assign warlock_count = 0 %}
{% for subclass in site.subclasses %}
{% if subclass.class == "Warlock" %}
{% assign warlock_count = warlock_count | plus: 1 %}
{% if subclass.finished %}

- [{{ subclass.title }}]({{ subclass.url }}) <i class="fa-solid fa-star"></i>
{% else %}
- [{{ subclass.title }}]({{ subclass.url }})
{% endif %}
  {% endif %}
  {% endfor %}
  {% if warlock_count == 0 %}
  *None Available*
  {% endif %}
</div> 
</div>

<div class="section toc no-border" markdown="1">
<div class="section-icon {{ page.wizard_icon }}"></div>
<div class="class-content" markdown="1">

## The Wizard

***Wizards are supreme magic-users, defined and united as a class by the spells they cast. Drawing on the subtle weave of magic that permeates the cosmos, wizards cast spells of explosive fire, arcing lightning, subtle deception, brute-force mind control, and much more.***

#### Homebrew Subclasses:
{% assign wizard_count = 0 %}
{% for subclass in site.subclasses %}
{% if subclass.class == "Wizard" %}
{% assign wizard_count = wizard_count | plus: 1 %}
{% if subclass.finished %}

- [{{ subclass.title }}]({{ subclass.url }}) <i class="fa-solid fa-star"></i>
{% else %} 
- [{{ subclass.title }}]({{ subclass.url }})
{% endif %}
  {% endif %}
  {% endfor %}
  {% if wizard_count == 0 %}
  *None Available*
  {% endif %}
</div>
</div>