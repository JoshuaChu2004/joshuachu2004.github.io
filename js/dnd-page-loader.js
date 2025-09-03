// D&D Page Loader - Handles dynamic loading of individual content pages
class DndPageLoader {
    constructor() {
        this.baseUrl = '/dnd';
        this.contentBase = '/dnd/content';
        this.init();
    }

    init() {
        // Check if we're on a content page
        const path = window.location.pathname;
        if (path.startsWith(this.baseUrl + '/') && path !== this.baseUrl + '/') {
            this.loadContentPage(path);
        }
    }

    loadContentPage(path) {
        // Extract the content type and name from the URL
        // e.g., /dnd/classes/warpriest -> type: classes, name: warpriest
        const pathParts = path.replace(this.baseUrl + '/', '').split('/');
        const contentType = pathParts[0]; // classes, items, spells, etc.
        const contentName = pathParts[1]; // specific name

        if (!contentType || !contentName) {
            this.show404();
            return;
        }

        // Load the appropriate template and content
        this.loadTemplate(contentType, contentName);
    }

    loadTemplate(contentType, contentName) {
        // Create the page structure dynamically
        const template = this.getTemplate(contentType, contentName);
        document.body.innerHTML = template;

        // Load the content
        const contentPath = `${this.contentBase}/${contentType}/${contentName}.md`;
        this.loadMarkdownContent(contentPath, contentName);
    }

    getTemplate(contentType, contentName) {
        const titles = {
            'classes': 'Subclass',
            'items': 'Item',
            'spells': 'Spell',
            'races': 'Race',
            'feats': 'Feat'
        };

        const title = titles[contentType] || 'Content';
        const displayName = this.formatName(contentName);

        return `
            <div id="header-placeholder"></div>
            
            <section class="intro-content">
                <div class="section-content">
                    <div class="breadcrumb">
                        <a href="/dnd/">D&D Homebrew</a> &gt; 
                        <a href="/dnd/#${contentType}">${this.capitalizeFirst(contentType)}</a> &gt; 
                        <span>${displayName}</span>
                    </div>
                    
                    <div class="content-header">
                        <h1>${displayName}</h1>
                        <p class="content-type">${title}</p>
                    </div>
                    
                    <div id="content-area" data-content="${this.contentBase}/${contentType}/${contentName}.md">
                        <div class="loading">Loading content...</div>
                    </div>
                </div>
            </section>

            <div class="back-to-top">
                <a href="/dnd/#${contentType}">← Back to ${this.capitalizeFirst(contentType)}</a>
            </div>
        `;
    }

    loadMarkdownContent(contentPath, contentName) {
        fetch(contentPath)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Content not found');
                }
                return response.text();
            })
            .then(markdown => {
                // Use your existing markdown renderer
                this.renderMarkdown(markdown);
            })
            .catch(error => {
                console.error('Error loading content:', error);
                this.show404();
            });
    }

    renderMarkdown(markdown) {
        // This would integrate with your existing markdown renderer
        // For now, we'll use a simple approach
        const contentArea = document.getElementById('content-area');
        if (contentArea) {
            // You can integrate this with your existing advanced-content-loader.js
            contentArea.innerHTML = this.simpleMarkdownToHtml(markdown);
        }
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
        // Convert kebab-case or snake_case to Title Case
        return name
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    show404() {
        document.body.innerHTML = `
            <div id="header-placeholder"></div>
            <section class="intro-content">
                <div class="section-content">
                    <h1>Content Not Found</h1>
                    <p>The requested D&D content could not be found.</p>
                    <a href="/dnd/">← Back to D&D Homebrew</a>
                </div>
            </section>
        `;
    }
}

// Initialize the page loader when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new DndPageLoader();
});
