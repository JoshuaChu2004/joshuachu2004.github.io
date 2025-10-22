---
layout: bare
title: D&D Feats
permalink: /dnd/content/feats
feat_icon: fas fa-lock-open fa-8x
---
<div class="section toc no-border" markdown="1">
<div class="section-icon {{ page.feat_icon }}"></div>
<div class="feat-content" markdown="1">
# Feats

{% for feat in site.feats %}
{% if feat.finished %}
-  [{{ feat.title }}]({{ feat.url }}) <i class="fa-solid fa-star"></i>
{% else %}
- [{{ feat.title }}]({{ feat.url }})
{% endif %}
{% endfor %}
</div>
</div>