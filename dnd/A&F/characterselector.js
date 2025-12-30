function loadCharacters() {
    console.log('Loading characters...');
    const characterList = document.querySelector('.cl-character-list');
    const characterHexIds = JSON.parse(localStorage.getItem('characterHexIds'));

    characterList.innerHTML = '';
    if (characterHexIds) {
        console.log('Character hex ids:', characterHexIds);
        characterHexIds.forEach(hexId => {
            const characterData = JSON.parse(localStorage.getItem(`characterData-${hexId}`));
            console.log('Character data:', characterData);
            if (characterData) {
                characterList.appendChild(generateCharacterItem(characterData));
            }
        });
    }
}

function generateCharacterItem(characterData) {
    const characterItem = document.createElement('div');
    characterItem.classList.add('cl-character-item');
    characterItem.setAttribute('hex-id', characterData.hexId);
    characterItem.innerHTML = `
    <div class="cl-character-name">${characterData.characterInfo.name}</div>
    <div class="cl-character-info">
        <div class="cl-character-class">${characterData.characterInfo.class}</div>
        <div class="cl-character-level">${characterData.characterInfo.level}</div>
        <div class="cl-character-race">${characterData.characterInfo.race}</div>
    </div>
    <div class="cl-character-actions">
        <button id="cl-character-view-button" class="cl-character-button" onclick="viewCharacter(this)">View</button>
        <button id="cl-character-edit-button" class="cl-character-button" onclick="editCharacter(this)">Edit</button>
        <button id="cl-character-delete-button" class="cl-character-button" onclick="deleteCharacter(this)">Delete</button>
    </div>`;

    return characterItem;
}

function newCharacter() {
    console.log('New character');
    window.location.href = `/dnd/tools/anfcharactercreator`;
}

function uploadCharacter() {
    const fileInput = document.querySelector('#cl-upload-character-file');
    const file = fileInput.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const uploadedData = JSON.parse(e.target.result);
                
                // Ensure hexId exists (generate if missing)
                if (!uploadedData.hexId) {
                    uploadedData.hexId = generateHexId();
                }
                
                // Check if character already exists
                const existingCharacterData = localStorage.getItem(`characterData-${uploadedData.hexId}`);
                if (existingCharacterData) {
                    const existingCharacter = JSON.parse(existingCharacterData);
                    const existingName = existingCharacter.characterInfo?.name || 'Unknown Character';
                    const newName = uploadedData.characterInfo?.name || 'Unknown Character';
                    
                    // Show confirmation dialog
                    const confirmMessage = `A character with this ID already exists:\n\n` +
                        `Existing: ${existingName}\n` +
                        `New: ${newName}\n\n` +
                        `Uploading will overwrite the existing character. Do you want to continue?`;
                    
                    if (!confirm(confirmMessage)) {
                        // User cancelled, reset file input and return
                        fileInput.value = '';
                        return;
                    }
                    
                    console.log('Character already exists, overwriting...');
                }
                
                // Save to localStorage
                localStorage.setItem(`characterData-${uploadedData.hexId}`, JSON.stringify(uploadedData));
                
                // Update character index
                let characterHexIds = JSON.parse(localStorage.getItem('characterHexIds') || '[]');
                if (!characterHexIds.includes(uploadedData.hexId)) {
                    characterHexIds.push(uploadedData.hexId);
                    localStorage.setItem('characterHexIds', JSON.stringify(characterHexIds));
                }
                
                // Reload the character list display
                loadCharacters();

                } catch (error) {
                console.error('Error uploading character:', error);
                alert('Error uploading character file. Please ensure it is valid JSON.');
            }
        };
        reader.readAsText(file);
        
        // Reset file input so same file can be uploaded again if needed
        fileInput.value = '';
    }
}

function generateHexId() {
    return Math.random().toString(16).substring(2, 10);
}

function viewCharacter(button) {
    const hexId = button.parentElement.parentElement.getAttribute('hex-id');
    console.log('Viewing character with hex id:', hexId);

    // Navigate to charactersheet page with hexId in URL
    // Get current path and replace 'characterloader' with 'charactersheet'
    const currentPath = window.location.pathname;
    let charactersheetPath;
    
    if (currentPath.includes('anfcharacterloader')) {
        charactersheetPath = currentPath.replace('anfcharacterloader', 'anfcharactersheet');
    } else if (currentPath.includes('characterloader')) {
        charactersheetPath = currentPath.replace('characterloader', 'charactersheet');
    } else {
        // Fallback: use the standard path structure
        charactersheetPath = '/dnd/tools/anfcharactersheet';
    }
    
    window.location.href = `${charactersheetPath}?hexId=${hexId}`;
}

function editCharacter(button) {
    const hexId = button.parentElement.parentElement.getAttribute('hex-id');
    console.log('Editing character with hex id:', hexId);
    window.location.href = `/dnd/tools/anfcharactercreator?hexId=${hexId}`;
}

function deleteCharacter(button) {
    const hexId = button.parentElement.parentElement.getAttribute('hex-id');
    console.log('Deleting character with hex id:', hexId);
    localStorage.removeItem(`characterData-${hexId}`);

    let characterHexIds = JSON.parse(localStorage.getItem('characterHexIds') || '[]');
    if (characterHexIds.includes(hexId)) {
        characterHexIds.splice(characterHexIds.indexOf(hexId), 1);
        localStorage.setItem('characterHexIds', JSON.stringify(characterHexIds));
    }

    loadCharacters();
}

window.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded');
    loadCharacters();
    const content = document.querySelector('#content-container');
    if (content) {
        content.classList.remove('content-loading');
    }
});