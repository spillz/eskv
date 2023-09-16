import {Rect} from './geometry.js'
import {App} from './app.js'

export class Touch {
    /**@type {Vec2|[number,number]} */
    pos = [0,0];
    /**@type {string} */
    state = 'touch_up'; // one of 'touch_up', 'touch_down', 'touch_move', 'touch_cancel'
    /**@type {'touch'|'mouse'|'keyboard'} */
    device = 'touch' //source of touch: touch, mouse or keyboard
    nativeObject = null;
    nativeEvent = null;
    constructor(props = {}) {
        for(let p in props) {
            this[p] = props[p];
        }
    }
    copy() {
        return new Touch({pos:[...this.pos], state:this.state, device:this.device, nativeObject:this.nativeObject, nativeEvent:this.nativeEvent});
    }
    /** @type {(widget:import('widgets').Widget)=>Touch} */
    local(widget) {
        return new Touch({pos:[...widget.toLocal(this.pos)], state:this.state, device:this.device, nativeObject:this.nativeObject, nativeEvent:this.nativeEvent});
    }
    /** @returns {Rect} */
    get rect() {
        return new Rect([...this.pos, 0, 0]);
    }
    /**@type {number} x-coordinate */
    set x(value) {
        this.pos[0] = value;
    }
    /**@type {number} y-coordinate */
    set y(value) {
        this.pos[1] = value;
    }
    get x() {
        return this.pos[0];
    }
    get y() {
        return this.pos[1];
    }
    /** 
     * Returns the widget that currently grabs all touch events or null if no widget is grabbed. 
     * @type {import('widgets').Widget} */
    get grabbed() {
        return App.get().inputHandler.grabbed;
    }
    /**
     * Tells the framework that `widget` will be the exclusive target of all touch operations until ungrab is called
     * @param {*} widget 
     * @returns 
     */
    grab(widget) {
        App.get().inputHandler.grab(widget);
    }
    /**Release the current widget target of all touches. Future touchs will bubble up through the widget tree. */
    ungrab() {
        App.get().inputHandler.ungrab();
    }
}



