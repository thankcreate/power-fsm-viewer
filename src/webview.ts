import * as vscode from 'vscode';
import * as babel from '@babel/core';
import * as path from 'path';
import * as fs from 'fs'
import * as ejs from 'ejs'

const generator = require('@babel/generator').default;


export function getWebviewContent(context: vscode.ExtensionContext) {

    let templatePath = 'view/fsm.html';
    const resourcePath = path.join(context.extensionPath, templatePath);
    const dirPath = path.dirname(resourcePath);
    let html = fs.readFileSync(resourcePath, 'utf-8');

    html = html.replace(/(<link.+?href="|<script.+?src="|<img.+?src=")(.+?)"/g, (m, $1, $2) => {
        return $1 + vscode.Uri.file(path.resolve(dirPath, $2)).with({ scheme: 'vscode-resource' }).toString() + '"';
    });

    var fsmContent = getFsmContent(context);

    var renderData = {
        name: '123',
        embededScript: '<script>' + fsmContent +  '</script>'
    }
    var ejsRenderedHtml = ejs.render(html, renderData);




    return ejsRenderedHtml;
}

function getFsmContent(context: vscode.ExtensionContext) {
    let activeEditor = vscode.window.activeTextEditor;

    if (!activeEditor)
        return "No active editor";

    let activeContent = activeEditor.document.getText();
    // 

    let astResult = babel.transformSync(activeContent, {
        code: false,
        ast: true,
        cwd: context.extensionPath
    });
    if (!astResult)
        return "AST fail";

    let ast = astResult.ast;


    let targets = traverse(ast, activeContent, context);

    if (!targets)
        return "Didn't find FSM";
    else
        return generator(targets[0]).code;
}

function isFsmVariableDeclarator(node: any): boolean {
    let fondObjectExpressionInit =
        node.type === 'VariableDeclarator' &&
        node.init && node.init.type === 'ObjectExpression';

    if (!fondObjectExpressionInit)
        return false;

    let init = node.init;
    let foundProperties = init.properties && init.properties.length > 0;

    if (!foundProperties)
        return false;


    for (let i = 0; i < init.properties.length; i++) {
        let property = init.properties[i];
        if (property && property.key
            && property.key.type === 'Identifier'
            && property.key.name === 'events')
            return true;
    }

    return false;
};


function isFsmVariableDeclaration(node: any): boolean {
    return (
        node.type === 'VariableDeclaration'
        && node.declarations && node.declarations[0]
        && isFsmVariableDeclarator(node.declarations[0])
    )
}

function traverse(ast: any, code: string, context: vscode.ExtensionContext) {
    let targets: any[] = [];
    babel.traverse(ast, {
        enter: path => {
            const { node, parent } = path;
            if (isFsmVariableDeclaration(node)) {
                targets.push(node);
            }

            // if (isFsmVariableDeclarator(node)) {
            //     target = (<any>node).init;
            //     path.stop();
            // }
        }
    });

    return targets;
}

