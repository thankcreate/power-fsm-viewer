// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import * as webview from "./webview";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "viz-fsm-viewer" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json

	let disposables: any = [];
	let disposablePanel = vscode.commands.registerCommand('vizFsmViewer.open', () => {
		let panel = vscode.window.createWebviewPanel(
			'vizFsmViewer', 'FSM View',
			vscode.ViewColumn.Two,
			{
				enableScripts: true
			}
		)

		panel.webview.html = webview.getWebviewContent(context);


		vscode.workspace.onDidChangeTextDocument(
			e => {
				if (vscode.window.activeTextEditor &&
					e.document === vscode.window.activeTextEditor.document) {
					panel.webview.html = webview.getWebviewContent(context);
				}
			},
			null,
			disposables
		);

		vscode.window.onDidChangeActiveTextEditor(
			e => {
				if (vscode.window.activeTextEditor && e &&
					e.document === vscode.window.activeTextEditor.document) {
					panel.webview.html = webview.getWebviewContent(context);
				}
			},
			null,
			disposables
		);

		panel.onDidDispose(
			() => {
				while (disposables.length) {
					const item = disposables.pop();
					if (item) {
						item.dispose();
					}
				}
			}
		);
	});
	context.subscriptions.push(disposablePanel);
}

// this method is called when your extension is deactivated
export function deactivate() { }
