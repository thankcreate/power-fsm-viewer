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
    arrowHead: 'normal',
    initialShape: 'oval',
    finalShape: 'oval',
    maxRowLetters: 20,
    style: 'rounded',
    weight: 1,
}

interface MyCallback {
    key: string,
    value: string
}

let fgColor = 'black'

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

function prepareFsmData(fsm:any) {
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
    
    let stName = state.name;
    if(gStates.has(stName)) {
        for(let i in state) {
            gStates.get(stName)[i] = state[i];
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
               
                gStates.get(rem)[ap] = cb.value;
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

function applyObjectProperty(from:any, to:any) {
    if(!from || !to)
        return;

    for(let i in from) {
        to[i] = from[i];
    }
}

function convertFsmToDot(fsm:any) {
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
    let hasC = hasConfig();
    let rankdir = !hasC || !curConfig.rankdir ? 'TB' : config.rankdir;
	let ret = `
		rankdir=${rankdir};
		bgcolor=transparent;
	`
	return ret;
}

function getEdges(fsm:any) {
    let ret = `edge [fontname = ${curConfig.font}, color=${fgColor}]
    `

	fsm.events.forEach((e:any) => {
        let eventName = e.name;
		ret += (e.from + ' -> ' + e.to + ` [ label="${'  ' + eventName}" ,weight=${curConfig.weight} ,arrowhead=${curConfig.arrowHead}, fontsize=${curConfig.fontSize}, color=${fgColor}, fontcolor=${fgColor} ];\n`);
	});
	return ret;
}

function getNodes(fsm:any) {
    
    let ret = '';
    
    // Initial & Final nodes
    if(fsm.initial) {
        ret += `
        ${fsm.initial} [shape = ${curConfig.initialShape}, fontname = ${curConfig.font}, fontsize=${curConfig.fontSize}, margin=0.15]; 
        `
    }	 
    if(fsm.final) {
        ret += `
        ${fsm.final} [shape = ${curConfig.finalShape}, fontname = ${curConfig.font}, fontsize=${curConfig.fontSize}, margin=0.15];
        `
    }
    
    // General nodes, actually this part has no use now
    // every state has their separate attributes in getCommonNotes()
    ret += `
    node [shape = ${curConfig.nodeShape}, fontname = ${curConfig.font}, fontsize=${curConfig.fontSize}, margin=0.15];	    
    `
    
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

        // label
        let labelExp = label ? `,label=${label}` : ``;        

        // shape
        let shape = curConfig.nodeShape;
        if(isKindOf(stName, fsm.initial))
            shape = curConfig.initialShape;
        else if(isKindOf(stName, fsm.final))
            shape = curConfig.finalShape;
        if(info.shape) 
            shape = info.shape;

        // style
        let style = curConfig.style;
        if(info.style) 
            style = info.style;


        let nodeItem = `
            ${stName} [shape = ${shape}, fontname = ${curConfig.font}, fontsize=${curConfig.fontSize}, margin=0.1, style=${style} ${labelExp}]
            `
        ret += nodeItem;
    });
    return ret;
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
    .then(function(element) {
        
        document.body.appendChild(element);
		panZoom = svgPanZoom(element, panConfig)
		panZoom.zoom(0.8);
    })
    .catch(error => {
        // Create a new Viz instance (@see Caveats page for more info)
        viz = new Viz();

        // Possibly display the error
        console.error(error);
    });
}

let panConfig = 
{
    zoomEnabled: true,
    controlIconsEnabled: true,
    fit: true,
    center: true,    
 }

let panZoom;

$(document).ready(()=>{
    
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