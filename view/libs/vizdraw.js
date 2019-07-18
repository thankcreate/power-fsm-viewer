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
    
	let ret = `
		rankdir=TB;
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



function renderFsm(fsm) {
	let findSvg = $('svg');
	console.log(findSvg);
	if(findSvg.length > 0) {
		findSvg[0].remove();
	}

	let gr = convertFsmToDot(fsm);
	console.log(gr);

    let viz = new Viz();
    viz.renderSVGElement(gr)
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
    renderFsm(mainFsm);	
})

$(window).resize(() =>{
    panZoom.resize();
    panZoom.center();
})