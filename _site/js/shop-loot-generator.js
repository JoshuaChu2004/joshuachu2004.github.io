// Shop Loot Generator JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('shop-generator-form');
    if (!form) return;
    const itemTypeSection = document.getElementById('item-type-section');
    const raritySection = document.getElementById('rarity-section');
    
    // Update slider value displays as user moves sliders
    const itemTypeSliders = itemTypeSection.querySelectorAll('.form-slider');
    const raritySliders = raritySection.querySelectorAll('.form-slider');
    const itemTypeSliderCount = itemTypeSliders.length;

    // Function to recalculate and update all item type slider percentages
    function updateItemTypePercentages() {
        // Recalculate total weight
        let totalWeight = 0;
        itemTypeSliders.forEach(slider => {
            totalWeight += parseInt(slider.value) || 0;
        });

        // Update all slider displays
        itemTypeSliders.forEach(slider => {
            const valueDisplay = document.getElementById(slider.id + '-value');
            if (valueDisplay) {
                if (totalWeight === 0) {
                    // If total is zero, show equal distribution
                    valueDisplay.textContent = (100 / itemTypeSliderCount).toFixed(0) + '%';
                } else {
                    // Calculate percentage based on current total
                    const percentage = ((parseInt(slider.value) || 0) / totalWeight * 100).toFixed(0);
                    valueDisplay.textContent = percentage + '%';
                }
            }
        });
    }

    // Set up event listeners for item type sliders
    itemTypeSliders.forEach(slider => {
        slider.addEventListener('input', function() {
            // When any slider changes, recalculate all percentages
            updateItemTypePercentages();
        });
        // Initialize display
        const valueDisplay = document.getElementById(slider.id + '-value');
        if (valueDisplay) {
            valueDisplay.textContent = slider.value;
        }
    });

    // Initialize item type percentages on page load
    updateItemTypePercentages();

    // Set up event listeners for rarity sliders
    raritySliders.forEach(slider => {
        const valueDisplay = document.getElementById(slider.id + '-value');
        if (valueDisplay) {
            // Update on input (real-time)
            slider.addEventListener('input', function() {
                valueDisplay.textContent = this.value;
            });
            // Initialize display
            valueDisplay.textContent = slider.value;
        }
    });
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get item type weights
        const itemTypeWeights = {
            armor: parseInt(document.getElementById('armor-weight').value) || 0,
            weapon: parseInt(document.getElementById('weapon-weight').value) || 0,
            wondrous: parseInt(document.getElementById('wondrous-weight').value) || 0,
            consumable: parseInt(document.getElementById('consumable-weight').value) || 0
        };
        
        // Get rarity counts
        const rarities = {
            common: parseInt(document.getElementById('common-count').value) || 0,
            uncommon: parseInt(document.getElementById('uncommon-count').value) || 0,
            rare: parseInt(document.getElementById('rare-count').value) || 0,
            'very-rare': parseInt(document.getElementById('very-rare-count').value) || 0,
            legendary: parseInt(document.getElementById('legendary-count').value) || 0
        };
        
        // Generate loot based on slider values
        const loot = generateShopLoot(itemTypeWeights, rarities);
        
        // Display results
        const resultsDiv = document.getElementById('results');
        const lootList = document.getElementById('loot-list');
        
        if (loot.length === 0) {
            lootList.innerHTML = '<li class="loot-list-item">No items selected. Please adjust the sliders to generate loot.</li>';
        } else {
            lootList.innerHTML = loot.map(item => `<li class="loot-list-item">${item}</li>`).join('');
        }
        
        resultsDiv.style.display = 'block';
        resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
});

function generateShopLoot(itemTypeWeights, rarities) {
    // This is a placeholder - you'll need to implement actual loot generation logic
    // based on your items collection or a loot table
    const loot = [];
    
    // Calculate total items to generate based on rarity counts
    const totalItems = Object.values(rarities).reduce((sum, count) => sum + count, 0);
    
    if (totalItems === 0) {
        return loot;
    }
    
    // Calculate total weight for probability distribution
    const totalWeight = Object.values(itemTypeWeights).reduce((sum, weight) => sum + weight, 0);
    
    // Generate items based on rarity counts, using weights to determine item types
    Object.keys(rarities).forEach(rarity => {
        const count = rarities[rarity];
        for (let i = 0; i < count; i++) {
            // Select item type based on weights
            let selectedType = 'item';
            if (totalWeight > 0) {
                const random = Math.random() * totalWeight;
                let currentWeight = 0;
                for (const [type, weight] of Object.entries(itemTypeWeights)) {
                    currentWeight += weight;
                    if (random <= currentWeight) {
                        selectedType = type;
                        break;
                    }
                }
            }
            
            const typeName = selectedType.charAt(0).toUpperCase() + selectedType.slice(1);
            const rarityName = rarity.charAt(0).toUpperCase() + rarity.slice(1).replace('-', ' ');
            loot.push(`${typeName} Item (${rarityName})`);
        }
    });
    
    return loot;
}
