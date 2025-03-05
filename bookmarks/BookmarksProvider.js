const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

class BookmarksProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this._cachedBookmarks = null;
    }

    refresh() {
        this._cachedBookmarks = null; // Limpa o cache
        this._onDidChangeTreeData.fire();
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
            const bookmarks = await this.findBookmarks(workspaceFolder);

            const treeItems = bookmarks.map(bookmark => {
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

            return treeItems;
        } catch (error) {
            console.error('Error in getChildren:', error);
            return [];
        }
    }

    async findBookmarks(workspaceFolder) {
        console.log('Starting findBookmarks');
        const bookmarks = [];

        try {
            const files = await this.findFiles(workspaceFolder);
            console.log(`Found ${files.length} files to search`);

            for (const filePath of files) {
                try {
                    const content = await fs.promises.readFile(filePath, 'utf-8');
                    const lines = content.split('\n');

                    lines.forEach((line, index) => {
                        // Adicione regex para PHP e Blade
                        const doMatchPhp = line.match(/\/\/\s*do::\s*(.+)/);
                        const bookmarkMatchPhp = line.match(/\/\/\s*bookmark::\s*(.+)/);

                        // Regex para comentários Blade
                        const doMatchBlade = line.match(/\{\{--\s*do::\s*(.+)\s*--\}\}/);
                        const bookmarkMatchBlade = line.match(/\{\{--\s*bookmark::\s*(.+)\s*--\}\}/);

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
            }
        } catch (error) {
            console.error('Error in findBookmarks:', error);
        }

        console.log(`Total bookmarks found: ${bookmarks.length}`);
        return bookmarks;
    }

    async findFiles(workspaceFolder, extensions = ['.js', '.php', '.blade.php', '.ts', '.vue', '.jsx', '.tsx']) {
        console.log(`Finding files in ${workspaceFolder}`);
        const files = [];

        const traverseDir = async (dir) => {
            try {
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
