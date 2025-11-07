// Advanced markdown loader using marked.js library
// First, include this in your HTML: <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>

async function loadAdvancedContent(sectionId, contentPath) {
    //debugger;
    try {
        const response = await fetch(contentPath);
        const markdown = await response.text();
        
        // Use marked.js to convert markdown to HTML
        const html = marked.parse(markdown);
        
        const section = document.getElementById(sectionId);
        if (section) {
            const contentDiv = section.querySelector('.section-content');
            if (contentDiv) {
                contentDiv.innerHTML = html;
            }
        }
    } catch (error) {
        console.error(`Error loading content for ${sectionId}:`, error);
    }
}

function convertToDivs(markdown) {
    //debugger;
    console.log("Markdown: ", markdown);
        return markdown
        .replace(/<h4([^>]*)>(.*?)<\/h4>/gim, '<div class="subsubheader"$1>$2</div>')
        .replace(/<h3([^>]*)>(.*?)<\/h3>/gim, '<div class="subheader"$1>$2</div>')
        .replace(/<h2([^>]*)>(.*?)<\/h2>/gim, '<div class="header"$1>$2</div>')
        .replace(/<h1([^>]*)>(.*?)<\/h1>/gim, '<div class="title"$1>$2</div>')

        // Bold
        .replace(/<strong>(.*?)<\/strong>/gim, '<span class="bold">$1</span>')
        // Italic
        .replace(/<em>(.*?)<\/em>/gim, '<span class="italic">$1</span>')
        // Links
        .replace(/<a href="([^"]+)">([^<]+)<\/a>/gim, '<a href="$1" class="link">$2</a>')
        // Clean up empty paragraphs
        .replace(/<div class="paragraph"><\/div>/gim, '')
         // Clean up consecutive <br> tags
        .replace(/<br><br>/gim, '<br>')
        .replace(/<div class="paragraph"><br><\/div>/g, '')
        // Remove standalone <br> tags that are causing issues
        .replace(/<div class="paragraph"><br><\/div>/gim, '')
        .replace(/<br>/gim, '')
        // Wrap in paragraphs
        .replace(/<p>(.*?)<\/p>/gim, '<div class="paragraph">$1</div>')
         
         // Tables
         .replace(/<table([^>]*)>/gim, function(match, attributes) {
             // Extract id from table attributes
             const idMatch = attributes.match(/id="([^"]*)"/);
             const id = idMatch ? ` id="${idMatch[1]}"` : '';
             return `<div class="table-wrapper"${id}><table${attributes}>`;
         })
         .replace(/<\/table>/gim, '</table></div>')
         .replace(/<thead([^>]*)>/gim, '<thead$1>')
         .replace(/<tbody([^>]*)>/gim, '<tbody$1>')
         .replace(/<tr([^>]*)>/gim, '<tr$1>')
         .replace(/<th([^>]*)>(.*?)<\/th>/gim, '<th$1>$2</th>')
         .replace(/<td([^>]*)>(.*?)<\/td>/gim, '<td$1>$2</td>')
}
// Simple markdown to HTML converter with semantic div classes
function markdownToHtml(markdown) {
    console.log("Markdown: ", markdown);
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

function loadAllContent() {
    const contentElements = document.querySelectorAll('[data-content]');
    contentElements.forEach(loadContentFromData);
}

// Extract content from HTML page (removes head, body tags, etc.)
function extractContentFromHtml(html) {
    // Create a temporary DOM element to parse the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Find the body content
    const body = tempDiv.querySelector('body');
    if (body) {
        console.log("Body:", body.innerHTML);
        return body.innerHTML;
    }
    
    // If no body tag, return the content as-is
    return html;
}

// Load content using data attributes
async function loadContentFromData(element) {
    const contentPath = element.dataset.content;
    console.log(contentPath);
    if (!contentPath) return;
    
    try {
        const response = await fetch(contentPath);
        const html = await response.text();
        console.log("Raw HTML:", html);
        
        // Extract just the content from the HTML page
        const content = convertToDivs(extractContentFromHtml(html));
        console.log("Extracted content:", content);
        
        // Set the content directly (it's already HTML from Jekyll)
        element.innerHTML = content;
        element.querySelectorAll('.fa-star').forEach(icon => {
            icon.title = 'Playtested Material';
        });
    } catch (error) {
        console.error(`Error loading content from ${contentPath}:`, error);
    }

}
// Load all content when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Auto-load content from data attributes
    loadAllContent();
});