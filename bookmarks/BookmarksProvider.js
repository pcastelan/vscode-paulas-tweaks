const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

class BookmarksProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this._bookmarksCache = new Map(); // Cache of bookmarks by file path
        this._initialized = false; // Flag to track if initial full scan has been done
    }

    /**
     * Refresh the entire tree view
     */
    refresh() {
        this._onDidChangeTreeData.fire();
    }

    /**
     * Perform full refresh of all bookmarks
     */
    async fullRefresh() {
        console.log('Performing full refresh of all bookmarks');
        this._bookmarksCache.clear();
        this._initialized = false;
        await this.getAllBookmarks();
        this.refresh();
    }

    /**
     * Refresh only a specific file
     * @param {string} filePath - Path of the file to refresh
     */
    async refreshFile(filePath) {
        console.log(`Refreshing bookmarks for file: ${filePath}`);

        // If we haven't done the initial scan yet, do a full refresh
        if (!this._initialized) {
            await this.fullRefresh();
            return;
        }

        // Remove this file from cache
        this._bookmarksCache.delete(filePath);

        // Scan only this file
        const workspaceFolders = vscode.workspace.workspaceFolders || [];
        if (workspaceFolders.length > 0) {
            const workspaceFolder = workspaceFolders[0].uri.fsPath;
            try {
                const bookmarks = await this.scanSingleFile(filePath);
                if (bookmarks.length > 0) {
                    this._bookmarksCache.set(filePath, bookmarks);
                }
            } catch (error) {
                console.error(`Error refreshing file ${filePath}:`, error);
            }
        }

        this.refresh();
    }

    getTreeItem(element) {
        return element;
    }

    async getChildren(element = undefined) {
        if (element !== undefined) {
            return element.children;
        }

        const workspaceFolders = vscode.workspace.workspaceFolders || [];
        if (workspaceFolders.length === 0) {
            return [];
        }

        const workspaceFolder = workspaceFolders[0].uri.fsPath;

        try {
            // Get all bookmarks (either from cache or by scanning files)
            const bookmarks = await this.getAllBookmarks();

            // Map the bookmarks to tree items
            return this.createTreeItems(bookmarks, workspaceFolder);
        } catch (error) {
            console.error('Error in getChildren:', error);
            return [];
        }
    }

    /**
     * Get all bookmarks, either from cache or by scanning files
     */
    async getAllBookmarks() {
        const workspaceFolders = vscode.workspace.workspaceFolders || [];
        if (workspaceFolders.length === 0) {
            return [];
        }

        const workspaceFolder = workspaceFolders[0].uri.fsPath;

        // If we haven't done the initial scan yet, scan all files
        if (!this._initialized) {
            console.log('Performing initial scan of all files');
            await this.scanAllFiles(workspaceFolder);
            this._initialized = true;
        }

        // Combine all bookmarks from the cache
        const allBookmarks = [];
        for (const bookmarks of this._bookmarksCache.values()) {
            allBookmarks.push(...bookmarks);
        }

        return allBookmarks;
    }

    /**
     * Scan all files in the workspace to find bookmarks
     */
    async scanAllFiles(workspaceFolder) {
        console.log('Starting scan of all files');
        this._bookmarksCache.clear();

        try {
            const files = await this.findFiles(workspaceFolder);
            console.log(`Found ${files.length} files to search`);

            for (const filePath of files) {
                const bookmarks = await this.scanSingleFile(filePath);
                if (bookmarks.length > 0) {
                    this._bookmarksCache.set(filePath, bookmarks);
                }
            }
        } catch (error) {
            console.error('Error in scanAllFiles:', error);
        }

        // Count total bookmarks
        let totalBookmarks = 0;
        for (const bookmarks of this._bookmarksCache.values()) {
            totalBookmarks += bookmarks.length;
        }
        console.log(`Total bookmarks found: ${totalBookmarks}`);
    }

    /**
     * Scan a single file for bookmarks
     * @param {string} filePath - Path of the file to scan
     */
    async scanSingleFile(filePath) {
        const bookmarks = [];
        try {
            const content = await fs.promises.readFile(filePath, 'utf-8');
            const lines = content.split('\n');

            lines.forEach((line, index) => {
                // Regular expressions for PHP and JavaScript
                const doMatchPhp = line.match(/\/\/\s*@do:\s*(.+)/);
                const bookmarkMatchPhp = line.match(/\/\/\s*@bookmark:\s*(.+)/);

                // Regular expressions for Blade comments
                const doMatchBlade = line.match(/\{\{--\s*@do:\s*(.+)\s*--\}\}/);
                const bookmarkMatchBlade = line.match(/\{\{--\s*@bookmark:\s*(.+)\s*--\}\}/);

                if (doMatchPhp || doMatchBlade) {
                    const match = doMatchPhp || doMatchBlade;
                    console.log(`Found do:: bookmark in ${filePath} at line ${index + 1}`);
                    bookmarks.push({
                        type: 'do',
                        description: match[1].trim(),
                        filePath: filePath,
                        line: index + 1
                    });
                }

                if (bookmarkMatchPhp || bookmarkMatchBlade) {
                    const match = bookmarkMatchPhp || bookmarkMatchBlade;
                    console.log(`Found bookmark:: in ${filePath} at line ${index + 1}`);
                    bookmarks.push({
                        type: 'bookmark',
                        description: match[1].trim(),
                        filePath: filePath,
                        line: index + 1
                    });
                }
            });
        } catch (error) {
            console.error(`Error reading file ${filePath}:`, error);
        }

        return bookmarks;
    }

    /**
     * Create tree items from bookmarks
     */
    createTreeItems(bookmarks, workspaceFolder) {
        return bookmarks.map(bookmark => {
            const fileName = path.basename(bookmark.filePath);
            const line = bookmark.line;
            const type = bookmark.type;
            const description = bookmark.description;

            const treeItem = new vscode.TreeItem(description, vscode.TreeItemCollapsibleState.Collapsed);
            treeItem.description = `${fileName}:${line}`;
            treeItem.tooltip = bookmark.filePath;
            treeItem.iconPath = new vscode.ThemeIcon(type === 'do' ? 'debug-continue' : 'bookmark', new vscode.ThemeColor('foreground'));

            const command = {
                command: 'vscode.open',
                title: "Go to Bookmark",
                arguments: [
                    vscode.Uri.file(bookmark.filePath),
                    { selection: new vscode.Range(line - 1, 0, line - 1, 0) }
                ]
            };

            treeItem.command = command;

            const treeChildPath = new vscode.TreeItem(path.relative(workspaceFolder, bookmark.filePath), vscode.TreeItemCollapsibleState.None);
            treeChildPath.iconPath = new vscode.ThemeIcon('debug-breakpoint-log-unverified');
            treeChildPath.command = command;

            const treeChildLine = new vscode.TreeItem(`line: ${line}`, vscode.TreeItemCollapsibleState.None);
            treeChildLine.iconPath = new vscode.ThemeIcon('debug-breakpoint-log-unverified');
            treeChildLine.command = command;

            treeItem.children = [
                treeChildPath,
                treeChildLine
            ];

            return treeItem;
        });
    }

    /**
     * Get configuration for folder inclusion/exclusion
     * @returns {Object} Configuration object with includeFolders and excludeFolders
     */
    getFolderConfig() {
        const config = vscode.workspace.getConfiguration('paula.bookmarks');

        return {
            // Get include folders pattern - default to all folders if not specified
            includeFolders: config.get('includeFolders', []),

            // Get exclude folders pattern
            excludeFolders: config.get('excludeFolders', []),

            // Mode: 'include' scans only included folders, 'exclude' scans all except excluded
            mode: config.get('folderMode', 'exclude')
        };
    }

    /**
     * Check if a directory should be included in the scan based on config
     * @param {string} dirPath - Path to check
     * @param {string} workspaceFolder - Root workspace folder path
     * @returns {boolean} Whether the directory should be included
     */
    shouldIncludeDirectory(dirPath, workspaceFolder) {
        const folderConfig = this.getFolderConfig();

        // Get relative path for easier pattern matching
        const relativePath = path.relative(workspaceFolder, dirPath);

        // If it's the root workspace folder, always include it
        if (!relativePath) {
            return true;
        }

        // Handle 'include' mode - only scan specific folders
        if (folderConfig.mode === 'include' && folderConfig.includeFolders.length > 0) {
            // Check if this folder or any parent folder matches inclusion patterns
            return folderConfig.includeFolders.some(pattern => {
                // Support simple wildcard matching
                if (pattern.endsWith('/*')) {
                    const basePattern = pattern.slice(0, -2);
                    return relativePath === basePattern || relativePath.startsWith(basePattern + '/');
                }
                return relativePath === pattern || relativePath.startsWith(pattern + '/');
            });
        }

        // Handle 'exclude' mode - scan all except specified folders
        if (folderConfig.excludeFolders.length > 0) {
            // Check if this folder matches any exclusion patterns
            return !folderConfig.excludeFolders.some(pattern => {
                // Support simple wildcard matching
                if (pattern.endsWith('/*')) {
                    const basePattern = pattern.slice(0, -2);
                    return relativePath === basePattern || relativePath.startsWith(basePattern + '/');
                }
                return relativePath === pattern || relativePath.startsWith(pattern + '/');
            });
        }

        // By default, include all directories
        return true;
    }

    /**
     * Find all files matching the given extensions in the workspace
     */
    async findFiles(workspaceFolder) {
        console.log(`Finding files in ${workspaceFolder}`);
        const files = [];

        // Get file extensions from settings
        let extensions = vscode.workspace.getConfiguration('paula.bookmarks').get('extensions');
        if (!extensions || !Array.isArray(extensions) || extensions.length === 0) {
            // Default extensions if not set
            extensions = ['.js', '.php', '.blade.php', '.ts', '.vue', '.jsx', '.tsx'];
        }

        // @do: test

        const traverseDir = async (dir) => {
            try {
                // Check if this directory should be included based on settings
                if (!this.shouldIncludeDirectory(dir, workspaceFolder)) {
                    console.log(`Skipping directory: ${dir} (excluded by settings)`);
                    return;
                }

                const entries = await fs.promises.readdir(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);

                    if (entry.isDirectory() && !entry.name.startsWith('.')) {
                        await traverseDir(fullPath);
                    } else if (
                        entry.isFile() &&
                        extensions.some(ext => fullPath.endsWith(ext))
                    ) {
                        files.push(fullPath);
                    }
                }
            } catch (error) {
                console.error(`Error traversing directory ${dir}:`, error);
            }
        };

        await traverseDir(workspaceFolder);
        console.log(`Found ${files.length} files`);
        return files;
    }
}

module.exports = BookmarksProvider;
