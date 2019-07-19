import * as vscode from 'vscode';
import * as babel from '@babel/core';
import * as path from 'path';
import * as fs from 'fs'
import * as ejs from 'ejs'
import * as parser from '@babel/parser'
import traverse from "@babel/traverse";

const generator = require('@babel/generator').default;



interface ParseResult {
    fsmNames: string[],
    content: string,
}

export function getWebviewContent(context: vscode.ExtensionContext) {
    let templatePath = 'view/fsm.html';
    const resourcePath = path.join(context.extensionPath, templatePath);
    const dirPath = path.dirname(resourcePath);
    let html = fs.readFileSync(resourcePath, 'utf-8');

    html = html.replace(/(<link.+?href="|<script.+?src="|<img.+?src=")(.+?)"/g, (m, $1, $2) => {
        return $1 + vscode.Uri.file(path.resolve(dirPath, $2)).with({ scheme: 'vscode-resource' }).toString() + '"';
    });

    var parseResult; 
    var config;
    try {
        var code = getCode();
        parseResult = getFsmContent(code, context);    
        config = getConfig();
    } catch (error) {
        return error.message;
    }
    
    if(!config)
        config = {};

    var renderData = {
        embededScript: getWrappedFsmContent(parseResult, config)
    }
    var ejsRenderedHtml = ejs.render(html, renderData);
    return ejsRenderedHtml;
}

function getWrappedFsmContent(parseResult: ParseResult, config: any) {
    let block = `
    <script>       
        let targetFsm;         
        ${parseResult.content}
        targetFsm = ${parseResult.fsmNames[0]};

        let config;
        config = ${JSON.stringify(config)};
    </script>
    `
    return block;
}

function getConfig() { 
    let activeEditor = vscode.window.activeTextEditor;

    if (!activeEditor)
        throw new Error("No editor opened >_<");

    let activeContent = activeEditor.document.getText();

    let reg = /(^\s*(\/\*|[\/]{2})\s*viz-fsm-viewer-config\s*:)(.*)$/m
    let find = activeContent.match(reg);
    if(!find)
        return null;
    
    let jsonConfig = find[3];    
    let obj = JSON.parse(jsonConfig);
    return obj;
}

function getCode() {
    let activeEditor = vscode.window.activeTextEditor;

    if (!activeEditor)
        throw new Error("No editor opened >_<");

    let activeContent = activeEditor.document.getText();

    let reg = /viz-fsm-viewer-begin.*?$([\s\S]*)(\/\*|[\/]{2})\s*viz-fsm-viewer-end/m;
    let find = activeContent.match(reg);
    if(find && find[1]) {
        return find[1];
    }

    return activeContent;
}


function getFsmContent(code: string, context: vscode.ExtensionContext) : ParseResult {
    let astResult = babel.transformSync(code, {
        code: false,
        ast: true,
        cwd: context.extensionPath,      
        plugins: [            
            '@babel/plugin-proposal-class-properties',
            "@babel/plugin-transform-typescript"
        ]
    });
    if (!astResult)
        throw new Error("FSM not found >_<");
        

    let ast = astResult.ast; 

    // fsms
    let fsmRes = getFsms(ast, code, context);

    // combined 
    // let combinedCode = varsContent + '\n'+ fsmRes.content;
    let combinedCode = generator(ast).code;
    
    if(fsmRes.content.trim() === '')
        throw new Error("FSM not found >_<");

    let ret:ParseResult = {
        fsmNames: fsmRes.fsmNames, 
        content: combinedCode
    };

    return ret;
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

function getFsms(ast: any, code: string, context: vscode.ExtensionContext) : ParseResult{
    let targets: any[] = [];
    let names: string[] = [];
    babel.traverse(ast, {
        enter: (path:any) => {
            const { node, parent } = path;
            if (isFsmVariableDeclaration(node)) {
                targets.push(node);
                names.push((<any>node).declarations[0].id.name);
            }
        }
    });

    let ret:ParseResult = {fsmNames: names, content: generator(targets[0]).code};
    return ret;
}

