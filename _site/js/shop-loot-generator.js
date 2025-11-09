// Shop Loot Generator JavaScript
let lootTable = null; // Store loaded items data
let lootList = {}; // Store generated loot list

document.addEventListener('DOMContentLoaded', function() {
    // Load items data once when page loads
    fetch('/dnd/loot/allitems.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load items data');
            }
            return response.json();
        })
        .then(data => {
            lootTable = data;
            console.log('Items data loaded successfully: ', lootTable);
        })
        .catch(error => {
            console.error('Error loading items:', error);
        });
});

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
        
        // Get allow repeats settings
        const allowRepeats = {
            armor: document.getElementById('armor-allow-repeats').checked,
            weapon: document.getElementById('weapon-allow-repeats').checked,
            wondrous: document.getElementById('wondrous-allow-repeats').checked,
            consumable: document.getElementById('consumable-allow-repeats').checked
        };
        
        // Get rarity counts
        const rarities = {
            common: parseInt(document.getElementById('common-count').value) || 0,
            uncommon: parseInt(document.getElementById('uncommon-count').value) || 0,
            rare: parseInt(document.getElementById('rare-count').value) || 0,
            'very-rare': parseInt(document.getElementById('very-rare-count').value) || 0,
            legendary: parseInt(document.getElementById('legendary-count').value) || 0
        };

        if (lootList.length > 0) {
            const itemElements = document.querySelectorAll('.loot-item-row');
            itemElements.forEach(item => {
                const replaceCheckbox = item.querySelector('.loot-item-replace');
                if (replaceCheckbox.checked) {
                    const itemName = item.querySelector('a').textContent;
                    const itemRarity = item.querySelector('td:nth-child(2)').textContent;

                    rarity_rank_map = {
                        'common': 1,
                        'uncommon': 2,
                        'rare': 3,
                        'very-rare': 4,
                        'legendary': 5
                    }
                    const itemRarityRank = rarity_rank_map[itemRarity];
                    
                    lootList[itemName + itemRarityRank].replace = true;
                }
            });
        }
        // Generate loot based on slider values
        const loot = generateShopLoot(itemTypeWeights, rarities, allowRepeats);
        lootList = loot;
        
        // Display results
        displayLoot(loot);

        console.log(lootList);

        Object.keys(lootList).forEach(item => {
            console.log(item);
        });
    });
});

function displayLoot(loot) {
    const resultsDiv = document.getElementById('results');
    const lootList = document.getElementById('loot-list');
    const lootTableBody = document.getElementById('loot-table-body');
    if (loot.length === 0) {
        lootList.innerHTML = '<li class="loot-list-item">No items selected. Please adjust the sliders to generate loot.</li>';
    } else {
        lootTableBody.innerHTML = Object.values(loot).map((item, index) => displayItemTable(item, index)).join('');
        
        // Add click handlers for description toggles
        lootTableBody.querySelectorAll('.loot-item-row.has-description').forEach(row => {
            const toggle = row.querySelector('.description-toggle');
            if (toggle) {
                toggle.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    const index = row.dataset.index;
                    const descRow = document.getElementById(`desc-row-${index}`);
                    if (descRow) {
                        const isVisible = descRow.style.display !== 'none';
                        descRow.style.display = isVisible ? 'none' : 'table-row';
                        toggle.textContent = isVisible ? '▶' : '▼';
                        toggle.title = isVisible ? 'Click to show description' : 'Click to hide description';
                    }
                });
            }
        });
    }
    resultsDiv.style.display = 'block';
    resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function displayItemTable(item, index) {
    const hasDescription = item.description && item.description.trim() !== '';
    const descriptionRow = hasDescription ? `
        <tr class="loot-description-row" id="desc-row-${index}" style="display: none;">
            <td colspan="5" class="loot-description-cell">
                <div class="loot-description-content">
                    ${convertFormatting(item.description)}
                </div>
            </td>
        </tr>` : '';
    
    return `<tr class="loot-item-row ${hasDescription ? 'has-description' : ''}" data-index="${index}">
        <td>
            ${hasDescription ? '<span class="description-toggle" title="Click to show/hide description">▶</span>' : ''}
            <a href="${item.url}" target="_blank" rel="noopener">${item.name}</a> <span class="loot-item-count">${item.count > 1 ? `x${item.count}` : ''}</span>
        </td>
        <td>${capitalizeFirstLetter(item.rarity)}</td>
        <td>${capitalizeFirstLetter(item.item_type)}</td>
        <td>
            ${item.attuned ? 'Attuned' : '-'}
        </td>
        <td><input type="checkbox" class="loot-item-replace" data-index="${index}"></td>
    </tr>${descriptionRow}`;
}

