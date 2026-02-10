// Markdown Processor
// Converts marked.js HTML output to custom div classes matching the site's styling pattern
// Used across character sheets, character creator, and wiki content

const TABLE_PLACEHOLDER_PREFIX = 'MD_TABLE_PLACEHOLDER_';
const TABLE_PLACEHOLDER_SUFFIX = '_END';

/**
 * Convert markdown table syntax (e.g. | A | B |\n| 1 | 2 |) to HTML and replace with placeholders.
 * Works with or without a delimiter row. Returns text with placeholders and array of table HTML.
 * @param {string} text - Markdown string that may contain pipe tables
 * @returns {{ text: string, tables: string[] }}
 */
function convertMarkdownTablesToHtml(text) {
    const tables = [];
    if (!text || typeof text !== 'string') return { text: text || '', tables };
    const lines = text.split('\n');
    const out = [];
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        const isTableRow = /^\s*\|.+\|\s*$/.test(line);
        if (!isTableRow) {
            out.push(line);
            i++;
            continue;
        }
        const tableRows = [];
        while (i < lines.length && /^\s*\|.+\|\s*$/.test(lines[i])) {
            tableRows.push(lines[i].trim());
            i++;
        }
        if (tableRows.length === 0) continue;
        const parseRow = (row) => row.slice(1, -1).split('|').map(cell => cell.trim());
        const rows = tableRows.map(parseRow);
        const isDelimiter = (cells) => /^[\s\-:]+$/.test(cells.join(''));
        const headerRow = rows[0];
        const bodyStart = rows.length > 1 && isDelimiter(rows[1]) ? 2 : 1;
        let html = '<div class="description-table-wrapper"><table class="description-table">';
        html += '<thead><tr>';
        headerRow.forEach(cell => { html += '<th>' + escapeHtml(cell) + '</th>'; });
        html += '</tr></thead><tbody>';
        for (let r = bodyStart; r < rows.length; r++) {
            html += '<tr>';
            rows[r].forEach(cell => { html += '<td>' + escapeHtml(cell) + '</td>'; });
            html += '</tr>';
        }
        html += '</tbody></table></div>';
        tables.push(html);
        out.push(TABLE_PLACEHOLDER_PREFIX + (tables.length - 1) + TABLE_PLACEHOLDER_SUFFIX);
    }
    return { text: out.join('\n'), tables };
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function escapeRe(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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
        const { text: textWithPlaceholders, tables } = convertMarkdownTablesToHtml(description);
        let result;
        if (typeof marked !== 'undefined') {
            const markdownHtml = marked.parse(textWithPlaceholders);
            result = convertMarkdownToDivs(markdownHtml, context);
        } else {
            result = textWithPlaceholders;
        }
        tables.forEach((tableHtml, index) => {
            const placeholder = TABLE_PLACEHOLDER_PREFIX + index + TABLE_PLACEHOLDER_SUFFIX;
            // If marked wrapped the placeholder in a paragraph div, replace that whole wrapper with the table
            const wrapped = new RegExp('<div class="paragraph">\\s*' + escapeRe(placeholder) + '\\s*</div>', 'g');
            result = result.replace(wrapped, tableHtml);
            result = result.replace(placeholder, tableHtml);
        });
        return result;
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

