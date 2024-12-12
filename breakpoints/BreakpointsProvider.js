const vscode = require('vscode');
const path = require('path');

class BreakpointsProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }

    refresh() {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element) {
        return element;
    }

    async getChildren(element = undefined) {
        if (element !== undefined) {
            return element.children;
        }
        const breakpoints = vscode.debug.breakpoints;
        const workspaceFolders = vscode.workspace.workspaceFolders || [];

         // Only proceed if there are workspace folders
         if (workspaceFolders.length === 0) {
            return [];
        }

        // Use the first workspace folder (assumes single root folder)
        const workspaceFolder = workspaceFolders[0].uri.fsPath;


        // Ordenar breakpoints pelo caminho do arquivo
        const sortedBreakpoints = breakpoints.sort((a, b) => {
            const pathA = a.location.uri.path;
            const pathB = b.location.uri.path;
            return pathA.localeCompare(pathB);
        });

        return sortedBreakpoints.map(bp => {

            const fullPath = bp.location.uri.fsPath; // Get the full path of the breakpoint file
            const relativePath = path.relative(workspaceFolder, fullPath); // Calculate the relative path

            const fileName = bp.location.uri.path.split('/').pop();

            const line = bp.location.range.start.line + 1; // Adiciona 1 para alinhar com a numeração do editor
            const isLogpoint = bp.logMessage ? true : false;
            const label = isLogpoint ? bp.logMessage : `${fileName}:${line}`;

            const treeItem = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.Collapsed);
            treeItem.description = isLogpoint ? `${fileName}:${line}` : '';
            treeItem.tooltip = bp.location.uri.path;

            treeItem.command = {
                command: 'vscode.open',
                title: "Go to breakpoint",
                arguments: [
                    bp.location.uri,
                    { selection: bp.location.range }
                ]
            };

            const treeChild = new vscode.TreeItem(relativePath, vscode.TreeItemCollapsibleState.None);
            treeChild.iconPath = new vscode.ThemeIcon('debug-breakpoint-log-unverified');
            treeItem.children = [
                treeChild
            ];

            // Return the tree item
            return treeItem;
        });
    }
}

module.exports = BreakpointsProvider;
