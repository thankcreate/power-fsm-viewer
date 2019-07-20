declare var callbacks:any;
declare var targetFsm:any;
declare var config:any;
declare var Viz:any;
declare var svgPanZoom:any;

// default
let curConfig = {
    rankdir: "TB",
    font: 'Arial',
    fontSize: 12,

    nodeShape: 'rect',
    nodeStyle: 'rounded',

    arrowHead: 'normal',
    arrowTail: 'normal',
    dir:'forward',
    arrowStyle: 'solid',

    initialShape: 'oval',
    finalShape: 'oval',

    maxRowLetters: 20,
    weight: 1,

    color: 'whitesmoke',
    fontColor: 'whitesmoke',
    bgColor: 'transparent',

    nodeDot: '',
    edgeDot: '',
    graphDot: '',
}

interface MyCallback {
    key: string,
    value: string
}

interface Attribute {
    k: string,
    v: string | number,
}

interface Info {
    onenter?: string,
    onentered?: string,
    onleave?: string,
    comments?: string | string[],
    
    shape?: string,
    style?: string,
}
type InfoMap = Map<string,Info>;

let gStates: InfoMap = new Map();
let gEvents: InfoMap  = new Map();

function normalisze() {
    if(targetFsm.init) targetFsm.initial = targetFsm.init;
    if(targetFsm.methods) targetFsm.callbacks = targetFsm.methods;
    if(targetFsm.transitions) targetFsm.events = targetFsm.transitions;
}

function prepareFsmData(fsm:any) {
    normalisze();
    gStates.clear();
    gEvents.clear();    


    // set all event names, state names
    if(fsm.events && fsm.events.length > 0) {
        for(let i in fsm.events) {
            let ev = fsm.events[i];            
            addToSet(ev.name, gEvents)
            addToSet(ev.from, gStates)
            addToSet(ev.to, gStates)          
        }
    }

    if(fsm.initial) {
        addToSet(fsm.inital, gStates);
    }

    if(fsm.final) {
        addToSet(fsm.final, gStates);
    }

    if(fsm.states) {
        for(let i in fsm.states) {
            let st = fsm.states[i];
            if(st.name) {
                addToSet(st.name, gStates);
            }
        }
    }
    
    // deal with callbacks
    if(callbacks && callbacks.length > 0) {
        for(let i in callbacks) {
            let cb = callbacks[i] as MyCallback;
            handleCallback(cb);
        }
    }

    // deal with state defination
    if(fsm.states && fsm.states.length > 0) {
        for(let i in fsm.states) {
            let st = fsm.states[i];
            handleState(st);
        }
    }
}

function handleState(state:any) {
    if(state.comment) state.comments = state.comment;
    
    let stName = state.name;

    // Attach all attribute of fsm state to info map
    if(gStates.has(stName)) {        
        for(let i in state) {
            (<any>gStates.get(stName))[i] = state[i];
        }
    }
}

function handleCallback(cb: MyCallback) {
    let prefix = '';
    let remain = '';

    // prefix + state
    let allowedPrefix = ['onentered', 'onenter', 'onleave'];
    for(let i in allowedPrefix) {
        let ap = allowedPrefix[i];
        if(cb.key.startsWith(ap)) {
            let rem = cb.key.substring(ap.length);
            if(rem && gStates.has(rem)) {
               
                (<any>gStates.get(rem))[ap] = cb.value;
                return;
            }
        }
    }
}

function addToSet(input:string | Array<string>, container: InfoMap) {
    if(!input)
        return;

    if(input.constructor === Array) {
        input = input as Array<string>;
        input.forEach((e:any)=>{      
            if(!container.has(e))      
                container.set(e, {});
        })
    }
    else {
        input = input as string;
        if(!container.has(input))      
            container.set(input, {});        
    }
}

function applyConfig() {
    if(!hasConfig()) 
        return;
    
    applyObjectProperty(config, curConfig);
}

// incase user mistype the caps
// for ignore the uppercase/lowercase here
function applyObjectProperty(from:any, to:any) {
    // from: the config in user's comment
    // to: the default config defined at the top of this file

    if(!from || !to)
        return;

    for(let i in from) {
        for(let j in to) {
            if(j.toLowerCase() === i.toLowerCase()) {
                to[j] = from[i];
            }
        }
        to[i] = from[i];
    }
}

function convertFsmToDot(fsm:any) {
    ajudstColorByTheme();
    prepareFsmData(fsm);

    applyConfig();
    
    let head = getHead(fsm);
    let nodes = getNodes(fsm);
    let events = getEdges(fsm);

    let ret = `
    digraph finite_state_machine {
        ${head}
        ${nodes}
        ${events}
    }
    `
    console.log(ret);
	return ret;
}

