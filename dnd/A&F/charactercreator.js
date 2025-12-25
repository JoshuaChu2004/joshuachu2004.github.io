async function loadCharacterBuilder(hexId=null) {

    console.log('Loading character builder...');
    try {
        const gameData = await loadBuilderGameData();
        if (gameData) {
            console.log('Game data:', gameData);
        }
        if (hexId) {
            console.log("Editing existing character...");
            const characterData = JSON.parse(localStorage.getItem(`characterData-${hexId}`));
            if (characterData) {
                console.log('Character data:', characterData);
            }
        }
        else {
            console.log("Creating new character...");
        }
    }
    catch (error) {
        console.error('Error loading character builder:', error);
    }
}
window.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded');

    const content = document.querySelector('#content-container');
    if (content) {
        content.classList.remove('content-loading');
    }

    loadCharacterBuilder();
});