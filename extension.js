const vscode = require('vscode');
const BreakpointsProvider = require('./breakpoints/BreakpointsProvider');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "paula-tweaks" is now active!');

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
