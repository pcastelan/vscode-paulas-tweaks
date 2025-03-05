const vscode = require('vscode');
// const BreakpointsProvider = require('./breakpoints/BreakpointsProvider');

const BookmarksProvider = require('./bookmarks/BookmarksProvider');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

    const bookmarksProvider = new BookmarksProvider();

    const panel = vscode.window.createTreeView('bookmarksPanel', {
        treeDataProvider: bookmarksProvider
    });

    // Atualiza quando a extensão é ativada
    bookmarksProvider.refresh();

    // Atualiza quando um documento é salvo
    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument(() => {
            bookmarksProvider.refresh();
        })
    );

    // Atualiza quando troca de workspace ou abre um projeto
    context.subscriptions.push(
        vscode.workspace.onDidChangeWorkspaceFolders(() => {
            bookmarksProvider.refresh();
        })
    );

    // Comando manual de refresh
    const refreshDisposable = vscode.commands.registerCommand('bookmarks.refresh', () => {
        bookmarksProvider.refresh();
    });

    context.subscriptions.push(panel, refreshDisposable);

    // #region bookmarks from breakpoints
    // const breakpointsProvider = new BreakpointsProvider();

    // const panel = vscode.window.createTreeView('bookmarksPanel', {
    //     treeDataProvider: breakpointsProvider
    // });

    // vscode.debug.onDidChangeBreakpoints(() => {
    //     breakpointsProvider.refresh();
    // });

	// context.subscriptions.push(panel);

    //#endregion

}

// This method is called when your extension is deactivated
function deactivate() {}



module.exports = {
	activate,
	deactivate
}
