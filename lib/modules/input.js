import {Rect} from './geometry.js'
import {Widget, App} from './widgets.js'

export class Touch {
    /**@type {number} */
    identifier = -1
    /**@type {import('./geometry').Vec2|number[]} */
    pos = [0,0];
    /**@type {string} */
    state = 'touch_up'; // one of 'touch_up', 'touch_down', 'touch_move', 'touch_cancel'
    /**@type {'touch'|'mouse'|'keyboard'} */
    device = 'touch' //source of touch: touch, mouse or keyboard
    /**@type {globalThis.Touch|MouseEvent|WheelEvent|null} */
    nativeObject = null;
    /**@type {MouseEvent|TouchEvent|null} */
    nativeEvent = null;
    /**
     * @param {Partial<Touch>} [props]
     */
    constructor(props = {}) {
        for(let p in props) {
            /** @type {any} */ (this)[p] = /** @type {any} */ (props)[p];
        }
    }
    copy() {
        return new Touch({pos:[...this.pos], 
            state:this.state, 
            device:this.device, 
            nativeObject:this.nativeObject, 
            nativeEvent:this.nativeEvent, 
            identifier:this.identifier
        });
    }
    /** @type {(widget:Widget)=>Touch} */
    asChildTouch(widget) {
        return new Touch({pos:[...widget.toChild(this.pos)], 
            state:this.state, device:this.device, 
            nativeObject:this.nativeObject, 
            nativeEvent:this.nativeEvent, 
            identifier:this.identifier
        });
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
     * @type {Widget|null} */
    get grabbed() {
        const app = /** @type {App & { inputHandler: InputHandler }} */ (App.get());
        return app.inputHandler.grabbed;
    }
    /**
     * Tells the framework that `widget` will be the exclusive target of all touch operations until ungrab is called
     * @param {Widget} widget 
     * @returns 
     */
    grab(widget) {
        const app = /** @type {App & { inputHandler: InputHandler }} */ (App.get());
        app.inputHandler.grab(widget);
    }
    /**Release the current widget target of all touches. Future touchs will bubble up through the widget tree. */
    ungrab() {
        const app = /** @type {App & { inputHandler: InputHandler }} */ (App.get());
        app.inputHandler.ungrab();
    }
}



export class InputHandler {
    /**@type {Widget|null} */
    grabbed = null;
    /**@type {App} */
    app;
    /**@type {HTMLCanvasElement|null} */
    canvas = null;
    mouseTouchEmulation = true;
    /**@type {MouseEvent|null} */
    mouseev = null;
    /**@type {Record<string, boolean>} */
    keyStates = {};
    /**
     * 
     * @param {App} app 
     */
    constructor(app) {
        this.app = app;
        this.canvas = app.canvas;
        let canvas = /** @type {HTMLCanvasElement} */ (this.canvas);
        // Register touch event handlers
        let that = this;

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
    /**
     * @param {Widget} widget
     */
    grab(widget) {
        this.grabbed = widget;
    }
    ungrab() {
        this.grabbed = null;
    }
    /**
     * @param {string} key
     */
    isKeyUp(key) {
        return (key in this.keyStates) && this.keyStates[key];
    }
    /**
     * @param {string} key
     */
    isKeyDown(key) {
        return (key in this.keyStates) && this.keyStates[key];
    }
    /**
     * 
     * @param {KeyboardEvent} ev 
     * @param {'key_down'|'key_up'} name 
     */
    process_key(ev, name) {
        this.app.requestFrameUpdate();
        const oldKeyState = this.keyStates[ev.key];
        if(name==='key_up') this.keyStates[ev.key] = false;
        else if(name==='key_down') this.keyStates[ev.key] = true;
        //TODO: We emit only to the top level app, since we don't have a focus concept (yet)
        //for it to make sense to emit to specific widgets
        this.app.emit(name, {states:this.keyStates, oldState:oldKeyState, event:ev});
    }
    /**
     * 
     * @param {TouchEvent} ev 
     * @param {'touch_up'|'touch_down'|'touch_move'|'touch_cancel'} name 
     */
    process_touch(ev, name) {
        this.app.requestFrameUpdate();
        if(this.grabbed !== null) {
            for(let to of ev.changedTouches) { 
                let pos = this.grabbed.appToChild([to.clientX, to.clientY]);
                let t = new Touch({pos:pos, state:name, nativeObject:to, nativeEvent:ev, identifier:to.identifier});
                this.grabbed.emit(name, t);
            }
        } else {
            for(let to of ev.changedTouches) { 
                let t = new Touch({pos:this.app.toChild([to.clientX, to.clientY]), state:name, nativeObject:to, nativeEvent:ev, identifier:to.identifier});
                this.app.childEmit(name, t, true);
            }
        }
        ev.preventDefault();
    }
    /**
     * @param {PopStateEvent} ev
     * @param {string} name
     */
    process_back(ev, name) {
        if(location.hash === "#!/backbutton") {
            history.replaceState(null, document.title, location.pathname);
            this.app.childEmit('back_button', ev)
        }
    }
    /**
     * 
     * @param {MouseEvent} ev 
     * @param {'mouse_up'|'mouse_down'|'mouse_move'|'mouse_cancel'} name 
     */
    process_mouse(ev, name) {
        this.app.requestFrameUpdate();
        this.mouseev = ev;
        ev.preventDefault();
        if(this.mouseTouchEmulation) {
            /** @type {Record<'mouse_up'|'mouse_down'|'mouse_move'|'mouse_cancel', 'touch_up'|'touch_down'|'touch_move'|'touch_cancel'>} */
            const mapping = {'mouse_up':'touch_up','mouse_down':'touch_down','mouse_move':'touch_move','mouse_cancel':'touch_cancel'}
            if(ev.buttons!==1 && name!=='mouse_up') return;
            if(this.grabbed !== null) {
                let pos0 = [ev.clientX, ev.clientY];
                let pos = this.grabbed.appToChild(pos0);
                let t = new Touch({pos:pos, state:mapping[name], nativeObject:ev, identifier:-1});
                this.grabbed.emit(mapping[name], t);
            } else {
                let t = new Touch({pos:this.app.toChild([ev.clientX, ev.clientY]), state:mapping[name], nativeObject:ev, identifier:-1});
                this.app.childEmit(mapping[name], t, true);
            }
        } else {
            if(this.grabbed !== null) {
                this.grabbed.emit(name, ev);
            } else {
                this.app.childEmit(name, ev, true);
            }
        }
    }
    /**
     * 
     * @param {WheelEvent} ev 
     * @param {'wheel'} name 
     * @returns {boolean|undefined}
     */
    process_wheel(ev, name) {
        // Use the event's data to call out to the appropriate gesture handlers
        if(this.mouseev==null) return;
        this.app.requestFrameUpdate();
        if(this.grabbed != null) {
            let pos = this.grabbed.appToChild([this.mouseev.clientX, this.mouseev.clientY]);
            let t = new Touch({pos:pos, state:name, nativeObject:ev});
            return this.grabbed.emit(name, t);
        } else {
            let t = new Touch({pos:this.app.toChild([this.mouseev.clientX, this.mouseev.clientY]), state:name, nativeObject:ev});
            this.app.childEmit(name, t, true);
        }
        ev.preventDefault();
    }
    /**
     * @param {number} intensity1
     * @param {number} intensity2
     * @param {number} duration
     */
    vibrate(intensity1, intensity2, duration) {
        window.navigator.vibrate(duration); //default vibration does not support intensity -- could simulate by staggering pulses over the duration
    }
}
