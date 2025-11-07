---
layout: dnd
content_type: Tool
title: Shop Loot Generator
---
Generate random loot for shops based on location, shop type, and rarity preferences.
<div class="shop-container">

<form id="shop-generator-form" class="shop-generator-form">

<div id="item-type-section" class="slider-section">
<h3 class="slider-section-title">Set Item Type Weight</h3>
    
<div class="slider-group">
    <label class="slider-label" for="armor-weight">
        <span>Armor</span>
        <span class="slider-value" id="armor-weight-value">0</span>
    </label>
    <input type="range" id="armor-weight" name="armor-weight" class="form-slider" min="0" max="100" value="0">
    <label class="repeat-checkbox-label">
        <input type="checkbox" id="armor-allow-repeats" name="armor-allow-repeats">
        <span>Allow repeats</span>
    </label>
</div>

<div class="slider-group">
    <label class="slider-label" for="weapon-weight">
        <span>Weapon</span>
        <span class="slider-value" id="weapon-weight-value">0</span>
    </label>
    <input type="range" id="weapon-weight" name="weapon-weight" class="form-slider" min="0" max="100" value="0">
    <label class="repeat-checkbox-label">
        <input type="checkbox" id="weapon-allow-repeats" name="weapon-allow-repeats">
        <span>Allow repeats</span>
    </label>
</div>

<div class="slider-group">
    <label class="slider-label" for="wondrous-weight">
        <span>Wondrous Item</span>
        <span class="slider-value" id="wondrous-weight-value">0</span>
    </label>
    <input type="range" id="wondrous-weight" name="wondrous-weight" class="form-slider" min="0" max="100" value="0">
    <label class="repeat-checkbox-label">
        <input type="checkbox" id="wondrous-allow-repeats" name="wondrous-allow-repeats">
        <span>Allow repeats</span>
    </label>
</div>

<div class="slider-group">
        <label class="slider-label" for="consumable-weight">
        <span>Consumable</span>
        <span class="slider-value" id="consumable-weight-value">0</span>
    </label>
    <input type="range" id="consumable-weight" name="consumable-weight" class="form-slider" min="0" max="100" value="0">
    <label class="repeat-checkbox-label">
        <input type="checkbox" id="consumable-allow-repeats" name="consumable-allow-repeats" checked>
        <span>Allow repeats</span>
    </label>
</div>
</div>

<div id="rarity-section" class="slider-section">
<h3 class="slider-section-title">Set Rarity Count</h3>

<div class="slider-group">
    <label class="slider-label" for="common-count">
        <span>Common</span>
        <span class="slider-value" id="common-count-value">0</span>
    </label>
    <input type="range" id="common-count" name="common-count" class="form-slider" min="0" max="20" value="0">
</div>

<div class="slider-group">
    <label class="slider-label" for="uncommon-count">
        <span>Uncommon</span>
        <span class="slider-value" id="uncommon-count-value">0</span>
    </label>
    <input type="range" id="uncommon-count" name="uncommon-count" class="form-slider" min="0" max="20" value="0">
</div>

<div class="slider-group">
    <label class="slider-label" for="rare-count">
        <span>Rare</span>
        <span class="slider-value" id="rare-count-value">0</span>
    </label>
    <input type="range" id="rare-count" name="rare-count" class="form-slider" min="0" max="20" value="0">
</div>

<div class="slider-group">
    <label class="slider-label" for="very-rare-count">
        <span>Very Rare</span>
        <span class="slider-value" id="very-rare-count-value">0</span>
    </label>
    <input type="range" id="very-rare-count" name="very-rare-count" class="form-slider" min="0" max="20" value="0">
</div>

<div class="slider-group">
    <label class="slider-label" for="legendary-count">
        <span>Legendary</span>
        <span class="slider-value" id="legendary-count-value">0</span>
    </label>
    <input type="range" id="legendary-count" name="legendary-count" class="form-slider" min="0" max="20" value="0">
</div>

</div>

<button type="submit" class="form-button">Generate Shop Loot</button>
</form>

<div id="results" class="shop-results">
    <h3>Generated Loot</h3>
    <ul id="loot-list" class="loot-list"></ul>
    <table id="loot-table" class="loot-table">
        <thead>
            <tr>
                <th>Name</th>
                <th>Rarity</th>
                <th>Type</th>
                <th>Attuned</th>
                <th>Replace</th>
            </tr>
        </thead>
        <tbody id="loot-table-body">
        </tbody>
    </table>
</div>

<script src="/js/shop-loot-generator.js"></script>
</div>