function convertFormatting(html) {
    return html
        .replace(/<strong>(.*?)<\/strong>/gim, '<span class="bold">$1</span>')
        .replace(/<em>(.*?)<\/em>/gim, '<span class="italic">$1</span>')
        .replace(/<p>(.*?)<\/p>/gim, '<div class="paragraph">$1</div>')
        .replace(/<div class="paragraph"><\/div>/gim, '')
        .replace(/<br><br>/gim, '<br>')
        // Tables
        .replace(/<table([^>]*)>/gim, function(match, attributes) {
            // Extract id from table attributes
            const idMatch = attributes.match(/id="([^"]*)"/);
            const id = idMatch ? ` id="${idMatch[1]}"` : '';
            return `<div class="table-wrapper"${id}><table${attributes}>`;
        })
        .replace(/<table class="wiki-content-table"/gim, '<table class="item-table"')
        .replace(/<\/table>/gim, '</table></div>')
        .replace(/<thead([^>]*)>/gim, '<thead$1>')
        .replace(/<tbody([^>]*)>/gim, '<tbody$1>')
        .replace(/<tr([^>]*)>/gim, '<tr$1>')
        .replace(/<th([^>]*)>(.*?)<\/th>/gim, '<th$1>$2</th>')
        .replace(/<td([^>]*)>(.*?)<\/td>/gim, '<td$1>$2</td>')
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function generateShopLoot(itemTypeWeights, rarities, allowRepeats = {}) {
    const loot = [];
    const lootDictionary = { };
    
    // Check if items data is loaded
    if (!lootTable) {
        console.warn('Items data not loaded yet. Using placeholder items.');
        // Fallback to placeholder generation if data isn't loaded
        return generatePlaceholderLoot(itemTypeWeights, rarities);
    }

    if (lootList.length > 0) {
        Object.values(lootList).forEach(item => {
            if (!item.replace) {
                rarities[item.rarity]--;
                lootDictionary[item.name + item.rarity_rank] = item;
            } 
        });
    }
    
    // Calculate total items to generate based on rarity counts
    const totalItems = Object.values(rarities).reduce((sum, count) => sum + count, 0);
    
    if (totalItems === 0) {
        return loot;
    }
    
    // Calculate total weight for probability distribution
    const totalWeight = Object.values(itemTypeWeights).reduce((sum, weight) => sum + weight, 0);

    let noWeight = false;
    if (totalWeight === 0) {
        noWeight = true;
    }
    
    // Generate items based on rarity counts, using weights to determine item types
    Object.keys(rarities).forEach(rarity => {
        const count = rarities[rarity];
        for (let i = 0; i < count; i++) {
            // Select item type based on weights
            let selectedType = 'wondrous'; // Default fallback
            if (!noWeight) {
                const random = Math.random() * totalWeight;
                let currentWeight = 0;
                for (const [type, weight] of Object.entries(itemTypeWeights)) {
                    currentWeight += weight;
                    if (random <= currentWeight) {
                        selectedType = type;
                        break;
                    }
                }
            } else {
                selectedType = Object.keys(itemTypeWeights)[Math.floor(Math.random() * Object.keys(itemTypeWeights).length)];
            }
            
            // Get items of the selected type and rarity from loot table
            const rarityData = lootTable[rarity];
            if (rarityData && rarityData[selectedType] && rarityData[selectedType].length > 0) {
                // Randomly select an item from the available items
                const availableItems = JSON.parse(JSON.stringify(rarityData[selectedType]));
                let randomItem = availableItems[Math.floor(Math.random() * availableItems.length)];
                
                // Only check for duplicates if repeats are not allowed for this item type
                if (!allowRepeats[selectedType]) {
                    while (randomItem && lootDictionary[randomItem.name + randomItem.rarity_rank] && availableItems.length > 0) {
                        availableItems.splice(availableItems.indexOf(randomItem), 1);
                        if (availableItems.length > 0) {
                            randomItem = availableItems[Math.floor(Math.random() * availableItems.length)];
                        } else {
                            randomItem = null;
                        }
                    }
                }
                
                if (randomItem) {
                    // Only add to dictionary if we're tracking duplicates for this type
                    if (!lootDictionary[randomItem.name + randomItem.rarity_rank]) {
                        lootDictionary[randomItem.name + randomItem.rarity_rank] = randomItem;
                        lootDictionary[randomItem.name + randomItem.rarity_rank].count = 1;
                    } else {
                        lootDictionary[randomItem.name + randomItem.rarity_rank].count++;
                    }
                    loot.push(randomItem);
                }
            }
        }
    });
    
    //return Object.values(lootDictionary);
    return lootDictionary;
}

function generatePlaceholderLoot(itemTypeWeights, rarities) {
    const loot = [];
    
    // Calculate total items to generate based on rarity counts
    const totalItems = Object.values(rarities).reduce((sum, count) => sum + count, 0);
    
    if (totalItems === 0) {
        return loot;
    }
    
    // Calculate total weight for probability distribution
    const totalWeight = Object.values(itemTypeWeights).reduce((sum, weight) => sum + weight, 0);
    
    // Generate placeholder items
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
