# Power FSM Viewer

A VS Code extension to view javascript finite state machine via Graphviz lib

## Features
* 100% customizable [attributes](https://github.com/thankcreate/power-fsm-viewer/wiki/Attributes) for every node/edge/graph: `color`, `style`, `shape`, `font`, `arrow`, `landscape/portrait`, etc.
* Supports both [javascript-state-machine](https://github.com/jakesgordon/javascript-state-machine) && [fsm-as-promised](https://github.com/vstirbu/fsm-as-promised) style FSM declaration
* No need for 3rd-party FSM lib. Just pure FSM declaration can be parsed.
* MemberExpression, TypeScript Enum, Static Class Property.
* Callbacks, comments in state.
* Dark/Light/HighContrast theme support.  

<img width='800px' src="https://raw.githubusercontent.com/thankcreate/power-fsm-viewer/master/preview/preview-3.png" />

## Usage
Press `Ctrl+Shift+P` to open commands view, choose `FSM View: Open`.

## Quick Start

<img align="right" width="200px" src="https://github.com/thankcreate/power-fsm-viewer/blob/master/preview/render-preview.png?raw=true" />

```
// fsm-config: {"font" : "Arial"}
// fsm-config: {"nodeShape" : "diamond"}
// fsm-config: {"initialShape" : "component", "finalShape" : "tab"}

let myFsm = {
    initial: 'home',
    final: 'end',
    events: [
        {name: 'walk', from: 'home', to: 'school', style: 'dotted'},
        {name: 'run', from: 'school', to: 'end', color: 'green'},
    ],
    states: [
        {name: 'school', color: 'green', comments:"interesting"}
    ],
    callbacks: {
        onhome: ()=>{},
        onend: function watchTV() {}
    }
}
```


The commented `// fsm-config:{}` lines indicate the file-scoped attributes.  
The inline attributes like `color` and `style` are state/event-scoped  
For all the config and inline parameters: [Attributes Page](https://github.com/thankcreate/power-fsm-viewer/wiki/Attributes)

The above example used the naming convention of `initial/events/callbacks` from [fsm-as-promised](https://github.com/vstirbu/fsm-as-promised),  
but you can also use `init/transitions/methods` from [javascript-state-machine](https://github.com/jakesgordon/javascript-state-machine)


## Advanced Usage
```
// fsm-config: {"rankdir": "LR"}

// fsm-begin  <------!important

var Event = {
    Walk: { First: 'FirstWalk' }
}

enum State {
    Home = 'Home',
    School = 'School',
}

class Style {
    static Walk = 'dashed'
}

let myFsm = new WhateverFSM({
    events: [{
        name: Event.Walk.First, 
        from: State.Home, 
        to: State.School, 
        style: Style.Walk,
    }]
})

// fsm-end    <------!important
```
<img height="100px" src="https://github.com/thankcreate/power-fsm-viewer/blob/master/preview/render-preview-2.png?raw=true" /> <br/> 
If you used MemberExpression in the FSM declaration, you must use `// fsm-begin` and `// fsm-end` to wrap all related code block.
The block should be self-contained.

## Credits
[Graphviz](http://www.graphviz.org/)  
[viz.js](https://github.com/mdaines/viz.js)  
[fsm-viewer](https://github.com/vstirbu/fsm-viewer)  
[babel](https://github.com/babel/babel)
[svg-pan-zoom](https://github.com/ariutta/svg-pan-zoom)




**Enjoy!**   
ThankCreate Studio 2019