function getHead(fsm:any) {   
	let ret = `
		rankdir=${curConfig.rankdir};
		bgcolor=${curConfig.bgColor};
    `
    if(config.graphDot) {
        for(let i in config.graphDot) {
            let graphItem = `${i}=${config.graphDot[i]}`;
            ret += graphItem + '\n';
        }
    }

	return ret;
}

function getEdges(fsm:any) {    
    let ret = '';    

    // Default
    ret += getItemLine('edge', [
        {k: 'fontname', v:curConfig.font},
        {k: 'weight', v:curConfig.weight},
        {k: 'arrowhead', v:curConfig.arrowHead},
        {k: 'arrowtail', v:curConfig.arrowTail},
        {k: 'dir', v:curConfig.dir},
        {k: 'fontsize', v:curConfig.fontSize},
        {k: 'fontname', v:curConfig.font},       
        {k: 'style', v:curConfig.arrowStyle},
        {k: 'color', v: curConfig.color},
        {k: 'fontcolor', v: curConfig.fontColor},
    ], config.edgeDot)

    // Each
	fsm.events.forEach((e:any) => {
        let eventName = `"  ${e.name} "`;
        let eventPath =` ${e.from} -> ${e.to} `;        
        ret += getItemLine(eventPath, [
            {k: 'label', v:eventName},
            {k: 'arrowhead', v:e.arrowhead || e.arrowHead},
            {k: 'arrowtail', v:e.arrowtail || e.arrowTail},
            {k: 'dir', v:e.dir},
            {k: 'style', v:e.style},
            {k: 'color', v:e.color},
            {k: 'fontcolor', v:e.fontColor || e.fontcolor},
        ], e.dot)
	});
	return ret;
}



function getNodes(fsm:any) {
    
    let ret = '';
    
    // Every state has their separate attributes in getCommonNotes()    
    ret += getItemLine('node', [
        {k:'shape', v:curConfig.nodeShape},
        {k:'style', v:curConfig.nodeStyle},
        {k:'fontname', v:curConfig.font},
        {k:'fontsize', v:curConfig.fontSize},
        {k:'color', v: curConfig.color},
        {k:'fontcolor', v: curConfig.fontColor},
        {k:'margin', v:0.1},
    ], curConfig.nodeDot);
    
    // Initial & Final nodes
    if(fsm.initial) {
        ret += getItemLine(fsm.initial, [
            {k:'shape', v:curConfig.initialShape},
            {k:'margin', v:0.15},
        ]);
    }	 
    if(fsm.final) {       
        ret += getItemLine(fsm.final, [
            {k:'shape', v:curConfig.finalShape},
            {k:'margin', v:0.15},
        ]);
    }

    // Nodes with callback    
    ret += getCommonNotes(fsm);
    ret += '\n';

    // console.log(ret);
	return ret;
}


function isKindOf(target: string, cate:string | string[]) {
  
    if(!cate)
        return false;

    if(cate.constructor === Array) {
        cate = cate as string[];
        return cate.includes(target);
    }
    else 
        return target === cate;
}

function getCommonNotes(fsm:any) {
    let ret = "";
    
    gStates.forEach((info, stName, map) =>{
        let label;
        if(info.onenter || info.onentered || info.onleave || info.comments) {
            let title = stName;
            label = `<<table border="0" cellpadding="0" cellspacing="0"><tr><td>${title}</td></tr>`;

            // callbacks
            if (info.onenter || info.onentered || info.onleave)
                label += getTableHrLine();

            if (info.onenter)
                label += getTableItem("entry/" + info.onenter);
            if (info.onentered)
                label += getTableItem("entry/" + info.onentered);
            if (info.onleave)
                label += getTableItem("exit/" + info.onleave);


            // comments            
            if (info.comments) {
                label += getTableHrLine();
                label += getCommentsTablePart(info.comments);
            }


            label += `</table>>`;            
        }

        let nodeItem = getItemLine(stName, [
            {k:'shape', v:info.shape},
            {k:'style', v:info.style},
            {k:'label', v:label},
            {k:'color', v:(<any>info).color},
            {k:'fontcolor', v:(<any>info).fontColor || (<any>info).fontcolor},
        ], (<any>info).dot);
        ret += nodeItem;
    });
    return ret;
}



function getItemLine(id: string, attributes: Attribute[], dot?: any) {
    let attr = '';
    attributes.forEach(e=>{
        attr += exp(e.k, e.v);
    });

    if(dot) {
        for(let i in dot) {
            attr += exp(i.toLowerCase(), dot[i]);
        }
    }

    let item = `${id} [dummy=0 ${attr}]`;
    return item + '\n';
}

function exp(key: string, value: string | number) {
    if(!key || !value)
        return ``
    
    return `,${key}=${value}`;
}

