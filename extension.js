const vscode = require('vscode');
const BookmarksProvider = require('./bookmarks/BookmarksProvider');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    const bookmarksProvider = new BookmarksProvider();

    const panel = vscode.window.createTreeView('bookmarksPanel', {
        treeDataProvider: bookmarksProvider
    });

    // Perform full refresh when extension is activated
    bookmarksProvider.fullRefresh();

    // Refresh only the changed file when a document is saved
    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument((document) => {
            const filePath = document.uri.fsPath;
            bookmarksProvider.refreshFile(filePath);
        })
    );

    // Perform full refresh when workspace folders change
    context.subscriptions.push(
        vscode.workspace.onDidChangeWorkspaceFolders(() => {
            bookmarksProvider.fullRefresh();
        })
    );

    // Manual refresh command (full refresh)
    const refreshDisposable = vscode.commands.registerCommand('bookmarks.refresh', () => {
        bookmarksProvider.fullRefresh();
    });

    context.subscriptions.push(panel, refreshDisposable);
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
    activate,
    deactivate
}
