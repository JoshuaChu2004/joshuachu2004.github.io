// D&D Dynamic Page Router - Handles all dynamic content loading
class DndRouter {
    constructor() {
        this.baseUrl = '/dnd';
        this.contentBase = '/dnd/content';
        this.init();
    }

    init() {
        const path = window.location.pathname;
        
        // If we're on the main dnd page, redirect to index
        if (path === this.baseUrl || path === this.baseUrl + '/') {
            window.location.href = this.baseUrl + '/index.html';
            return;
        }

        // Check if this is a content page
        if (path.startsWith(this.baseUrl + '/')) {
            this.loadContentPage(path);
        } else {
            this.show404();
        }
    }

    loadContentPage(path) {
        const pathParts = path.replace(this.baseUrl + '/', '').split('/');
        const contentType = pathParts[0];
        const contentName = pathParts[1];

        if (!contentType || !contentName) {
            this.show404();
            return;
        }

        // Update page title and meta
        const displayName = this.formatName(contentName);
        document.title = `${displayName} - Joshua Chu D&D Homebrew`;
        
        // Create breadcrumb and content
        this.createPageStructure(contentType, contentName, displayName);
        
        // Load the markdown content
        this.loadMarkdownContent(contentType, contentName);
    }

    createPageStructure(contentType, contentName, displayName) {
        const titles = {
            'classes': 'Subclass',
            'items': 'Item', 
            'spells': 'Spell',
            'races': 'Race',
            'feats': 'Feat'
        };

        const title = titles[contentType] || 'Content';
        const contentArea = document.getElementById('content-area');
        
        contentArea.innerHTML = `
            <div class="breadcrumb">
                <a href="/dnd/">D&D Homebrew</a> &gt; 
                <a href="/dnd/#${contentType}">${this.capitalizeFirst(contentType)}</a> &gt; 
                <span>${displayName}</span>
            </div>
            
            <div class="content-header">
                <h1>${displayName}</h1>
                <p class="content-type">${title}</p>
            </div>
            
            <div id="markdown-content" data-content="${this.contentBase}/${contentType}/${contentName}.md">
                <div class="loading">Loading content...</div>
            </div>
            
            <div class="back-to-top">
                <a href="/dnd/#${contentType}">← Back to ${this.capitalizeFirst(contentType)}</a>
            </div>
        `;
    }

    loadMarkdownContent(contentType, contentName) {
        const contentPath = `${this.contentBase}/${contentType}/${contentName}.md`;
        
        fetch(contentPath)
            .then(response => {
                if (!response.ok) {
                    // Only throw error if it's a 404 (content not found)
                    if (response.status === 404) {
                        throw new Error('Content file not found');
                    } else {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                }
                return response.text();
            })
            .then(markdown => {
                // Use your existing content loader if available
                const contentDiv = document.getElementById('markdown-content');
                if (window.AdvancedContentLoader) {
                    // Use your existing loader
                    window.AdvancedContentLoader.loadContent(contentDiv, contentPath);
                } else {
                    // Fallback to simple markdown rendering
                    contentDiv.innerHTML = this.simpleMarkdownToHtml(markdown);
                }
            })
            .catch(error => {
                // Only log 404 errors for missing content files
                if (error.message === 'Content file not found') {
                    console.warn(`D&D Router: Content file not found: ${contentPath}`);
                    this.show404();
                } else {
                    // Log other errors (network issues, server errors, etc.)
                    console.error('D&D Router: Error loading content:', error);
                    this.showError(error.message);
                }
            });
    }

    simpleMarkdownToHtml(markdown) {
        // Basic markdown to HTML conversion
        return markdown
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
            .replace(/\*(.*)\*/gim, '<em>$1</em>')
            .replace(/\n/gim, '<br>');
    }

    formatName(name) {
        return name
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    show404() {
        document.getElementById('content-area').innerHTML = `
            <h1>Content Not Found</h1>
            <p>The requested D&D content could not be found.</p>
            <a href="/dnd/">← Back to D&D Homebrew</a>
        `;
    }

    showError(errorMessage) {
        document.getElementById('content-area').innerHTML = `
            <h1>Error Loading Content</h1>
            <p>There was an error loading the content: ${errorMessage}</p>
            <a href="/dnd/">← Back to D&D Homebrew</a>
        `;
    }
}

// Initialize the router when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new DndRouter();
});
