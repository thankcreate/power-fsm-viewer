# Power FSM Viewer

A VS Code extension to view javascript finite state machine via Graphviz lib

## Features
* Parse both [javascript-state-machine](https://github.com/jakesgordon/javascript-state-machine) && [fsm-as-promised](https://github.com/vstirbu/fsm-as-promised) style FSM declaration
* No need for 3rd-party FSM lib. Just pure FSM declaration can be parsed.
* Support MemberExpression, TypeScript Enum, Static Class Property.
* Callbacks, Comments in state.
* 100% customizable attributes for every node/edge/graph.


## Usage
Press `Ctrl+Shift+P` to open commands view, choose `FSM View: Open` command.

## Quick Start

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
The commented `// fsm-config:{}` liens indicate the extra default setting.  
For all the parameters:

The above example used the naming convention of `initial/events` from [fsm-as-promised](https://github.com/vstirbu/fsm-as-promised), but you can also use `init/transitions` from [javascript-state-machine](https://github.com/jakesgordon/javascript-state-machine)


## Advanced Usage
```
// fsm-begin  <------!important

enum Keys {
    Home = 'Home',
    Walk = 'Walk',
    School = 'School',
}

class Style {
    static Walk = 'dashed'
}

let myFsm = {
    events: [{
        name: Keys.Walk, 
        from: Keys.Home, 
        to: Keys.School, 
        style: Style.Walk,
    }]
}

// fsm-end    <------!important
```





**Enjoy!**
