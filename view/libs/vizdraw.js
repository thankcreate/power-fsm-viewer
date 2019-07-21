"use strict";
// default
let curConfig = {
    rankdir: "TB",
    nodeShape: 'rect',
    nodeStyle: 'rounded',
    arrowHead: 'normal',
    arrowTail: 'normal',
    dir: 'forward',
    arrowStyle: 'solid',
    initialShape: 'oval',
    finalShape: 'oval',
    maxRowLetters: 20,
    weight: 1,
    font: 'Arial',
    fontSize: 12,
    color: 'whitesmoke',
    fontColor: 'whitesmoke',
    bgColor: 'transparent',
    nodeDot: '',
    edgeDot: '',
    graphDot: '',
};
let gStates = new Map();
let gEvents = new Map();
function normalisze() {
    if (targetFsm.init)
        targetFsm.initial = targetFsm.init;
    if (targetFsm.methods)
        targetFsm.callbacks = targetFsm.methods;
    if (targetFsm.transitions)
        targetFsm.events = targetFsm.transitions;
}
function prepareFsmData(fsm) {
    normalisze();
    gStates.clear();
    gEvents.clear();
    // set all event names, state names
    if (fsm.events && fsm.events.length > 0) {
        for (let i in fsm.events) {
            let ev = fsm.events[i];
            addToSet(ev.name, gEvents);
            addToSet(ev.from, gStates);
            addToSet(ev.to, gStates);
        }
    }
    if (fsm.initial) {
        addToSet(fsm.inital, gStates);
    }
    if (fsm.final) {
        addToSet(fsm.final, gStates);
    }
    if (fsm.states) {
        for (let i in fsm.states) {
            let st = fsm.states[i];
            if (st.name) {
                addToSet(st.name, gStates);
            }
        }
    }
    // deal with callbacks
    if (callbacks && callbacks.length > 0) {
        for (let i in callbacks) {
            let cb = callbacks[i];
            handleCallback(cb);
        }
    }
    // deal with state defination
    if (fsm.states && fsm.states.length > 0) {
        for (let i in fsm.states) {
            let st = fsm.states[i];
            handleState(st);
        }
    }
}
function handleState(state) {
    if (state.comment)
        state.comments = state.comment;
    let stName = state.name;
    // Attach all attribute of fsm state to info map
    if (gStates.has(stName)) {
        for (let i in state) {
            gStates.get(stName)[i] = state[i];
        }
    }
}
function handleCallback(cb) {
    let prefix = '';
    let remain = '';
    // prefix + state
    let allowedPrefix = ['onentered', 'onenter', 'onleave', 'on'];
    for (let i in allowedPrefix) {
        let ap = allowedPrefix[i];
        if (cb.key.startsWith(ap)) {
            let rem = cb.key.substring(ap.length);
            if (rem && gStates.has(rem)) {
                console.log(ap + '  ' + cb.value + ' ahahhahaa');
                gStates.get(rem)[ap] = cb.value;
                return;
            }
        }
    }
}
function addToSet(input, container) {
    if (!input)
        return;
    if (input.constructor === Array) {
        input = input;
        input.forEach((e) => {
            if (!container.has(e))
                container.set(e, {});
        });
    }
    else {
        input = input;
        if (!container.has(input))
            container.set(input, {});
    }
}
function applyConfig() {
    if (!hasConfig())
        return;
    applyObjectProperty(config, curConfig);
}
// incase user mistype the caps
// for ignore the uppercase/lowercase here
function applyObjectProperty(from, to) {
    // from: the config in user's comment
    // to: the default config defined at the top of this file
    if (!from || !to)
        return;
    for (let i in from) {
        for (let j in to) {
            if (j.toLowerCase() === i.toLowerCase()) {
                to[j] = from[i];
            }
        }
        to[i] = from[i];
    }
}
function convertFsmToDot(fsm) {
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
    `;
    console.log(ret);
    return ret;
}
function getHead(fsm) {
    let ret = `
		rankdir=${curConfig.rankdir};
		bgcolor=${curConfig.bgColor};
    `;
    if (config.graphDot) {
        for (let i in config.graphDot) {
            let graphItem = `${i}=${config.graphDot[i]}`;
            ret += graphItem + '\n';
        }
    }
    return ret;
}
function getEdges(fsm) {
    let ret = '';
    // Default
    ret += getItemLine('edge', [
        { k: 'fontname', v: curConfig.font },
        { k: 'weight', v: curConfig.weight },
        { k: 'arrowhead', v: curConfig.arrowHead },
        { k: 'arrowtail', v: curConfig.arrowTail },
        { k: 'dir', v: curConfig.dir },
        { k: 'fontsize', v: curConfig.fontSize },
        { k: 'fontname', v: curConfig.font },
        { k: 'style', v: curConfig.arrowStyle },
        { k: 'color', v: curConfig.color },
        { k: 'fontcolor', v: curConfig.fontColor },
    ], config.edgeDot);
    // Each
    fsm.events.forEach((e) => {
        let eventName = `"  ${e.name} "`;
        let eventPath = ` ${e.from} -> ${e.to} `;
        ret += getItemLine(eventPath, [
            { k: 'label', v: eventName },
            { k: 'arrowhead', v: e.arrowhead || e.arrowHead },
            { k: 'arrowtail', v: e.arrowtail || e.arrowTail },
            { k: 'dir', v: e.dir },
            { k: 'style', v: e.style },
            { k: 'color', v: e.color },
            { k: 'fontcolor', v: e.fontColor || e.fontcolor },
        ], e.dot);
    });
    return ret;
}
function getNodes(fsm) {
    let ret = '';
    // Every state has their separate attributes in getCommonNotes()    
    ret += getItemLine('node', [
        { k: 'shape', v: curConfig.nodeShape },
        { k: 'style', v: curConfig.nodeStyle },
        { k: 'fontname', v: curConfig.font },
        { k: 'fontsize', v: curConfig.fontSize },
        { k: 'color', v: curConfig.color },
        { k: 'fontcolor', v: curConfig.fontColor },
        { k: 'margin', v: 0.1 },
    ], curConfig.nodeDot);
    // Initial & Final nodes
    if (fsm.initial) {
        ret += getItemLine(fsm.initial, [
            { k: 'shape', v: curConfig.initialShape },
            { k: 'margin', v: 0.15 },
        ]);
    }
    if (fsm.final) {
        ret += getItemLine(fsm.final, [
            { k: 'shape', v: curConfig.finalShape },
            { k: 'margin', v: 0.15 },
        ]);
    }
    // Nodes with callback    
    ret += getCommonNotes(fsm);
    ret += '\n';
    // console.log(ret);
    return ret;
}
function isKindOf(target, cate) {
    if (!cate)
        return false;
    if (cate.constructor === Array) {
        cate = cate;
        return cate.includes(target);
    }
    else
        return target === cate;
}
function getCommonNotes(fsm) {
    let ret = "";
    gStates.forEach((info, stName, map) => {
        let label;
        if (info.onenter || info.onentered || info.onleave || info.on || info.comments) {
            let title = stName;
            label = `<<table border="0" cellpadding="0" cellspacing="0"><tr><td>${title}</td></tr>`;
            // callbacks
            if (info.onenter || info.onentered || info.onleave || info.on)
                label += getTableHrLine();
            if (info.onenter)
                label += getTableItem("entry/" + info.onenter);
            if (info.onentered)
                label += getTableItem("entry/" + info.onentered);
            if (info.on)
                label += getTableItem("entry/" + info.on);
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
            { k: 'shape', v: info.shape },
            { k: 'style', v: info.style },
            { k: 'label', v: label },
            { k: 'color', v: info.color },
            { k: 'fontcolor', v: info.fontColor || info.fontcolor },
        ], info.dot);
        ret += nodeItem;
    });
    return ret;
}
function getItemLine(id, attributes, dot) {
    let attr = '';
    attributes.forEach(e => {
        attr += exp(e.k, e.v);
    });
    if (dot) {
        for (let i in dot) {
            attr += exp(i.toLowerCase(), dot[i]);
        }
    }
    let item = `${id} [dummy=0 ${attr}]`;
    return item + '\n';
}
function exp(key, value) {
    if (!key || !value)
        return ``;
    return `,${key}=${value}`;
}
function getCommentsTablePart(comments) {
    let ret = '';
    if (comments.constructor != Array) {
        comments = comments;
        let tempAr = [];
        while (comments && comments.length > curConfig.maxRowLetters) {
            let first = comments.substr(0, curConfig.maxRowLetters);
            tempAr.push(first);
            comments = comments.substr(first.length);
        }
        tempAr.push(comments);
        comments = tempAr;
    }
    comments = comments;
    comments.forEach(e => {
        ret += getTableItem(e);
    });
    return ret;
}
function getTableHrLine() {
    return `<tr><td cellpadding="2" cellspacing="2"></td></tr><hr/><tr><td cellpadding="2" cellspacing="2"></td></tr>`;
}
function getTableItem(content) {
    return `<tr><td align="left" cellpadding="0">${content}</td></tr>`;
}
function showErrorToUser(msg) {
    $('#error-info').html('>_<<br/>' + msg);
}
var CodeTheme;
(function (CodeTheme) {
    CodeTheme[CodeTheme["Dark"] = 0] = "Dark";
    CodeTheme[CodeTheme["Light"] = 1] = "Light";
    CodeTheme[CodeTheme["HighContrast"] = 2] = "HighContrast";
    CodeTheme[CodeTheme["Unknown"] = 3] = "Unknown";
})(CodeTheme || (CodeTheme = {}));
function getTheme() {
    if ($('.vscode-dark')[0]) {
        return CodeTheme.Dark;
    }
    else if ($('.vscode-light')[0]) {
        return CodeTheme.Light;
    }
    else if ($('.vscode-high-contrast')[0]) {
        return CodeTheme.HighContrast;
    }
    return CodeTheme.Dark;
}
function ajudstColorByTheme() {
    let fgColor = 'whitesmoke';
    let theme = getTheme();
    if (theme === CodeTheme.Dark) {
        fgColor = 'whitesmoke';
    }
    if (theme === CodeTheme.Light) {
        fgColor = 'black';
    }
    if (theme === CodeTheme.HighContrast) {
        fgColor = 'whitesmoke';
    }
    curConfig.color = fgColor;
    curConfig.fontColor = fgColor;
}
function renderFsm(fsm) {
    let findSvg = $('svg');
    console.log(findSvg);
    if (findSvg.length > 0) {
        findSvg[0].remove();
    }
    let dot = '';
    try {
        dot = convertFsmToDot(fsm);
    }
    catch (error) {
        // The error message here is misleading
        // It will say 'inital' is not found when the fsm object is undefined by a missing external reference
        showErrorToUser("We found the fsm defination, but it can't be parsed !!" + error.message);
        return;
    }
    let viz = new Viz();
    viz.renderSVGElement(dot)
        .then(function (element) {
        document.body.appendChild(element);
        panZoom = svgPanZoom(element, panConfig);
        panZoom.zoom(0.8);
        trimZoomBtns();
    })
        .catch((error) => {
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
let panConfig = {
    zoomEnabled: true,
    controlIconsEnabled: true,
    fit: true,
    center: true,
};
let panZoom;
let lastTheme = CodeTheme.Unknown;
function checkIfThemeChange() {
    setInterval(() => {
        let curTheme = getTheme();
        if (lastTheme != CodeTheme.Unknown &&
            lastTheme != curTheme) {
            renderFsm(targetFsm);
        }
        lastTheme = curTheme;
    }, 250);
}
$(document).ready(() => {
    checkIfThemeChange();
    if (typeof targetFsm == "undefined") {
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
});
function hasConfig() {
    return typeof config != 'undefined';
}
$(window).resize(() => {
    panZoom.resize();
    panZoom.center();
    panZoom.zoom(0.8);
    trimZoomBtns();
});
window.onerror = function (message) {
    this.console.log(message);
    this.console.log('name' + message.name);
};
//# sourceMappingURL=vizdraw.js.map