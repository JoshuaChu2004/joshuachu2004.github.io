// Simple markdown to HTML converter with semantic div classes
function markdownToHtml(markdown) {
    return markdown
        // Headers
        .replace(/^### (.*$)/gim, '<div class="subheader">$1</div>')
        .replace(/^## (.*$)/gim, '<div class="header">$1</div>')
        .replace(/^# (.*$)/gim, '<div class="title">$1</div>')
        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<span class="bold">$1</span>')
        // Italic
        .replace(/\*(.*?)\*/g, '<span class="italic">$1</span>')
        // Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="link">$1</a>')
        // Line breaks
        .replace(/\n\n/g, '</div><div class="paragraph">')
        .replace(/\n/g, '<br>')
        // Wrap in paragraphs
        .replace(/^(.+)$/gm, '<div class="paragraph">$1</div>')
        // Clean up empty paragraphs
        .replace(/<div class="paragraph"><\/div>/g, '')
        // Clean up consecutive <br> tags
        .replace(/<br><br>/g, '<br>')
        .replace(/<div class="paragraph"><br><\/div>/g, '')
}

// Load content from markdown files
async function loadContent(sectionId, contentPath) {
    try {
        const response = await fetch(contentPath);
        const markdown = await response.text();
        const html = markdownToHtml(markdown);
        
        const section = document.getElementById(sectionId);
        if (section) {
            // Find the section-content div and update it
            const contentDiv = section.querySelector('.section-content');
            if (contentDiv) {
                contentDiv.innerHTML = html;
            }
        }
    } catch (error) {
        console.error(`Error loading content for ${sectionId}:`, error);
    }
}

// Load content using data attributes
async function loadContentFromData(element) {
    const contentPath = element.dataset.content;
    if (!contentPath) return;
    
    try {
        const response = await fetch(contentPath);
        const markdown = await response.text();
        const html = markdownToHtml(markdown);
        element.innerHTML = html;
    } catch (error) {
        console.error(`Error loading content from ${contentPath}:`, error);
    }
}

// Auto-load all content with data-content attributes
function loadAllContent() {
    const contentElements = document.querySelectorAll('[data-content]');
    contentElements.forEach(loadContentFromData);
}

// Load all content when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Auto-load content from data attributes
    loadAllContent();
});
