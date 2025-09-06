// Load header component
async function loadHeader() {
    try {
        const response = await fetch('/components/header.html');
        const headerHtml = await response.text();
        const placeholder = document.getElementById('header-placeholder');
        placeholder.innerHTML = headerHtml;
        
        // Force a reflow to ensure proper width calculation
        placeholder.offsetHeight;
        
        // Trigger window resize to recalculate layout
        window.dispatchEvent(new Event('resize'));
    } catch (error) {
        console.error('Error loading header:', error);
        // Show fallback header if fetch fails
        const placeholder = document.getElementById('header-placeholder');
        const fallbackHeader = placeholder.querySelector('header');
        if (fallbackHeader) {
            fallbackHeader.style.display = 'block';
        }
        window.dispatchEvent(new Event('resize'));
    }
}

// Load footer component
async function loadFooter() {
    try {
        const response = await fetch('/components/footer.html');
        const footerHtml = await response.text();
        document.getElementById('footer-placeholder').innerHTML = footerHtml;
    } catch (error) {
        console.error('Error loading footer:', error);
    }
}

// Load all components when page loads
document.addEventListener('DOMContentLoaded', function() {
    loadHeader();
    //loadFooter();
});
