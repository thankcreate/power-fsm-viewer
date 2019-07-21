import * as vscode from 'vscode';
import * as babel from '@babel/core';
import * as path from 'path';
import * as fs from 'fs'
import * as ejs from 'ejs'
import * as parser from '@babel/parser'
import traverse from "@babel/traverse";

const generator = require('@babel/generator').default;
type INode = babel.types.Node;
type IPath = babel.NodePath<babel.types.Node>;

const defaultFsmVarName = 'powerFsmDefaultName';


let validProperty = {
    validTransition: ['events', 'transitions'],
    validCallback: ['callbacks', 'methods'],
    validInit: ['initial', 'init'],
    validFinal: ['final'],
    validState: ['states'],

    isValid: (prop: string, category?: string[]):boolean => {
        if(!prop)
            return false;

        if(category) {
            return category.includes(prop);
        }

        for(let i in validProperty) {
            let coll = (<any>validProperty)[i];
            if(coll.constructor !== Array)
                continue;
            
            coll = coll as Array<string>;
            if(coll.includes(prop)) 
                return true;
        }

        return false;
    }
}


interface CallbackInfo {
    key: string,
    value: string
}

interface ParseResult {
    fsmVarName: string,
    code: string,
    callbacks: CallbackInfo[],
    path: IPath;
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
        config = getConfig();   
        parseResult = getFsmContent(context);             
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

    for(let i in output) {
        let ob ;
        try {
            ob = JSON.parse(output[i]);
        }
        catch (error) {
            throw new Error('Config parse failed, please use standard JSON. Double quotes.<br/>' + output[i]);        
        }
        obArr.push(ob);
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

    // Handle the given FSM Node
    let fsmNodeResult = parseFsm(ast, code, context);

    // If user defined the clamped code zone, use that zone    
    let generatedCode = '';
    if (clampedCode) {
        generatedCode = parseClampedZone(ast, fsmNodeResult);
    }
    // otherwise only generate the FSM VariableDeclaration code
    else {
        generatedCode = fsmNodeResult.code;
    }

    let ret = fsmNodeResult;
    ret.code = generatedCode;

    return ret;
}

/**
 * If need parseClampedZone, this function always follow behind parseFsm
 * Hence, the fsm ObjectExpression part is already handled(trimed, parsed)
 */
function parseClampedZone(ast: any, prevResult: ParseResult) : string{
    // If the fsm is delcared by a new StateMachine({fsm}) expression,
    // change the new expression to a normal object
    let fsmPath = prevResult.path;


    if(fsmPath.parentPath && fsmPath.parentPath.isNewExpression()) {    
        if(fsmPath.getStatementParent()) {
            let statement = fsmPath.getStatementParent();

            let newSt = babel.template.statement.ast(prevResult.code);
            statement.replaceWith(newSt);
        }
    }
    let c5 = fsmPath.getStatementParent();
    
    let c = 1;
    c++;

    return generator(ast).code;
}

function getFsmVarName(path: IPath): string {
    if (!path)
        throw new Error("FSM not found >_<");

    // If the parent of the ObjectExpression is a VariableDeclarator,
    // Check if the VariableDeclarator has a id name
    // var fsm = {events:[]}
    if (path.parent && path.parentPath.node) {
        let node = <any>path.parentPath.node;
        if (node.type && node.type === 'VariableDeclarator'
            && node.id && node.id.name) {
            return node.id.name;
        }
    }

    // If the ObjectExpression is a new parameter
    if(path.getStatementParent()) {            
        let statement = path.getStatementParent();            
        let id = statement.getBindingIdentifiers();        
        for(let i in id){
            return i;
        }
    }
    

    return defaultFsmVarName;
}

function parseFsm(ast: any, code: string, context: vscode.ExtensionContext): ParseResult {
    // Find all object expression nodes
    let fsmNodes = getFsmObjectNodes(ast, code, context);
    if (!fsmNodes || fsmNodes.length == 0)
        throw new Error("FSM not found >_<");
    
    // Choose target FSM
    let fsmPath = fsmNodes[0];
    let res: ParseResult = { fsmVarName: "", code: "", callbacks: [], path: fsmPath};

    // Give it a var name
    res.fsmVarName = getFsmVarName(fsmPath);
    
    // parse and remove callback nodes
    babel.traverse(fsmPath.node, {
        enter: path => {
            const { node, parent } = path;
            if (isCallbackNode(node, path)) {
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

    let objectCode = generator(fsmPath.node).code;
    let completeCode = `var ${res.fsmVarName} = ${objectCode}`;
    res.code = completeCode;
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

function isFsmObjectExpression(node: any): boolean {
    if(!node)    
        return false;

    let foundProperties = node.properties && node.properties.length > 0;

    if (!foundProperties)
        return false;

  
    let eventsNodeName;
    let eventsNode;
    // check if have found node like 'events' or 'transitions'
    for (let i = 0; i < node.properties.length; i++) {
        let property = node.properties[i];
        if (property && property.key
            && property.key.type === 'Identifier'
            && validProperty.isValid(property.key.name, validProperty.validTransition)){             
            eventsNodeName = property.key.name;
            eventsNode = property;
            break;
        }
    }

    if(!eventsNodeName)
        return false;

    let propertyKeys:any[] = [];
    // check if the first element has 'name', 'from', 'to'
    if(eventsNode.value && eventsNode.value.type === 'ArrayExpression'
        && eventsNode.value.elements && eventsNode.value.elements[0]
        && eventsNode.value.elements[0].properties) {
        let evProperties = eventsNode.value.elements[0].properties;
        evProperties.forEach((property:any) => {
            if(property.key && property.key.name) {
                propertyKeys.push(property.key.name);
            }
        });
    }

    if(propertyKeys.includes('name') && propertyKeys.includes('from') && propertyKeys.includes('to'))
        return true;

    return false;
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

  
    // check if have found node like 'events' or 'transitions'
    for (let i = 0; i < init.properties.length; i++) {
        let property = init.properties[i];
        if (property && property.key
            && property.key.type === 'Identifier'
            && validProperty.isValid(property.key.name, validProperty.validTransition))
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

function isCallbackNode(node: any, path: IPath): boolean {    
    // check if have found node like 'callbacks' or 'methods'
    return (path.isObjectProperty && node && node.key && validProperty.isValid(node.key.name, validProperty.validCallback));
}

function isCondition(node: any, path: IPath): boolean {
    return (path.isProperty && node && node.key && node.key.name === 'condition');
}


function getFsmObjectNodes(ast: any, code: string, context: vscode.ExtensionContext): IPath[] {
    let targets: Set<IPath> = new Set();

    babel.traverse(ast, {
        enter: path => {
            const { node, parent } = path;
            if (isFsmObjectExpression(node)) {
                targets.add(path);
            }
        }
    });

    return Array.from(targets);
}