export class InputHandler {
    grabbed = null;
    mouseTouchEmulation = true;
    mouseev = null;
    keyStates = {};
    constructor(app) {
        this.app = app;
        this.canvas = app.canvas;
        let canvas = this.canvas;
        // Register touch event handlers
        let that = this;

        // onclick	The event occurs when the user clicks on an element
        // oncontextmenu	The event occurs when the user right-clicks on an element to open a context menu
        // ondblclick	The event occurs when the user double-clicks on an element
        // onmousedown	The event occurs when the user presses a mouse button over an element
        // onmouseenter	The event occurs when the pointer is moved onto an element
        // onmouseleave	The event occurs when the pointer is moved out of an element
        // onmousemove	The event occurs when the pointer is moving while it is over an element
        // onmouseout	The event occurs when a user moves the mouse pointer out of an element, or out of one of its children
        // onmouseover	The event occurs when the pointer is moved onto an element, or onto one of its children
        // onmouseup	The event occurs when a user releases a mouse button over an element

        document.addEventListener('keydown', function(ev){that.process_key(ev, 'key_down');}, true);
        document.addEventListener('keyup', function(ev){that.process_key(ev, 'key_up');}, true);
        canvas.addEventListener('mousedown', function(ev){that.process_mouse(ev, 'mouse_down');}, true);
        canvas.addEventListener('mousemove', function(ev){that.process_mouse(ev, 'mouse_move');}, true);
        canvas.addEventListener('mouseout', function(ev){that.process_mouse(ev, 'mouse_cancel');}, true);
        canvas.addEventListener('mouseup', function(ev){that.process_mouse(ev, 'mouse_up');}, true);
        canvas.addEventListener('touchstart', function(ev){that.process_touch(ev, 'touch_down');}, false);
        canvas.addEventListener('touchmove', function(ev){that.process_touch(ev, 'touch_move');}, false);
        canvas.addEventListener('touchcancel', function(ev){that.process_touch(ev, 'touch_cancel');}, false);
        canvas.addEventListener('touchend', function(ev){that.process_touch(ev, 'touch_up');}, false);
        canvas.addEventListener('wheel', function(ev){that.process_wheel(ev, 'wheel');}, true);

        window.history.replaceState(null, document.title, location.pathname+"#!/backbutton");
        window.history.pushState(null, document.title, location.pathname);
        // location.href = location.href+"#!/backbutton";
        window.addEventListener("popstate", function(ev) {that.process_back(ev, 'back_button')}, false);
    }
    grab(widget) {
        this.grabbed = widget;
    }
    ungrab() {
        this.grabbed = null;
    }
    isKeyUp(key) {
        return (key in this.keyStates) && this.keyStates[key];
    }
    isKeyDown(key) {
        return (key in this.keyStates) && this.keyStates[key];
    }
    process_key(ev, name) {
        if(name=='key_up') this.keyStates[ev.key] = false;
        else if(name=='key_down') this.keyStates[ev.key] = true;
        //TODO: We emit only to the top level app, since we don't have a focus concept (yet)
        //for it to make sense to emit to specific widgets
        this.app.emit(name, {states:this.keyStates, event:ev});
    }
    process_touch(ev, name) {
        if(this.grabbed != null) {
            for(let to of ev.changedTouches) { 
                let pos0 = [to.clientX, to.clientY];
                let pos = [...this.grabbed.iterParents()].reverse().reduce((prev,cur)=>cur.toLocal(prev), pos0);
                let t = new Touch({pos:pos, state:name, nativeObject:to, nativeEvent:ev});
                this.grabbed.emit(name, t);
            }
        } else {
            for(let to of ev.changedTouches) { 
                let t = new Touch({pos:this.app.toLocal([to.clientX, to.clientY]), state:name, nativeObject:to, nativeEvent:ev});
                this.app.childEmit(name, t, true);
            }
        }
        ev.preventDefault();
    }
    process_back(ev, name) {
        if(location.hash === "#!/backbutton") {
            history.replaceState(null, document.title, location.pathname);
            this.app.childEmit('back_button', ev)
        }
    }
    process_mouse(ev, name) {
        this.mouseev = ev;
        ev.preventDefault();
        if(this.mouseTouchEmulation) {
            let mapping = {'mouse_up':'touch_up','mouse_down':'touch_down','mouse_move':'touch_move','mouse_cancel':'touch_cancel'}
            if(ev.buttons!=1 && name!='mouse_up') return;
            if(this.grabbed != null) {
                let pos0 = [ev.clientX, ev.clientY];
                let pos = [...this.grabbed.iterParents()].reverse().reduce((prev,cur)=>cur.toLocal(prev), pos0);
                let t = new Touch({pos:pos, state:mapping[name], nativeObject:ev});
                this.grabbed.emit(mapping[name], t);
            } else {
                let t = new Touch({pos:this.app.toLocal([ev.clientX, ev.clientY]), state:mapping[name], nativeObject:ev});
                this.app.childEmit(mapping[name], t, true);
            }
        } else {
            if(this.grabbed != null) {
                this.grabbed.emit(name, ev);
            } else {
                this.app.childEmit(name, ev, true);
            }
        }
    }
    process_wheel(ev, name) {
        // Use the event's data to call out to the appropriate gesture handlers
        if(this.mouseev==null) return;
        if(this.grabbed != null) {
            let pos0 = [this.mouseev.clientX, this.mouseev.clientY];
            let pos = [...this.grabbed.iterParents()].reverse().reduce((prev,cur)=>cur.toLocal(prev), pos0);
            let t = new Touch({pos:pos, state:name, nativeObject:ev});
            return this.grabbed.emit(name, t);
        } else {
            let t = new Touch({pos:this.app.toLocal([this.mouseev.clientX, this.mouseev.clientY]), state:name, nativeObject:ev});
            this.app.childEmit(name, t, true);
        }
        ev.preventDefault();
    }
    vibrate(intensity1, intensity2, duration) {
        window.navigator.vibrate(duration); //default vibration does not support intensity -- could simulate by staggering pulses over the duration
    }
}