function getCommentsTablePart(comments:string | string[]) {
    let ret = '';
    if(comments.constructor != Array) {
        comments = comments as string;
        let tempAr = [];
        while(comments && comments.length > curConfig.maxRowLetters) {
            let first = comments.substr(0, curConfig.maxRowLetters);
            tempAr.push(first);
            comments = comments.substr(first.length);            
        }
        tempAr.push(comments);
        comments = tempAr;
    }
    
    comments = comments as string[];
    comments.forEach(e=>{
        ret += getTableItem(e);
    })

    return ret;
}

function getTableHrLine() {
    return `<tr><td cellpadding="2" cellspacing="2"></td></tr><hr/><tr><td cellpadding="2" cellspacing="2"></td></tr>`;
}

function getTableItem(content:string) {
    return `<tr><td align="left" cellpadding="0">${content}</td></tr>`;
}


function showErrorToUser(msg:string) {
    $('#error-info').html('>_<<br/>' + msg);
}

enum CodeTheme {
    Dark,
    Light,
    HighContrast,
    Unknown,
}

function getTheme() : CodeTheme {
    if($('.vscode-dark')[0] ) {
        return CodeTheme.Dark;
    }
    else if($('.vscode-light')[0] ) {
        return CodeTheme.Light;
    }
    else if($('.vscode-high-contrast')[0] ) {
        return CodeTheme.HighContrast;
    }
}

function ajudstColorByTheme() {
    let fgColor = 'whitesmoke';
    let theme = getTheme();
    if(theme === CodeTheme.Dark) {
        fgColor = 'whitesmoke';
    }
    if(theme === CodeTheme.Light) {
        fgColor = 'black';
    }
    if(theme === CodeTheme.HighContrast) {
        fgColor = 'whitesmoke';
    }
    curConfig.color = fgColor;
    curConfig.fontColor = fgColor;
}

function renderFsm(fsm:any) {
    
	let findSvg = $('svg');
    console.log(findSvg);
    
	if(findSvg.length > 0) {
		findSvg[0].remove();
	}


    let dot = ''
    try {
        dot = convertFsmToDot(fsm);    
    } catch (error) {
        // The error message here is misleading
        // It will say 'inital' is not found when the fsm object is undefined by a missing external reference
        showErrorToUser("We found the fsm defination, but it can't be parsed !!" + error.message);
        return;
    }
    

    let viz = new Viz();
    viz.renderSVGElement(dot)
    .then(function(element:any) {
        
        document.body.appendChild(element);
		panZoom = svgPanZoom(element, panConfig)
        panZoom.zoom(0.8);
        trimZoomBtns();
    })
    .catch((error:any)=> {
        // Create a new Viz instance (@see Caveats page for more info)
        viz = new Viz();

        // Possibly display the error
        console.error(error);
    });
}

function trimZoomBtns() {
    $('#svg-pan-zoom-zoom-in rect.svg-pan-zoom-control-background').attr('rx', 300);
    $('#svg-pan-zoom-zoom-out rect.svg-pan-zoom-control-background').attr('rx', 300);
    $('#svg-pan-zoom-reset-pan-zoom rect.svg-pan-zoom-control-background').attr('rx', 13);
}

let panConfig = 
{
    zoomEnabled: true,
    controlIconsEnabled: true,
    fit: true,
    center: true,    
 }

let panZoom:any;

let lastTheme: CodeTheme = CodeTheme.Unknown;
function checkIfThemeChange() {
    setInterval(()=>{
        let curTheme = getTheme();
        if(lastTheme != CodeTheme.Unknown && 
            lastTheme != curTheme) {                
                renderFsm(targetFsm);
            }
            lastTheme = curTheme;
    }, 250)
}

$(document).ready(()=>{
    checkIfThemeChange();

    if(typeof targetFsm == "undefined") {        
        showErrorToUser(`We found the fsm defination, but it can't be parsed<br/>
If you used <b>MemberExpression</b> in the FSM declaration, please use comments like this to wrap your code:<br/>
<br/>
// fsm-begin <----This is important<br/>
<br/>
var keys = {key1: 'key'};<br/>
<br/>
var fsm = {<br/>
&nbsp;&nbsp;&nbsp;&nbsp;events: [{name: keys.key1, from:'haha', to:'hehe'}]<br/>
}<br/>
<br/>
// fsm-end <----This is important
`);
    }
    else {
        renderFsm(targetFsm);	
    }
})

function hasConfig() {
    return typeof config !=  'undefined';
}

$(window).resize(() =>{
    panZoom.resize();
    panZoom.center();
    panZoom.zoom(0.8);
})

window.onerror = function(message:any) {
    this.console.log(message);
    this.console.log('name' +　message.name);
}