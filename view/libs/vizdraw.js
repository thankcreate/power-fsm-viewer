let fgColor = 'black'

function convertFsmToDot(fsm) {
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
	return ret;
}

function getHead(fsm) {
    let initialName = fsm.initial;
    let hasC = hasConfig();
    let rankdir = !hasC || !config.rankdir ? 'TB' : config.rankdir;
	let ret = `
		rankdir=${rankdir};
		bgcolor=transparent;
	`
	return ret;
}

function getEdges(fsm) {
    let ret = `edge [fontname = Tahoma, color=${fgColor}]
    `

	fsm.events.forEach(e => {
        let eventName = e.name;
		ret += (e.from + ' -> ' + e.to + ` [ label=${eventName} , fontsize=12, color=${fgColor}, fontcolor=${fgColor} ];\n`);
	});
	return ret;
}

function getNodes(fsm) {
    let initialName = fsm.initial;

	let ret = `		
	    node [shape = circle, fontname = Tahoma, color=${fgColor}, fontcolor=${fgColor} ]; ${initialName};
	    node [shape = rect, fontname = Tahoma, color=${fgColor}, fontcolor=${fgColor} ,margin=0.15, style=rounded];	    
	`
	return ret
}

function showErrorToUser(msg) {
    $('#error-info').html('>_< ' + msg);
}


function renderFsm(fsm) {
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
        showErrorToUser("We found the fsm defination, but it can't be parsed");
        return;
    }
    

    let viz = new Viz();
    viz.renderSVGElement(dot)
    .then(function(element) {
        
        document.body.appendChild(element);
		panZoom = svgPanZoom(element, panConfig)
		panZoom.zoom(0.9);
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
        showErrorToUser("We found the fsm defination, but it can't be parsed.\nDid you forget to reference the dependency?");
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
})

window.onerror = function(message) {
    this.console.log(message);
    this.console.log('name' +　message.name);
}