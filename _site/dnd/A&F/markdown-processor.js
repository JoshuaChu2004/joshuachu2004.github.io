// Markdown Processor
// Converts marked.js HTML output to custom div classes matching the site's styling pattern
// Used across character sheets, character creator, and wiki content

/**
 * Convert marked.js HTML output to custom div classes
 * @param {string} html - HTML output from marked.js
 * @param {string} context - Context for styling ('charactersheet', 'charactercreator', or 'default')
 * @returns {string} HTML with custom div classes
 */
function convertMarkdownToDivs(html, context = 'default') {
    if (!html) return '';
    
    let headerClass = 'header';
    let subheaderClass = 'subheader';
    
    // Use context-specific header classes for character sheet
    if (context === 'charactersheet') {
        headerClass = 'cs-description-header';
        subheaderClass = 'cs-description-subheader';
    }
    
    return html
        // Headers - use context-specific classes
        .replace(/<h1([^>]*)>(.*?)<\/h1>/gim, `<div class="${headerClass}"$1>$2</div>`)
        .replace(/<h2([^>]*)>(.*?)<\/h2>/gim, `<div class="${subheaderClass}"$1>$2</div>`)
        .replace(/<h3([^>]*)>(.*?)<\/h3>/gim, `<div class="${subheaderClass}"$1>$2</div>`)
        .replace(/<h4([^>]*)>(.*?)<\/h4>/gim, `<div class="${subheaderClass}"$1>$2</div>`)
        
        // Bold
        .replace(/<strong>(.*?)<\/strong>/gim, '<span class="bold">$1</span>')
        
        // Italic
        .replace(/<em>(.*?)<\/em>/gim, '<span class="italic">$1</span>')
        
        // Links
        .replace(/<a href="([^"]+)"([^>]*)>([^<]+)<\/a>/gim, '<a href="$1" class="link"$2>$3</a>')
        
        // Paragraphs - convert to div with paragraph class
        .replace(/<p>(.*?)<\/p>/gim, '<div class="paragraph">$1</div>')
        
        // Clean up empty paragraphs
        .replace(/<div class="paragraph"><\/div>/gim, '')
        
        // Clean up consecutive <br> tags
        .replace(/<br><br>/gim, '<br>')
        .replace(/<div class="paragraph"><br><\/div>/gim, '')
        
        // Remove standalone <br> tags within paragraphs
        .replace(/(<div class="paragraph">.*?)<br>(.*?<\/div>)/gim, '$1$2');
}

/**
 * Parse markdown description and convert to custom div classes
 * @param {string|object} description - Markdown string or structured description object
 * @param {string} context - Context for styling ('charactersheet', 'charactercreator', or 'default')
 * @returns {string} HTML with custom div classes
 */
function parseDescription(description, context = 'default') {
    if (!description) return '';
    
    // If it's a string, parse it as markdown
    if (typeof description === 'string') {
        // Check if marked is available
        if (typeof marked !== 'undefined') {
            const markdownHtml = marked.parse(description);
            // Convert to custom div classes
            return convertMarkdownToDivs(markdownHtml, context);
        }
        // Fallback to plain text if marked isn't loaded
        return description;
    }
    
    // Handle structured description format (backward compatibility for character sheets)
    if (context === 'charactersheet' && typeof description === 'object') {
        let descriptionHtml = '';
        if (description.header) {
            descriptionHtml += `<div class="cs-description-header">${description.header}</div>`;
        }

        if (description.subheaders && description.body) {
            for (let i = 0; i < description.subheaders.length; i++) {
                descriptionHtml += `<div class="cs-description-subheader">${description.subheaders[i]}</div>`;
                // Parse body as markdown if it's a string
                let bodyContent = description.body[i];
                if (typeof bodyContent === 'string' && typeof marked !== 'undefined') {
                    const markdownHtml = marked.parse(bodyContent);
                    bodyContent = convertMarkdownToDivs(markdownHtml, context);
                }
                descriptionHtml += `<div class="cs-description-body">${bodyContent}</div>`;
            }
        }

        return descriptionHtml;
    }
    
    return description;
}

