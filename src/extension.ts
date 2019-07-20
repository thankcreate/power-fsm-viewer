// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import * as webview from "./webview";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "power-fsm-viewer" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json

	let disposables: any = [];
	let disposablePanel = vscode.commands.registerCommand('powerFsmViewer.open', () => {
		let panel = vscode.window.createWebviewPanel(
			'powerFsmViewer', 'FSM',
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

		// Here we use onDidChangeTextEditorSelection instead of onDidChangeActiveTextEditor
		// This is for the fact the if the active edtior is changed to the FSM View, or an empty editor(newly created),
		// we still get the onDidChangeActiveTextEditor event
		// However, if we use onDidChangeTextEditorSelection instead, those problems solved.
		// I think it's because if an empty file or an webview has no selectable elements,
		// we won't receive onDidChangeTextEditorSelection event
		vscode.window.onDidChangeTextEditorSelection(
			e => {
				
				if (e.textEditor === vscode.window.activeTextEditor) {
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
