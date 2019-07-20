import * as vscode from 'vscode';
import * as babel from '@babel/core';
import * as path from 'path';
import * as fs from 'fs'
import * as ejs from 'ejs'
import * as parser from '@babel/parser'
import traverse from "@babel/traverse";

const generator = require('@babel/generator').default;
type INode = babel.types.Node;
type IPath = babel.NodePath<babel.types.Node>

interface CallbackInfo {
    key: string,
    value: string
}

interface ParseResult {
    fsmVarName: string,
    code: string,
    callbacks: CallbackInfo[];
}

export function getWebviewContent(context: vscode.ExtensionContext) {
    let templatePath = 'view/fsm.html';
    const resourcePath = path.join(context.extensionPath, templatePath);
    const dirPath = path.dirname(resourcePath);
    let html = fs.readFileSync(resourcePath, 'utf-8');

    html = html.replace(/(<link.+?href="|<script.+?src="|<img.+?src=")(.+?)"/g, (m, $1, $2) => {
        return $1 + vscode.Uri.file(path.resolve(dirPath, $2)).with({ scheme: 'vscode-resource' }).toString() + '"';
    });

    let parseResult;
    let config;
    try {
        parseResult = getFsmContent(context);
        config = getConfig();        
    } catch (error) {
        return error.message;
    }

    if (!config)
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
        ${parseResult.code}
        targetFsm = ${parseResult.fsmVarName};

        let callbacks = ${JSON.stringify(parseResult.callbacks)};        

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

    let reg = /(^\s*(\/\*|[\/]{2,}).*fsm-config\s*:)(.*)$/mg

    let matches, output = [];
    while (matches = reg.exec(activeContent)) {
        output.push(matches[3]);
    }

    let obArr = [];

    try {
        for(let i in output) {
            let ob = JSON.parse(output[i]);
            obArr.push(ob);
        }
    }
    catch (error) {
        throw new Error('Config parse failed');        
    }

    if(obArr.length === 0)
        return null;

    // merge all config into one
    let config:any = {};
    obArr.forEach(e=>{
        for(let i in e) {
            config[i] = e[i];
        }
    })

    return config;
}

function getClampedCode(): string | undefined {
    let activeEditor = vscode.window.activeTextEditor;

    if (!activeEditor)
        throw new Error("No editor opened >_<");

    let activeContent = activeEditor.document.getText();

    let reg = /fsm-begin.*?$([\s\S]*)^\s*(\/\*|[\/]{2}).*fsm-end/m;
    let find = activeContent.match(reg);
    if (find && find[1]) {
        return find[1];
    }

    return undefined;
}


function getFsmContent(context: vscode.ExtensionContext): ParseResult {
    let activeEditor = vscode.window.activeTextEditor;

    if (!activeEditor)
        throw new Error("No editor opened >_<");

    let code = activeEditor.document.getText();

    // If have user forced clamped code, use the scope to AST
    let clampedCode = getClampedCode();
    if (clampedCode)
        code = clampedCode;

    // Babel!
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

    // Get all FSM nodes
    let fsmNodes = getFsmNodes(ast, code, context);
    if (!fsmNodes || fsmNodes.length == 0)
        throw new Error("FSM not found >_<");

    // Choose target FSM
    let targetFsmPath = fsmNodes[0];

    // Handle the given FSM
    let fsmResult = parseFsm(targetFsmPath);

    // If user define the clamped code zone, use that zone    
    let generatedCode = '';
    if (clampedCode) {
        generatedCode = generator(ast).code;
    }
    // otherwise only generate the FSM VariableDeclaration code
    else {
        generatedCode = generator(targetFsmPath.node).code;
    }

    let ret = fsmResult;
    ret.code = generatedCode;

    return ret;
}

function parseFsm(fsmPath: IPath): ParseResult {
    let res: ParseResult = { fsmVarName: "", code: "", callbacks: []};

    res.fsmVarName = (<any>fsmPath.node).declarations[0].id.name;
    // parse and remove callback nodes
    babel.traverse(fsmPath.node, {
        enter: path => {
            const { node, parent } = path;
            if (isCallback(node, path)) {
                let callbacks = parseCallbacks(path);
                res.callbacks = callbacks;
                path.remove();
            }
        }
    }, fsmPath.scope, undefined, fsmPath);

    // remove condition nodes
    babel.traverse(fsmPath.node, {
        enter: path => {
            const { node, parent } = path;
            if (isCondition(node, path)) {
                path.remove();
            }
        }
    }, fsmPath.scope, undefined, fsmPath);

    res.code = generator(fsmPath.node).code;
    return res;
}

function parseCallbacks(path: IPath): CallbackInfo[] { 
    let ret:CallbackInfo[] =  [];
    let node:any = path.node;
    
    if(!node || !node.value || !node.value.properties || node.value.properties.length === 0)
        return ret;

    let properties = node.value.properties;
    for(let i in properties) {
        let prop = properties[i];
        let singleRes = parseSingleCallback(prop);
        if(singleRes) {
            ret.push(singleRes);
        }
    }

    return ret;
}

function parseSingleCallback(node: any) : CallbackInfo | undefined {
    let ret: CallbackInfo | undefined = undefined;

    try {
        if (!node || !node.value || !node.key || !node.key.name)
            return undefined;

        let keyName = node.key.name;
        // onState: ()=>{}
        if (node.value.type === 'ArrowFunctionExpression') {
            ret = { key: keyName, value: keyName };
        }
        else if (node.value.type === 'FunctionExpression') {
            // onState: function func(){}
            if (node.value.id && node.value.id.name) {
                ret = { key: keyName, value: node.value.id.name };
            }
            // onState: function (){}
            else {
                ret = { key: keyName, value: keyName };
            }
        }
        // onState: varFunc;
        if (node.value.type === 'Identifier') {
            if (node.value.name)
                ret = { key: keyName, value: node.value.name };
        }
    } 
    catch (error) {
        console.log("Single callback parse failed");
    }

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

function isCallback(node: any, path: IPath): boolean {
    return (path.isObjectProperty && node && node.key && node.key.name === 'callbacks');
}

function isCondition(node: any, path: IPath): boolean {
    return (path.isProperty && node && node.key && node.key.name === 'condition');
}

function getFsmNodes(ast: any, code: string, context: vscode.ExtensionContext): IPath[] {
    let targets: IPath[] = [];

    babel.traverse(ast, {
        enter: path => {
            const { node, parent } = path;
            if (isFsmVariableDeclaration(node)) {
                targets.push(path);
            }
        }
    });
    return targets;

    // let fsm0Code = generator(targets[0]).code;
    // console.log(fsm0Code);



    // let ret:ParseResult = {fsmNames: names, content: fsm0Code};
    // return ret;
}


