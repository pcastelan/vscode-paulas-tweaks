const vscode = require('vscode');
const BreakpointsProvider = require('./breakpoints/BreakpointsProvider');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

    const breakpointsProvider = new BreakpointsProvider();

    const panel = vscode.window.createTreeView('bookmarksPanel', {
        treeDataProvider: breakpointsProvider
    });

    vscode.debug.onDidChangeBreakpoints(() => {
        breakpointsProvider.refresh();
    });

	context.subscriptions.push(panel);
}

// This method is called when your extension is deactivated
function deactivate() {}



module.exports = {
	activate,
	deactivate
}
