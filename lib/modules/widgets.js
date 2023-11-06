//@ts-check

//MODULE FOR THE ESKV IMPLEMENTATION OF STANDARD KIVY CLASSES
//Currently contains
//WidgetAnimation -- implementation of Kivy's Animation -- TODO: Move to own module
//Widget -- Widget replicates functionality of Kivy Widget, Floatlayout and RelativeLayout in one class
//Label
//Button
//GridLayout
//BoxLayout
//ScrollView
//ModalView
//Image (handle loading from file or spritesheet)
//Checkbox -- includes a RadioBox-style for widgets part of a common group
//Slider
//Text Input (use a CSS styled DOM text input at least initially)

//High Priority TODOs
//Splitter
//Defining Label groups to enforce common font sizing (smallest font to fit available space of all widgets)

//Kivy standard widgtes
//UX: Label, Button, CheckBox, Image, Slider, Progress Bar, Text Input, Toggle button, Switch, Video
//Layouts: Anchor Layout, Box Layout, Float Layout, Grid Layout, PageLayout, Relative Layout, Scatter Layout, Stack Layout
//Complex UX: Bubble, Drop-Down List, FileChooser, Popup, Spinner, RecycleView, TabbedPanel, Video player, VKeyboard,
//Behaviors: Scatter, Stencil View
//Screen Manager: Screen Manager

import { sizeText, sizeWrappedText, getTextData, getWrappedTextData, drawText, drawWrappedText } from './text.js';
import { App } from './app.js';
import { Rect, Vec2 } from './geometry.js';
import { colorString, clamp, dist } from './math.js';
import { Touch } from './input.js';

/**
 * @typedef {import('./types').WidgetSizeHints} WidgetSizeHints
 */

/** 
 * @typedef {(event:string, obj:Widget|EventSink, data:any)=>boolean} EventCallback
*/

/** 
 * @typedef {(event:string, obj:Widget|EventSink, data:any)=>boolean|null|undefined|void} EventCallbackNullable
*/


/**@typedef {Object<string, number|[number,(propName:string)=>number]>} AnimationProperties*/

/**@type {WidgetSizeHints} */
export const hintsDefault = { x: 0, y: 0, w: 1, h: 1 };


export class Styling {
    constructor() {
        /**@type {Map<string, Object>} */
        this.styles = new Map();
    }
    /**
     * 
     * @param {string} widgetClass 
     * @param {Object} styleProperties Object containing the default properties to be applied for this class
     * @param {Object} replace If true, removes all current properties and replaces them with `styleProperties`. If false, merges with current properties.
     */
    add(widgetClass, styleProperties, replace=true) {
        let curSP = this.styles.get(widgetClass);
        if(curSP && !replace) {
            for(let p in curSP) {
                curSP[p] = styleProperties[p];
            }
        } else {
            this.styles.set(widgetClass, styleProperties)            
        }
    }
    /**
     * 
     * @param {string} widgetClass 
     */
    remove(widgetClass) {
        return this.styles.delete(widgetClass);
    }
    /**
     * 
     * @param {Widget} widget 
     * @returns 
     */
    applyStyle(widget) {
        let type = widget.constructor.name;
        let styling = this.styles.get(type);
        if(styling) {
            for(let s in styling) {
                widget[s] = styling[s];
            }    
        }
    }
}

export class EventConnection {
    /**
     * 
     * @param {Widget|EventSink|null} listener 
     * @param {string} event 
     * @param {EventCallbackNullable} callback 
     */
    constructor(listener, event, callback) {
        this.listener = listener;
        this.event = event;
        this.callback = callback;
    }
}

/**
 * EventManager handles the connection of event signals between Widgets. Each of N widgets can listen to events
 * from any of the other N-1 widgets with a unique callback for each of K events, implying a potentially
 * huge map of (N*(N-1)*K) events, which would kill performance. In practice, most apps use only a 
 * few dozen cross-widget event listeners so the performance impact is negligible.
 * It basically does two things:
 * 1. Maintains the map of callbacks
 * 2. Manages the removal of 
 */
export class EventManager {
    constructor() {
        /**@type {Map<Widget|EventSink, Set<EventConnection>>} */
        this.connections = new Map();
    }
    /**
     * 
     * @param {Widget|EventSink|null} listener 
     * @param {Widget|EventSink} emitter 
     * @param {string} event 
     * @param {EventCallbackNullable} callback 
     */
    bind(listener, emitter, event, callback) {
        let conn = new EventConnection(listener, event, callback);
        let conns = this.connections.get(emitter);
        if(conns) conns.add(conn);
        else this.connections.set(emitter, new Set([conn]));
    }
    /**
     * 
     * @param {Widget|EventSink} emitter 
     * @param {string} event 
     * @param {*} data 
     */
    emit(emitter, event, data) {
        const conns = this.connections.get(emitter);
        if(!conns) return false;
        for(let conn of conns) {
            if(conn.event===event && conn.callback(event, emitter, data)) return true;
        }
        return false;
    }
    /**
     * Remove all connections associated with this widget
     * @param {*} widget 
     */
    disconnect(widget) {
        this.connections.delete(widget);
        for(let emitter of this.connections.keys()) {
            /**@type {EventConnection[]} */
            const deleteList = [];
            const conns = this.connections.get(emitter);
            if(!conns) continue;
            for(let conn of conns) {
                if(conn.listener===widget) deleteList.push(conn);
            }
            deleteList.forEach(conn=>conns.delete(conn));
        }
    }
}


export class WidgetAnimation {
    /**@type {Array<[AnimationProperties, number]>} The sequentially applied stack of animation effects (each effect can comprise multiple animations)*/
    stack = [];
    /**@type {Widget|null} */
    widget = null;
    /**@type {AnimationProperties} */
    props = {}
    /**@type {number} */
    elapsed = 0;
    /**
     * Add animation effect to the stack of effects (the stack is animated sequentially). Multiple properties can be
     * altered with each effect.
     * @param {AnimationProperties} props Widget properties affected and corresponding transformation of this effect 
     * @param {number} duration Duration of effect in milliseconds
     */
    add(props, duration = 1000) {
        this.stack.push([props, duration]);
    }
    /**
     * Update the animation. Completed animations are poped off the stack.
     * @param {number} millis Time in millisecond that have elapsed since last update
     */
    update(app, millis) { //todo: props can be of the form {prop1: 1, prop2: 2, ...} or {prop1: [1,func1], prop2: [2,func2]}
        //TODO: For some reason, something gets stuck after resize leaving widgets in incorrect final positions
        if (this.widget === null) return;
        let targetProps = this.stack[0][0];
        let duration = this.stack[0][1];
        if (this.elapsed == 0) {
            this.initProps = {};
            for (let p in targetProps) {
                this.initProps[p] = this.widget[p]; //TODO: If the window gets resized these will be out of date
            }
        }
        let skip = this.elapsed + millis - duration;
        this.elapsed = skip < 0 ? this.elapsed + millis : duration;
        let wgt = duration == 0 ? 1 : this.elapsed / duration;
        if (skip < 0) {
            for (let p in this.initProps) {
                let x = targetProps[p];
                if (typeof x === 'number') {
                    this.widget[p] = (1 - wgt) * this.initProps[p] + wgt * x;
                } //TODO: targetProps[p] is callback
            }
        } else {
            for (let p in this.initProps) {
                let x = targetProps[p];
                if (typeof x === 'number') {
                    this.widget[p] = x;
                }//TODO: targetProps[p] is callback
            }
            this.stack = this.stack.slice(1);
            this.elapsed = skip;
            if (this.stack.length == 0) this.cancel();
            else {
                this.initProps = {};
                for (let p in this.stack[0][0]) {
                    this.initProps[p] = this.widget[p];
                }
            }
        }
    }
    /**
     * Start the animation (note that you must add effects, usually before 
     * call start for this to do anything useful)
     * @param {Widget} widget The widget the animation is applied to.
     */
    start(widget) {
        this.widget = widget;
        widget._animation = this;
    }
    /**Cancels the animation by clearing the animation property of the attached
     * widget, which means it will no longer be updated.
     */
    cancel() {
        if (this.widget !== null) {
            this.widget._animation = null;
        }
    }
}

/**
 * EventSink class is basically a property-only version of a Widget that does not
 * display to screen or receive input. Can be used to bind to property changes of other
 * widget and emit changes to this or other widgets
 */
export class EventSink {
    /**
     * Event sink constructor can be initialized with a specified set of properties
     * @param {Object|null} properties 
     * @returns 
     */
    constructor(properties = null) {
        /** @type {Object.<string, Array<EventCallbackNullable>>} */
        this._events = {};
        /** @type {Widget|null} */
        this.parent = null
        if (properties != null) {
            this.updateProperties(properties);
        }
        return new Proxy(this, {
            set(target, name, value, receiver) {
                if (name[0] == '_') return Reflect.set(target, name, value, receiver);
                Reflect.set(target, name, value, receiver);
                if (typeof name === 'string') {
                    Reflect.apply(target['emit'], receiver, [name, value])
                }
                return true;
            },
        });
    }
    /**deferredProperties binds properties to that are defined as a callback that links them to
     * other properties in this object or any other object in the App widget tree. This function
     * is called by the framework and does not need to be called by user code.
     */
    deferredProperties() {
        let app = App.get();
        let properties = this._deferredProps;
        this._deferredProps = null;
        for (let p in properties) {
            if (!p.startsWith('on_') && !p.startsWith('_') && typeof properties[p] == 'function') { //Dynamic property binding
                //TODO: this needs to be deferred again if any of the objs can't be found yet
                let func = properties[p];
                let args, rval;
                [args, rval] = func.toString().split('=>')
                args = args.replace('(', '').replace(')', '').split(',').map(a => a.trim());
                let objs = args.map(a => app.findById(a));
                let obmap = {}
                for (let a of args) {
                    obmap[a] = app.findById(a);
                }
                //Bind to all object properties in the RHS of the function
                const re = /(\w+)\.(\w+)/g;
                for (let pat of rval.matchAll(re)) {
                    let pr, ob;
                    [ob, pr] = pat.slice(1);
                    obmap[ob].bind(pr, (evt, obj, data) => { try { this[p] = func(...objs) } catch (error) { console.log('Dynamic binding error', this, p, error) } });
                }
                //Immediately evaluate the function on the property
                try {
                    this[p] = func(...objs);
                } catch (error) {
                    console.log('Dynamic binding error', this, p, error)
                }
            }
        }
    }
    /**
     * Update at the properties of the EventSink
     * @param {Object} properties Object containing properties to udpate
     */
    updateProperties(properties) {
        for (let p in properties) {
            if (!p.startsWith('on_') && !p.startsWith('_') && typeof properties[p] == 'function') { //Dynamic property binding
                this._deferredProps = properties;
            } else {
                this[p] = properties[p];
            }
        }
    }
    /**
     * Bind a callback to property changes of this EventSink
     * @param {string} event name of property to bind to (the event)
     * @param {EventCallbackNullable} func callback function to trigger when property changes
     * @param {Widget|EventSink|null} listener
     */
    bind(event, func, listener=null) {
        App.get()._eventManager.bind(listener, this, event, func);
    }
    /** 
     * Called internally by the widget to emit property changes on_<event> handlers 
     * @param {string} event name of property to ubbind 
     * @param {any} data data value to send
     */
    emit(event, data) {
        if ('on_' + event in this) {
            if (this['on_' + event](event, this, data)) return true;
        }
        return App.get()._eventManager.emit(this, event, data);
        // if (!(event in this._events)) return false;
        // let listeners = this._events[event];
        // for (let func of listeners)
        //     if (func(event, this, data)) return true;
        // return false;
    }
    /**
     * Iterates recursively through the widget tree and returns all Widgets and EventSink objects
     * @param {boolean} recursive 
     * @param {boolean} inView 
     * @yields {EventSink}
     */
    *iter(recursive = true, inView = true) {
        yield this;
    }
    /**
     * Iterates recursively through the widget tree to find all parents of this EventSink
     * @yields {Widget}
     */
    *iterParents() {
        if (this.parent === null) return;
        yield this.parent;
        if (this.parent != App.get()) yield* this.parent.iterParents();
    }
    /**
     * Find the first widget or event sink in widget tree whose id matches the requested id
     * @param {string} id 
     * @returns {EventSink|null}
     */
    findById(id) {
        for (let w of this.iter(true, false)) {
            if ('id' in w && w.id == id) return w;
        }
        return null; //this.parent!==null;
    }
    /**
     * Iterator to yield widgets in the heirarchy that match a particular
     * property name and value. Use sparingly in larger Apps (probaby OK during
     * setup but bad if called every update).
     * @param {string} property 
     * @param {string|number} value 
     */
    *iterByPropertyValue(property, value) {
        for (let w of this.iter(true, false)) {
            if (property in w && w[property] == value) yield w;
        }
    }
    /**
     * Called by the App during requestAnimationFrame callback to let
     * the widget update its state.
     */
    update(app, millis) {
        if (this._deferredProps !== null) this.deferredProperties();
    }
}

/**
 * @typedef {import('./types').WidgetProperties} WidgetProperties
 */

export class Widget extends Rect {
    /**@type {string|null} Background color of the widget, transparent (i.e., no fill) if null*/
    bgColor = null;
    /**@type {string|null} Color of outline drawn around the widget, no outline if null*/
    outlineColor = null;
    /**@type {WidgetAnimation|null} The animation currently being applied to this widget (null if none being applied)*/
    _animation = null;
    /**@type {boolean} Flag to indicate whether the layout for this widget and its children needs to be udpated*/
    _layoutNotify = false; //By default, we don't notify about layout events because that's a lot of function calls across a big widget collection
    /**@type {WidgetSizeHints} Sizing hints for the widget*/
    hints = {};
    /**
     * Widget provides the base interface for all interactable objects in ESKV
     * Widget constructor can be passed properties to instantiate it
     * @param {WidgetProperties|null} properties Object containing property values to set
     * @returns 
     */
    constructor(properties = null) {
        super();
        /**@type {Widget|null} Parent widget (all active widgets in the App have a parent)*/
        this.parent = null;
        /**@type {boolean} Flag to indicate whether this widget should receive touch input*/
        this._processTouches = false;
        /**@type {WidgetProperties|null} Internal flag to indicate */
        this._deferredProps = null;
        /**@type {Array<Widget>} Array containing the child widgets*/
        this._children = []; //widget has arbitrarily many children
        /**@type {boolean} Flag indicating whether the layout needs to be updated (typically after addition/removal of widgets of parent positioning changes)*/
        this._needsLayout = true;
        if (properties != null) {
            this.updateProperties(properties);
        }
        return new Proxy(this, {
            set(target, name, value, receiver) {
                if (['x', 'y', 'w', 'h', 'children', 'rect'].includes[name] || name[0] == '_') return Reflect.set(target, name, value, receiver);
                Reflect.set(target, name, value, receiver);
                if (typeof name === 'string') {
                    Reflect.apply(target['emit'], receiver, [name, value])
                }
                return true;
            },
        });
    }
    /**@type {Rect|[number,number,number,number]} read/write access to the Rect containing the positional data of the widget*/
    set rect(rect) {
        this[0] = rect[0];
        this[1] = rect[1];
        this[2] = rect[2];
        this[3] = rect[3];
        this._needsLayout = true;
    }
    get rect() {
        return new Rect([this[0], this[1], this[2], this[3]]);
    }
    /**deferredProperties looks for properties that were defined as a callback that defines
     * a relationship linking this property to properties of this or another widget. It then 
     * binds that callback to all of those properties in the App widget tree. This function
     * is called by the framework and does not need to be called by user code.
     */
    deferredProperties() {
        let app = App.get();
        let properties = this._deferredProps;
        this._deferredProps = null;
        for (let p in properties) {
            if (!p.startsWith('on_') && !p.startsWith('_') && typeof properties[p] == 'function') { //Dynamic property binding
                //TODO: this needs to be deferred again if any of the objs can't be found yet
                let func = properties[p];
                let args, rval;
                [args, rval] = func.toString().split('=>')
                args = args.replace('(', '').replace(')', '').split(',').map(a => a.trim());
                let objs = args.map(a => app.findById(a));
                let obmap = {}
                for (let a of args) {
                    obmap[a] = app.findById(a);
                }
                //Bind to all object properties in the RHS of the function
                const re = /(\w+)\.(\w+)/g;
                for (let pat of rval.matchAll(re)) {
                    let pr, ob;
                    [ob, pr] = pat.slice(1);
                    obmap[ob].bind(pr, (evt, obj, data) => { try { this[p] = func(...objs) } catch (error) { console.log('Dynamic binding error', this, p, error) } });
                }
                //Immediately evaluate the function on the property
                try {
                    this[p] = func(...objs);
                } catch (error) {
                    console.log('Dynamic binding error', this, p, error)
                }
            }
        }
    }
    /**
     * Update the properties of the Widget
     * @param {WidgetProperties} properties Object containing properties to udpate
     */
    updateProperties(properties) {
        App.get().styling.applyStyle(this);
        for (let p in properties) {
            if (!p.startsWith('on_') && !p.startsWith('_') && typeof properties[p] == 'function') { //Dynamic property binding
                this._deferredProps = properties;
            } else {
                //TODO: Ignore any property with a leading underscore name
                this[p] = properties[p];
            }
        }
    }
    /**
     * Bind a callback to property changes of this Widget
     * @param {string} event name of property to bind to (the event)
     * @param {EventCallbackNullable} func callback function to trigger when property changes
     * @param {Widget|EventSink|null} listener
     */
    bind(event, func, listener=null) {
        App.get()._eventManager.bind(listener, this, event, func);
    }
    /** 
     * Called internally by the widget to emit property changes on_<event> handlers 
     * @param {string} event name of property to ubbind 
     * @param {any} data data value to send
     */
    emit(event, data) {
        if ('on_' + event in this) {
            if (this['on_' + event](event, this, data)) return true;
        }
        return App.get()._eventManager.emit(this, event, data);
        // if (!(event in this._events)) return false;
        // let listeners = this._events[event];
        // for (let func of listeners)
        //     if (func(event, this, data)) return true;
        // return false;
    }
    /**
    * Iterates over the entire set of descendents from this widget.
    * Use sparingly in larger apps.
    * @param {boolean} recursive iterates recursively through children 
    * @param {boolean} inView excludes widgets that are hidden from view
    * @yields {Widget}
    */
    *iter(recursive = true, inView = true) {
        yield this;
        if (!recursive) return;
        for (let c of this._children) {
            yield* c.iter(...arguments);
        }
    }
    /**
     * Iterates recursively through the widget tree to find all parents of this Widget
     * @yields {Widget}
     */
    *iterParents() {
        if (this.parent === null) return;
        yield this.parent;
        if (this.parent != App.get()) yield* this.parent.iterParents();
    }
    /**
     * Find the first widget in the heirarchy whose id property matches the value id
     * @param {string} id the id to search for
     * @returns {Widget|null}
     */
    findById(id) {
        for (let w of this.iter(true, false)) {
            if ('id' in w && w.id == id) return w;
        }
        return null;
    }
    /**
     * Iterator to yield widgets in the widget tree below this widget that match a particular
     * property name and value. Use sparingly in larger Apps (probaby OK during
     * setup but bad if called every update).
     * @param {string} property Property name to find 
     * @param {string|number} value Value the property must have
     * @yields {Widget}
     */
    *iterByPropertyValue(property, value) {
        for (let w of this.iter(true, false)) {
            if (property in w && w[property] == value) yield w;
        }
    }
    /**
     * Retrieves the full transform for this widget's children
     * from relative to the App. 
     * @param {boolean} [includeSelf=false]
     * @param {Widget|null} widget 
     * @returns {DOMMatrix}
     */
    getTransformRecurse(includeSelf=false, widget=null) {
        let transform = this!==widget && this.parent!==null ? this.parent.getTransformRecurse(true, widget) : new DOMMatrix();
        if(!includeSelf) return transform;
        let newT = this.getTransform();
        if (newT) {
            return transform.multiply(newT);
        } else {
            return transform;
        }
    }
    /**
     * Returns the transform matrix for this widget
     * if it exists, otherwise null. By default this
     * tranform is used by the _draw and on_touch* 
     * methods. A user-defined widget that wants to
     * adapt the context may only need to override
     * getTransform to get their desired behavior.
     * @returns {DOMMatrix|null} 
     */
    getTransform() {
        return null;
    }
    /**
     * Returns a transformed point by applying 
     * the sequence of transforms from ancestor
     * widget `firstWidget`.
     * @param {Vec2} pt 
     * @param {boolean} [recurse=false] 
     * @param {boolean} [includeSelf=false] 
     * @param {boolean} [invert=false] 
     * @param {Widget|null} [firstWidget=null]
     * @returns {Vec2} 
     */
    applyTransform(pt, invert=false, recurse=false, includeSelf=false, firstWidget=null) {
        let tx = recurse? this.getTransformRecurse(includeSelf, firstWidget):this.getTransform();
        if(!tx) return pt;
        if(invert) tx = tx.inverse();
        let dp = tx.transformPoint(new DOMPoint(pt.x, pt.y))
        return new Vec2([dp.x, dp.y]);
    }
    /**
     * Converts position data from App space to widget space
     * (App space is in pixels, widget is in tiles). Primarily
     * used to convert touch/mouse coordinates in pixels
     * to widget space.
     * @param {Array<number>} pos 
     * @returns {Array<number>}
     */
    appToWidget(pos, recurse = true) {
        if(this.parent) {
            let pt = this.parent.getTransformRecurse().inverse().transformPoint(new DOMPoint(pos[0], pos[1]));
            return new Vec2([pt.x, pt.y]);    
        }
        return pos;
    }
    /**
     * Converts position data from App space to the space
     * of this widget's children.
     * (App space is in pixels, child is in tiles). Primarily
     * used to convert touch/mouse coordinates in pixels
     * to widget space.
     * @param {Array<number>} pos 
     * @returns {Array<number>}
     */
    appToChild(pos, recurse = true) {
        let pt = this.getTransformRecurse().inverse().transformPoint(new DOMPoint(pos[0], pos[1]));
        return new Vec2([pt.x, pt.y]);
    }
    /**
     * Converts position data from parent space to child space
     * (Most widgets have the same coordinate system as the parent)
     * Primarily used to convert touch/mouse coordinates in pixels
     * to widget space.
     * @param {Array<number>} pos 
     * @returns {Array<number>}
     */
    toChild(pos) {
        let tx = this.getTransform();
        if (!tx) return pos;
        let pt = tx.inverse().transformPoint(new DOMPoint(pos[0], pos[1]));
        return new Vec2([pt.x, pt.y]);
    }
    /**
     * Adds a child widget to this widget
     * @param {Widget} child The child widget to add
     * @param {number} pos The position in the children list to add the widget at
     */
    addChild(child, pos = -1) {
        if (pos == -1) {
            this._children.push(child);
        } else {
            this._children = [...this._children.slice(0, pos), child, ...this._children.slice(pos)];
        }
        this.emit('child_added', child);
        child.parent = this;
        this._needsLayout = true;
    }
    /**
     * Remove a child widget from this widget
     * @param {Widget} child The child widget to add
     */
    removeChild(child, disconnect=true) {
        this._children = this.children.filter(c => c != child);
        if(disconnect) App.get()._eventManager.disconnect(child);
        this.emit('child_removed', child);
        child.parent = null;
        this._needsLayout = true;
    }
    /**@type {Widget[]} Read/write access to the list of child widgets*/
    get children() {
        return this._children;
    }
    set children(children) {
        for (let c of this._children) {
            this.emit('child_removed', c);
            c.parent = null;
            this._needsLayout = true;
        }
        this._children = [];
        for (let c of children) {
            this.addChild(c);
        }
    }
    /** @type {number} Leftmost position of the widget on the x-axis*/
    set x(val) {
        this._needsLayout = true;
        this[0] = val;
    }
    /** @type {number} Center position of the widget on the x-axis*/
    set center_x(val) {
        this._needsLayout = true;
        this[0] = val - this[2] / 2;
    }
    /** @type {number} Rightmost position of the widget on the y-axis*/
    set right(val) {
        this._needsLayout = true;
        this[0] = val - this[2];
    }
    /** @type {number} Topmost position of the widget on the y-axis*/
    set y(val) {
        this._needsLayout = true;
        this[1] = val;
    }
    /** @type {number} Center position of the widget on the y-axis*/
    set center_y(val) {
        this._needsLayout = true;
        this[1] = val - this[3] / 2;
    }
    /** @type {number} Bottom-most position of the widget on the y-axis*/
    set bottom(val) {
        this._needsLayout = true;
        this[1] = val - this[3];
    }
    /** @type {number} Width of the widget*/
    set w(val) {
        this._needsLayout = true;
        this[2] = val;
    }
    /** @type {number} Height of the widget*/
    set h(val) {
        this._needsLayout = true;
        this[3] = val;
    }
    get x() {
        return this[0];
    }
    get center_x() {
        return this[0] + this[2] / 2;
    }
    get right() {
        return this[0] + this[2];
    }
    get y() {
        return this[1];
    }
    get center_y() {
        return this[1] + this[3] / 2;
    }
    get bottom() {
        return this[1] + this[3];
    }
    get w() {
        return this[2];
    }
    get h() {
        return this[3];
    }
    /**
     * Handler for wheel events activated on the widget. This method will be called recursively on the widget tree
     * and stop if any of the widget instances of on_wheel return false.
     * @param {string} event 
     * @param {Touch} wheel 
     * @returns {boolean} true if event was handled and should stop propagating, false otherwise
     */
    on_wheel(event, object, wheel) {
        for (let i = this._children.length - 1; i >= 0; i--) if (this._children[i].emit(event, wheel)) return true;
        return false;
    }
    /**
     * Handler for touch or mouse down events activated on the widget. This method will be called recursively on the widget tree
     * and stop if any of the widget instances of on_touch_down return false.
     * @param {string} event 
     * @param {Touch} touch
     * @returns {boolean} true if event was handled and should stop propagating, false otherwise
     */
    on_touch_down(event, object, touch) {
        let newT = this.getTransform();
        if (newT) {
            let t = touch.copy();
            let dp = newT.inverse().transformPoint(new DOMPoint(t.pos[0], t.pos[1]));
            t.pos = [dp.x, dp.y]
            for (let i = this._children.length - 1; i >= 0; i--) if (this._children[i].emit(event, t)) return true;
        } else {
            for (let i = this._children.length - 1; i >= 0; i--) if (this._children[i].emit(event, touch)) return true;
        }
        return false;
    }
    /**
     * Handler for touch or mouse up events activated on the widget This method will be called recursively on the widget tree
     * and stop if any of the widget instances of on_touch_up return false. The touches are traversed through children
     * in reverse order to match the intuitiion that the topmost widget should be processed first.
     * @param {string} event 
     * @param {Touch} touch
     * @returns {boolean} true if event was handled and should stop propagating, false otherwise
     */
    on_touch_up(event, object, touch) {
        let newT = this.getTransform();
        if (newT) {
            let t = touch.copy();
            let dp = newT.inverse().transformPoint(new DOMPoint(t.pos[0], t.pos[1]));
            t.pos = [dp.x, dp.y]
            for (let i = this._children.length - 1; i >= 0; i--) if (this._children[i].emit(event, t)) return true;
        } else {
            for (let i = this._children.length - 1; i >= 0; i--) if (this._children[i].emit(event, touch)) return true;
        }
        return false;
    }
    /**
     * Handler for touch or mouse move events activated on the widget This method will be called recursively on the widget tree
     * and stop if any of the widget instances of on_touch_move return false.
     * @param {string} event 
     * @param {Touch} touch
     * @returns {boolean} true if event was handled and should stop propagating, false otherwise
     */
    on_touch_move(event, object, touch) {
        let newT = this.getTransform();
        if (newT) {
            let t = touch.copy();
            let dp = newT.inverse().transformPoint(new DOMPoint(t.pos[0], t.pos[1]));
            t.pos = [dp.x, dp.y]
            for (let i = this._children.length - 1; i >= 0; i--) if (this._children[i].emit(event, t)) return true;
        } else {
            for (let i = this._children.length - 1; i >= 0; i--) if (this._children[i].emit(event, touch)) return true;
        }
        return false;
    }
    /**
     * Handler for touch or mouse cancel events activated on the widget This method will be called recursively on the widget tree
     * and stop if any of the widget instances of on_touch_cancel return false.
     * @param {string} event 
     * @param {Touch} touch
     * @returns {boolean} true if event was handled and should stop propagating, false otherwise
     */
    on_touch_cancel(event, object, touch) {
        let newT = this.getTransform();
        if (newT) {
            let t = touch.copy();
            let dp = newT.inverse().transformPoint(new DOMPoint(t.pos[0], t.pos[1]));
            t.pos = [dp.x, dp.y]
            for (let i = this._children.length - 1; i >= 0; i--) if (this._children[i].emit(event, t)) return true;
        } else {
            for (let i = this._children.length - 1; i >= 0; i--) if (this._children[i].emit(event, touch)) return true;
        }
        return false;
    }
    /**
     * Handler for back button (DO NOT USE, DOES NOT WORK) This method will be called recursively on the widget tree
     * and stop if any of the widget instances of on_wheel return false.
     * @param {string} event 
     * @param {*} history
     * @returns {boolean} true if event was handled and should stop propagating, false otherwise
     */
    on_back_button(event, object, history) {
        // for(let c of this.children) if(c.emit(event, touch)) return true;
        return false;
    }
    /**
     * Returns sizing information for a widget positional property based on hint rules
     * @param {Widget} widget 
     * @param {string} target 
     * @param {string|number} rule 
     * @param {number|null} parentWidth 
     * @param {number|null} parentHeight 
     * @returns {number}
     */
    getMetric(widget, target, rule, parentWidth = null, parentHeight = null) {
        //TODO: If these result in elements scaled too big/small for the layout they can cause 
        //some infinite loops in the layout logic for some widgets
        let app = App.get();
        if (rule === null) {
            return widget[target];
        }
        let value = 0;
        let ruleType = 'proportion';
        let base = 'relative';
        parentWidth = parentWidth ?? this.w;
        parentHeight = parentHeight ?? this.h;
        while (true) {
            if (rule.constructor == String) {
                let r2 = rule.slice(-2);
                if (r2 == 'ww') {
                    value = (+rule.slice(0, -2)) * widget.w;
                    break;
                }
                if (r2 == 'wh') {
                    value = (+rule.slice(0, -2)) * widget.h;
                    break;
                }
                if (r2 == 'aw') {
                    value = (+rule.slice(0, -2)) * app.dimW;
                    base = 'absolute';
                    break;
                }
                if (r2 == 'ah') {
                    value = (+rule.slice(0, -2)) * app.dimH;
                    base = 'absolute';
                    break;
                }
                let r1 = rule.slice(-1);
                if (r1 == 'w') {
                    value = (+rule.slice(0, -2)) * parentWidth;
                    break;
                }
                if (r1 == 'h') {
                    value = (+rule.slice(0, -2)) * parentHeight;
                    break;
                }
                ruleType = 'numeric';
                value = (+rule);
                break;
            }
            ruleType = 'numeric';
            if (target == 'w' || target == 'x' || target == 'center_x' || target == 'right') {
                value = +rule;
                break;
            }
            value = +rule;
            break;
        }
        if (base == 'relative'/*&& ruleType=='proportion'*/) {
            if (['x', 'center_x', 'right'].includes(target)) value += this.x; //position is relative to parent widget unless it references App dimensions
            if (['y', 'center_y', 'bottom'].includes(target)) value += this.y;
        }
        return value;
    }
    /**
     * Set the sizing information for a positional property of `widget` for property referenced in `target` based 
     * on hint `rule`.
     * @param {Widget} widget 
     * @param {string} target 
     * @param {string|number|null} rule 
     * @param {number|null} parentWidth 
     * @param {number|null} parentHeight 
     */
    applyHintMetric(widget, target, rule, parentWidth = null, parentHeight = null) {
        let app = App.get();
        if (rule === null) {
            return;
        }
        let value = 0;
        let ruleType = 'proportion';
        let base = 'relative';
        parentWidth = parentWidth ?? this.w;
        parentHeight = parentHeight ?? this.h;
        while (true) {
            if (rule.constructor == String) {
                let r2 = rule.slice(-2);
                if (r2 == 'ww') {
                    value = (+rule.slice(0, -2)) * widget.w;
                    break;
                }
                if (r2 == 'wh') {
                    value = (+rule.slice(0, -2)) * widget.h;
                    break;
                }
                if (r2 == 'aw') {
                    value = (+rule.slice(0, -2)) * app.dimW;
                    base = 'absolute';
                    break;
                }
                if (r2 == 'ah') {
                    value = (+rule.slice(0, -2)) * app.dimH;
                    base = 'absolute';
                    break;
                }
                let r1 = rule.slice(-1);
                if (r1 == 'w') {
                    value = (+rule.slice(0, -2)) * parentWidth;
                    break;
                }
                if (r1 == 'h') {
                    value = (+rule.slice(0, -2)) * parentHeight;
                    break;
                }
                ruleType = 'numeric';
                value = (+rule);
                break;
            }
            ruleType = 'proportion';
            if (target == 'w' || target == 'x' || target == 'center_x' || target == 'right') {
                value = (+rule) * parentWidth;
                break;
            }
            value = (+rule) * parentHeight;
            break;
        }
        if (base == 'relative'/*&& ruleType=='proportion'*/) {
            if (['x', 'center_x', 'right'].includes(target)) value += this.x; //position is relative to parent widget unless it references App dimensions
            if (['y', 'center_y', 'bottom'].includes(target)) value += this.y;
        }
        widget[target] = value;
    }
    /**
     * Given the geometry of this widget and the App, sets the geometry of child `c` using its `hints` property.
     * Optionally pass `w` and `h` dimensions to be used in place of those properties on the parent widget.
     * @param {Widget} c 
     * @param {number|null} w 
     * @param {number|null} h 
     */
    applyHints(c, w = null, h = null) {
        let hints = c.hints;
        w = w ?? this.w;
        h = h ?? this.h;
        if ('w' in hints && hints['w'] != null && hints['w'].constructor == String && hints['w'].slice(-2) == 'wh') {
            if (hints['h'] !== undefined) this.applyHintMetric(c, 'h', hints['h'], w, h);
            if (hints['w'] !== undefined) this.applyHintMetric(c, 'w', hints['w'], w, h);
        } else {
            if (hints['w'] !== undefined) this.applyHintMetric(c, 'w', hints['w'], w, h);
            if (hints['h'] !== undefined) this.applyHintMetric(c, 'h', hints['h'], w, h);
        }
        for (let ht in hints) {
            if (ht != 'w' && ht != 'h') this.applyHintMetric(c, ht, hints[ht], w, h);
        }
    }
    /**
     * On each frame update, the framework will call layoutChildren on each widget 
     * if the `_needsLayout` flag is set and will recursively reposition all 
     * child widgets based on positioning data of this widget and the hints 
     * information of the child widgets.
     * It may occasionally be useful to call manually but avoid if possible.
     * User-defined layout widgets will define their own layoutChildren method. 
     */
    layoutChildren() { //The default widget has children but does not apply a layout a la kivy FloatLayout
        if (this._layoutNotify) this.emit('layout', null);
        this._needsLayout = false;
        for (let c of this.children) {
            this.applyHints(c);
            c.layoutChildren();
        }
        //TODO: This should also handle layout of self in case the sizing is being set externally(e.g., to lock an aspect ratio)
        //If so, rename to layoutSelfAndChildren or just layout?
    }
    /**
     * Called automatically by the framework during the update loop to draw the widget and its 
     * children. This calls the actual draw method of this widget. The purpose of _draw is to 
     * allow the drawing context to be udpated by some widgets between drawing of the current 
     * widget and it's children. User-defined widgets that need control over child context like 
     * this should override this method with user-defined behavior.
     * @param {App} app Application instance
     * @param {CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D} ctx rendering context
     * @param {number} millis time elapsed in milliseconds since the last update
     */
    _draw(app, ctx, millis) {
        this.draw(app, ctx)
        let transform = this.getTransform();
        if (transform) {
            ctx.save();
            //            transform = transform.inverse();
            ctx.transform(transform.a, transform.b, transform.c, transform.d, transform.e, transform.f);
            for (let c of this.children)
                c._draw(app, ctx, millis);
            ctx.restore();
            return;
        }
        for (let c of this.children)
            c._draw(app, ctx, millis);
    }
    /**
     * Unlike _draw, this method handles the actual drawing of this widget 
     * (the children's _draw and this widget's draw method are called in this widget's _draw method).
     * @param {App} app The application instance
     * @param {CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D} ctx The drawing context (relevant transforms will have been applied)
     */
    draw(app, ctx) {
        //Usually widget should draw itself, then draw children in order
        let r = this.rect;
        ctx.beginPath();
        ctx.rect(r[0], r[1], r[2], r[3]);
        if (this.bgColor != null) {
            ctx.fillStyle = this.bgColor;
            ctx.fill();
        }
        if (this.outlineColor != null) {
            let lw = ctx.lineWidth;
            ctx.lineWidth = 1.0 / app.tileSize; //1 pixel line width
            ctx.strokeStyle = this.outlineColor;
            ctx.stroke();
            ctx.lineWidth = lw;
        }
    }
    /**
     * Update is called recursively on the widget tree starting from the App's udpate method
     * which responds to the DOM window's requestAnimationFrame. Note that drawing should be
     * delegated to the draw method of each widget.
     * @param {App} app the application instance
     * @param {number} millis time elapsed since last update
     */
    update(app, millis) {
        if (this._deferredProps != null) this.deferredProperties();
        if (this._animation != null) {
            this._animation.update(app, millis);
            app.requestFrameUpdate();
        }
        if (this._needsLayout) {
            this.layoutChildren();
            app.requestFrameUpdate();
        }
        for (let c of this.children) c.update(app, millis);
    }
}


/**
 * @typedef {import('./types').LabelProperties} LabelProperties
 */

/**
 * A label is a rectangle of colored text on an optionally colored background. 
 */
export class Label extends Widget {
    /**@type {number|string|null} size of the font in tile units */
    fontSize = null;
    /**@type {string} If label is part of a size group, the fontSize (not the rect) 
     * will be set to the smallest that will fit text to the rect for all Labels
     * in the group. */
    sizeGroup = '';
    /**@type {boolean} If clip is true, the text will be clipped to the bounding rect */
    clip = false;
    /**@type {boolean} If ignoreSizeForGroup is true and this Label is part of a group,
     * this Label's fontSize will not be used to set the fontSize for the group (useful
     * in combination with clip to handle text that can be very long). 
    */
    ignoreSizeForGroup = false;
    /**@type {string} name of the font */
    fontName = 'Monospace';
    /**@type {string} text displayed in the label*/
    text = '';
    /**@type {boolean} true to wrap long lines of text */
    wrap = false;
    /**@type {boolean} wraps at words if true, at character if false */
    wrapAtWord = true;
    /** @type {'left'|'center'|'right'} horizontal alignment, one of 'left','right','center'*/
    align = 'center';
    /** @type {'top'|'middle'|'bottom'} vertical alignment, one of 'top','middle','bottom'*/
    valign = 'middle';
    /** @type {string} text color, any valid HTML5 color string*/
    color = "white";
    /**
     * Constructs a label with optional specified properties. 
     * @param {LabelProperties|null} properties 
     * */
    constructor(properties = null) {
        super(...arguments);
        this._textData = null;
        if (properties !== null) {
            this.updateProperties(properties)
        }
    }
    on_align(e, object, v) {
        this._needsLayout = true;
    }
    on_valign(e, object, v) {
        this._needsLayout = true;
    }
    on_wrap(e, object, v) {
        this._needsLayout = true;
    }
    on_wrapAtWord(e, object, v) {
        this._needsLayout = true;
    }
    on_text(e, object, v) {
        this._needsLayout = true;
    }
    on_fontSize(e, object, v) {
        this._needsLayout = true;
    }
    on_fontName(e, object, v) {
        this._needsLayout = true;
    }
    /**@type {Widget['layoutChildren']} */
    layoutChildren() {
        let app = App.get();
        let ctx = app.ctx;
        if (!ctx) return;
        let fontSize = this.fontSize === null ? null : this.getMetric(this, 'fontSize', this.fontSize);
        if ('h' in this.hints && this.hints['h'] == null) {
            if (fontSize !== null) {
                this[3] = this.wrap ? sizeWrappedText(ctx, this.text, fontSize, this.fontName, this.align == "center", this.rect, this.color, this.wrapAtWord)[1] :
                    sizeText(ctx, this.text, fontSize, this.fontName, this.align == "center", this.rect, this.color)[1];
            }
        }
        fontSize = fontSize === null ? this.h / 2 : fontSize;
        if (this.fontSize === null && this.rect.w !== undefined) {
            let i = 0;
            while (true && i<10) {
                let w, h;
                if (this.wrap) {
                    [w, h] = sizeWrappedText(ctx, this.text, fontSize, this.fontName, this.align == "center", this.rect, this.color, this.wrapAtWord);
                } else {
                    [w, h] = sizeText(ctx, this.text, fontSize, this.fontName, this.align == "center", this.rect, this.color)
                }
                if ((this.h >= h || 'h' in this.hints && this.hints['h'] == null || fontSize < 0.01)
                    && (this.w >= w || 'w' in this.hints && this.hints['w'] == null)) {
                    if ('h' in this.hints && this.hints['h'] == null) this.h = h;
                    if ('w' in this.hints && this.hints['w'] == null) this.w = w;
                    break;
                }
                const err = Math.min(1.1,this.w/w,this.h/h);
                fontSize *= err;
                i++;
            }
            if(fontSize===undefined) fontSize = 0.001*App.get().h;
        }
        if(this.sizeGroup!=='') {
            this._bestFontSize = fontSize;
            this._textData = null;
        } else {
            if (this.wrap) {
                this._textData = getWrappedTextData(ctx, this.text, fontSize, this.fontName, this.align, this.valign, this.rect, this.color, this.wrapAtWord);
            } else {
                this._textData = getTextData(ctx, this.text, fontSize, this.fontName, this.align, this.valign, this.rect, this.color);
            }    
        }
        super.layoutChildren();
    }
    sizeToGroup(ctx) {
        if(this._bestFontSize===undefined) return;
        let fontSize = Infinity;
        for(let lbl of App.get().iterByPropertyValue('sizeGroup', this.sizeGroup)) {
            if(fontSize>lbl._bestFontSize && !lbl.ignoreSizeForGroup) fontSize = lbl._bestFontSize;
        }
        if(fontSize>0) {
            for(let lbl of App.get().iterByPropertyValue('sizeGroup', this.sizeGroup)) {
                const fs = lbl.clip || !lbl.ignoreSizeForGroup ? fontSize : lbl._bestFontSize;
                if (lbl.wrap) {
                    lbl._textData = getWrappedTextData(ctx, lbl.text, fs, lbl.fontName, lbl.align, lbl.valign, lbl.rect, lbl.color, lbl.wrapAtWord);
                } else {
                    lbl._textData = getTextData(ctx, lbl.text, fs, lbl.fontName, lbl.align, lbl.valign, lbl.rect, lbl.color);
                }
            }
        }
    }
    /**@type {Widget['draw']} */
    draw(app, ctx) {
        super.draw(app, ctx);
        if(this.clip) {
            ctx.save();
            const r = this.rect;
            ctx.rect(r.x,r.y,r.w,r.h);
            ctx.clip();
        }
        if(!this._textData && this.sizeGroup!=='') this.sizeToGroup(ctx);
        if(this._textData) {
            if (this.wrap) {
                drawWrappedText(ctx, this._textData, this.color);
            } else {
                drawText(ctx, this._textData, this.color);
            }
        }
        if(this.clip) ctx.restore();
    }
}

/**
 * @typedef {import('./types').ButtonProperties} ButtonProperties
 */

/**
 * Button is a label widget (colored text in a colored rectangle) that can be pressed or clicked, emits a 
 * `'press'` event when the button is released
 */
export class Button extends Label {
    /**@type {string} Color of button (derives from widget)*/
    bgColor = colorString([0.5, 0.5, 0.5]);
    /**@type {string} Color of button when pressed down*/
    selectColor = colorString([0.7, 0.7, 0.8]);
    /**@type {string} Background color of button when disabled*/
    disableColor1 = colorString([0.2, 0.2, 0.2])
    /**@type {string} Text color of button when disabled*/
    disableColor2 = colorString([0.4, 0.4, 0.4])
    /**@type {boolean} */
    disable = false;
    /**
     * Constructs a button with specified properties in `properties`
     * @param {ButtonProperties|null} properties 
     */
    constructor(properties = null) {
        super();
        if (properties !== null) {
            this.updateProperties(properties);
        }
    }
    /**@type {Widget['on_touch_down']} */
    on_touch_down(event, object, touch) {
        if (super.on_touch_down(event, object, touch)) return true;
        if (!this.disable && this.collide(touch.rect)) {
            touch.grab(this);
            this._touching = true;
            return true;
        }
        return false;
    }
    /**@type {Widget['on_touch_up']} */
    on_touch_up(event, object, touch) {
        if (super.on_touch_up(event, object, touch)) return true;
        if (touch.grabbed != this) return false;
        touch.ungrab();
        if (!this.disable && this.collide(touch.rect)) {
            this._touching = false;
            this.emit('press', null);
            return true;
        }
        return false; //super.on_touch_up(event, object, touch);
    }
    /**@type {Widget['on_touch_move']} */
    on_touch_move(event, object, touch) {
        if (super.on_touch_move(event, object, touch)) return true;
        if (touch.grabbed == this && !this.disable) {
            this._touching = this.collide(touch.rect);
        }
        return false; // super.on_touch_move(event, object, touch);
    }
    /**@type {Widget['draw']} */
    draw(app, ctx) {
        let saved = this.bgColor;
        let saved2 = this.color;
        if (this._touching) this.bgColor = this.selectColor;
        if (this.disable) {
            this.bgColor = this.disableColor1;
            this.color = this.disableColor2;
        }
        super.draw(app, ctx);
        this.bgColor = saved;
        this.color = saved2;
    }
}


/**
 * @typedef {import('./types').ToggleButtonProperties} ToggleButtonProperties
 */


/**
 * A ToggleButton is a labeled widget that can be set to a pressed or unpressed state tracked in the `press`
 * property. A ToggledButton becomes can be part of a group if the `group` property is set to a specific 
 * string id and in that configuration only one member of the group to be in a pressed state.
 */
export class ToggleButton extends Label {
    /**@type {string} Color of button (derives from widget)*/
    bgColor = colorString([0.5, 0.5, 0.5]);
    /**@type {string} Color of button when pressed down*/
    pressColor = colorString([0.7, 0.7, 0.7]);
    /**@type {string} Color of button when pressed down*/
    selectColor = colorString([0.7, 0.7, 0.8]);
    /**@type {string} Background color of button when disabled*/
    disableColor1 = colorString([0.2, 0.2, 0.2]);
    /**@type {string} Text color of button when disabled*/
    disableColor2 = colorString([0.4, 0.4, 0.4]);
    /**@type {boolean} */
    disable = false;
    /**@type {boolean} State of the checkbox, true if checked and false if unchecked */
    _press = false;
    /**@type {string|null} If true, the checkbox becomes a radio box where only one option in the group can be active */
    group = null;
    /**@type {boolean} If group is true, activating this button deactivates others  */
    singleSelect = true;
    /**
     * Constructs a new Checkbox with specified propertes in `props` 
     * @param {ToggleButtonProperties|null} [props=null] 
     */
    constructor(props = null) {
        super();
        if (props !== null) {
            this.updateProperties(props);
        }
    }
    /**@type {boolean}*/
    get press() {
      return this._press
    }
    set press(value) {
      this._press = value;
    }
    /**@type {Widget['on_touch_down']} */
    on_touch_down(event, object, touch) {
        if (super.on_touch_down(event, object, touch)) return true;
        if (!this.disable && this.collide(touch.rect)) {
            touch.grab(this);
            this._touching = true;
            return true;
        }
        return false;
    }
    /**@type {Widget['on_touch_up']} */
    on_touch_up(event, object, touch) {
        if (super.on_touch_up(event, object, touch)) return true;
        if (this.parent === null || touch.grabbed != this) return false;
        touch.ungrab();
        if (!this.disable && this.collide(touch.rect)) {
            this._touching = false;
            if (this.group === null || !this.singleSelect) {
                this.press = !this.press;
            } else {
                for (let w of this.parent.iterByPropertyValue('group', this.group)) {
                    if (w != this) w._press = false;
                }    
                this.press = true;
            }
            return true;
        }
        return false;
    }
    /**@type {Widget['on_touch_move']} */
    on_touch_move(event, object, touch) {
        if (super.on_touch_move(event, object, touch)) return true;
        if (touch.grabbed == this && !this.disable) {
            this._touching = this.collide(touch.rect);
            return true;
        }
        return false;
    }
    /**@type {Widget['draw']} */
    draw(app, ctx) {
        let saved = this.bgColor;
        let saved2 = this.color;
        if (this.press) this.bgColor = this.pressColor;
        if (this._touching) this.bgColor = this.selectColor;
        if (this.disable) {
            this.bgColor = this.disableColor1;
            this.color = this.disableColor2;
        }
        super.draw(app, ctx);
        this.bgColor = saved;
        this.color = saved2;
    }
}


/**
 * @typedef {import('./types').CheckBoxProperties} CheckBoxProperties
 */

/**
 * A CheckBox is a square button that can be in a checked or unchecked state tracked in the `check`
 * property. A CheckBox becomes a circle shaped "radio box" if the `group` property is set to a specific 
 * string id and in that configuration allows only one member of the group to be in a checked state.
 */
export class CheckBox extends Widget {
    /**@type {string} Color of checkbox when pressed down*/
    selectColor = colorString([0.7, 0.7, 0.8]);
    /**@type {string} Color of checkbox check when checked*/
    color = colorString([0.6, 0.6, 0.6])
    /**@type {string} Color of checkbox outline when pressed down*/
    bgColor = colorString([0.5, 0.5, 0.5]);
    /**@type {string} Color of checkbox outline when pressed down*/
    disableColor1 = colorString([0.2, 0.2, 0.2])
    /**@type {string} Color of checkbox check when disabled*/
    disableColor2 = colorString([0.3, 0.3, 0.3])
    /**@type {boolean} Checkbox is disabled if true and cannot be interacted with*/
    disable = false;
    /**@type {boolean} State of the checkbox, true if checked and false if unchecked */
    check = false;
    /**@type {string|null} If part of a group, the checkbox becomes a radio box where only one option in the group can be active */
    group = null;
    /**
     * Constructs a new Checkbox with specified propertes in `props` 
     * @param {CheckBoxProperties|null} [props=null] 
     */
    constructor(props = null) {
        super();
        if (props !== null) {
            this.updateProperties(props);
        }
    }
    /**@type {Widget['on_touch_down']} */
    on_touch_down(event, object, touch) {
        if (super.on_touch_down(event, object, touch)) return true;
        if (!this.disable && this.collide(touch.rect)) {
            touch.grab(this);
            this._touching = true;
            return true;
        }
        return false;
    }
    /**@type {Widget['on_touch_up']} */
    on_touch_up(event, object, touch) {
        if (super.on_touch_up(event, object, touch)) return true;
        if (this.parent === null || touch.grabbed != this) return false;
        touch.ungrab();
        if (!this.disable && this.collide(touch.rect)) {
            this._touching = false;
            if (this.group == null) {
                this.check = !this.check;
            } else {
                for (let w of this.parent.iterByPropertyValue('group', this.group)) {
                    if (w != this) w.check = false;
                }
                this.check = true;
            }
            return true;
        }
        return false;
    }
    /**@type {Widget['on_touch_move']} */
    on_touch_move(event, object, touch) {
        if (super.on_touch_move(event, object, touch)) return true;
        if (touch.grabbed == this && !this.disable) {
            this._touching = this.collide(touch.rect);
            return true;
        }
        return false;
    }
    /**@type {Widget['draw']} */
    draw(app, ctx) {
        if (this.group != null) {
            let r = this.rect;
            r.w = r.h = 0.5 * Math.min(r.w, r.h);
            r.x = this.x + (this.w - r.w) / 2;
            r.y = this.y + (this.h - r.h) / 2;

            let ts = App.get().tileSize;
            let ctx = App.get().ctx;
            if (!ctx) return;
            ctx.strokeStyle = this.disable ? this.disableColor1 : this.bgColor;
            ctx.lineWidth = 1 / ts;
            ctx.beginPath()
            ctx.arc(r.center_x, r.center_y, r.w / 2, 0, 2 * Math.PI);
            ctx.stroke();
            if (this._touching || this.disable) {
                ctx.fillStyle = this.disable ? this.disableColor1 : this.selectColor;
                ctx.fill();
            }

            if (this.check) {
                ctx.fillStyle = this.disable ? this.disableColor2 : this.color;
                ctx.beginPath()
                ctx.arc(r.center_x, r.center_y, r.w / 3, 0, 2 * Math.PI);
                ctx.fill();
            }

            return;
        }
        let r = this.rect;
        r.w = r.h = 0.5 * Math.min(r.w, r.h);
        r.x = this.x + (this.w - r.w) / 2;
        r.y = this.y + (this.h - r.h) / 2;

        let ts = app.tileSize;

        ctx.beginPath()
        ctx.strokeStyle = this.bgColor;
        if (this.disable) {
            ctx.strokeStyle = this.disableColor1;
        }
        ctx.lineWidth = 1 / ts;
        ctx.rect(r[0], r[1], r[2], r[3]);
        ctx.stroke();
        if (this._touching) {
            ctx.fillStyle = this.selectColor;
            ctx.fill();
        }

        if (this.check) {
            ctx.strokeStyle = this.color;
            if (this.disable) {
                ctx.strokeStyle = this.disableColor2;
            }
            ctx.beginPath();
            ctx.lineWidth = r.w / 5
            ctx.moveTo(r.x, r.y);
            ctx.lineTo(r.right, r.bottom);
            ctx.moveTo(r.right, r.y);
            ctx.lineTo(r.x, r.bottom);
            ctx.stroke();
        }
    }
}

/**
 * @typedef {import('./types').SliderProperties} SliderProperties
 */

/**
 * A slider widget is a horizontal or verticle groove with a 
 * circular button that can be positioned along the groove. 
 * The `value` property contains the position of the slider in the groove
 * based on the relative distance from the `min`  and `max` properties.
 * If `step` is not null the slider moves in discrete steps
 */
export class Slider extends Widget {
    /**@type {string} Color of the slider button when pressed down*/
    selectColor = colorString([0.7, 0.7, 0.8]);
    /**@type {string} Color of the slider button*/
    color = colorString([0.6, 0.6, 0.6])
    /**@type {string} Color of the groove and slider button outline*/
    bgColor = colorString([0.4, 0.4, 0.4]);
    /**@type {string} Color of the groove and slider button outline when disabled*/
    disableColor1 = colorString([0.2, 0.2, 0.2])
    /**@type {string} Color of the slider button when disabled*/
    disableColor2 = colorString([0.3, 0.3, 0.3])
    /**@type {boolean} Slider is greyed out and cannot be interacted with if disabled is true */
    disable = false;
    /**@type {number} Min value of slider */
    min = 0.0;
    /**@type {number|null} Max value of slider, if null there is no upper limit */
    max = 1.0;
    /**@type {number} current max for slider with no upper limit */
    curMax = 1.0;
    /**
     * @type {number} for unbounded slider sets `curMax` equal to this multiple of 
     * the current value after each slider release */
    unboundedStopMultiple = 10;
    /**@type {boolean} if true, the slider operates on an exponential scale */
    exponentialSlider = false;
    /**@type {number|null} Step increment of slider, continuous if null */
    step = null;
    /**@type {'horizontal'|'vertical'} Orientation of the slider */
    orientation = 'horizontal';
    /**@type {number} The position of the slider */
    value = 0.0;
    /**@type {number} Size of the slider button as a fraction of the length of slider */
    sliderSize = 0.2;
    /**
     * Constructs a slider with specified properties in `props`
     * @param {SliderProperties|null} props 
     */
    constructor(props = null) {
        super();
        if (props !== null) {
            this.updateProperties(props);
        }
    }
    /**@type {(touch:Touch)=>void} */
    setValue(touch) {
        let max = this.max??this.curMax;
        let value = 0;
        if (this.orientation == 'horizontal') value = clamp((touch.rect.x - this.x - this.w * this.sliderSize / 2) / (this.w * (1 - this.sliderSize)), 0, 1);
        if (this.orientation == 'vertical') value = clamp((touch.rect.y - this.y - this.h * this.sliderSize / 2) / (this.h * (1 - this.sliderSize)), 0, 1);
        if(this.max === null && this.curMax/this.unboundedStopMultiple>this.min) {
            value = value>0.5?
            max/this.unboundedStopMultiple + (value-0.5)/0.5*(max - max/this.unboundedStopMultiple):
            this.min + value/0.5*(max/this.unboundedStopMultiple-this.min);
        } else {
            value = this.min + (max - this.min) * value;
        }

        if (this.step != null) value = Math.round(value / this.step) * this.step;
        this.value = value;    
    }
    /**@type {Widget['on_touch_down']} */
    on_touch_down(event, object, touch) {
        if (super.on_touch_down(event, object, touch)) return true;
        if (!this.disable && this.collide(touch.rect)) {
            touch.grab(this);
            this._touch = true;
            this.setValue(touch);
            return true;
        }
        return false;
    }
    updateMax() {
        if(this.max===null) this.curMax = this.unboundedStopMultiple*this.value;
    }
    /**@type {Widget['on_touch_up']} */
    on_touch_up(event, object, touch) {
        if (touch.grabbed != this) return (super.on_touch_up(event, object, touch));
        touch.ungrab();
        if (!this.disable && this.collide(touch.rect)) {
            this._touching = false;
            this.setValue(touch);
        }
        this.updateMax();
        return true;
    }
    /**@type {Widget['on_touch_move']} */
    on_touch_move(event, object, touch) {
        if (touch.grabbed!==this) return super.on_touch_move(event, object, touch);
        if (!this.disable) {
            this._touching = this.collide(touch.rect);
            this.setValue(touch);
        }
        return false;
    }
    /**@type {Widget['draw']} */
    draw(app, ctx) {
        let ts = app.tileSize;
        let r = this.rect;
        if (this.orientation == 'horizontal') {
            r.w -= this.sliderSize * this.w;
            r.x += this.sliderSize / 2 * this.w;
            let rad = Math.min(this.sliderSize / 2 * this.w, this.h / 2) / 2
            ctx.strokeStyle = this.disable ? this.disableColor1 : this.bgColor;
            ctx.beginPath();
            ctx.lineWidth = 4 / ts;
            ctx.moveTo(r.x, r.center_y);
            ctx.lineTo(r.right, r.center_y);
            ctx.stroke();

            let max = this.max?? this.curMax;
            let vPos;
            if(this.max === null && this.curMax/this.unboundedStopMultiple>this.min) {
                vPos = this.value>max/this.unboundedStopMultiple?
                (0.5+0.5*(this.value - max/this.unboundedStopMultiple) / (max - max/this.unboundedStopMultiple)) * r.w:
                0.5*(this.value - this.min) / (max/this.unboundedStopMultiple - this.min) * r.w;
            } else {
                vPos = (this.value - this.min) / (max - this.min) * r.w;
            }
            ctx.strokeStyle = this.disable ? this.disableColor2 : this.bgColor;
            ctx.beginPath();
            ctx.arc(r.x + vPos, r.center_y, rad, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.fillStyle = this.color;
            if (this._touching || this.disable) {
                ctx.fillStyle = this.disable ? this.disableColor1 : this.selectColor;
            }
            ctx.fill();
        }
        if (this.orientation == 'vertical') {
            r.h -= this.sliderSize * this.h;
            r.y += this.sliderSize / 2 * this.h;
            let rad = Math.min(this.sliderSize / 2 * this.h, this.w / 2) / 2
            ctx.strokeStyle = this.disable ? this.disableColor1 : this.bgColor;
            ctx.beginPath();
            ctx.lineWidth = 4 / ts;
            ctx.moveTo(r.center_x, r.y);
            ctx.lineTo(r.center_x, r.bottom);
            ctx.stroke();

            let max = this.max?? this.curMax;
            let vPos;
            if(this.max === null && this.curMax/this.unboundedStopMultiple>this.min) {
                vPos = this.value>max/this.unboundedStopMultiple?
                (0.5+0.5*(this.value - max/this.unboundedStopMultiple) / (max - max/this.unboundedStopMultiple)) * r.h:
                0.5*(this.value - this.min) / (max/this.unboundedStopMultiple - this.min) * r.h;
            } else {
                vPos = (this.value - this.min) / (max - this.min) * r.h;
            }
            ctx.strokeStyle = this.disable ? this.disableColor2 : this.bgColor;
            ctx.beginPath();
            ctx.arc(r.center_x, r.y + vPos, rad, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.fillStyle = this.color;
            if (this._touching || this.disable) {
                ctx.fillStyle = this.disable ? this.disableColor1 : this.selectColor;
            }
            ctx.fill();
        }
    }
}


var css = `
.eskvdiv { position:absolute }
.eskvdiv > * { position:absolute }
`

var divhtml = `
<div class="eskvdiv" id="eskvapp">
  <canvas id="eskvcanvas"></canvas>
</div>`

/**
 * @typedef {import('./types').TextInputProperties} TextInputProperties
 */

/**
 * A `TextInput` is a `Label` that when focused is overlaid with an `HTMLInputElement` 
 * to allow the user to enter text. Once focus moves away from the `TextInput` it reverts 
 * to displaying the Label and removes the input from the DOM. The `text` property 
 * contains the text in either state. The TextInput has a `focus` property, which is
 * true when the widget is being actively edited and false otherwise. *This widget 
 * is experimental and prone to break in a sufficiently complex layout.*
 */
export class TextInput extends Label {
    /**@type {HTMLInputElement|HTMLTextAreaElement|null} */
    _activeDOMInput = null;
    /**@type {boolean} true when actively edited and has focus, false otherwise */
    focus = true;
    /**@type {boolean} Text input cannot be interact with when disable is true */
    disable = false;
    /**
     * Called before updating the text value after the focus on the DOM input object is cleared.
     * You can override `inputSanitizer` to change what is populated into the `Label`.
     * @type {undefined|((text:string, textInput:TextInput)=>string)} */
    _inputSanitizer = undefined;
    /**
     * 
     * @param {TextInputProperties|null} properties 
     */
    constructor(properties = null) {
        super(...arguments);
        this._textData = null;
        if (properties !== null) {
            this.updateProperties(properties)
        }
    }
    /**@type {Widget['on_touch_down']} */
    on_touch_down(event, object, touch) {
        if (super.on_touch_down(event, object, touch)) return true;
        if (!this.disable && this.collide(touch.rect)) {
            touch.grab(this);
            this._touching = true;
            return true;
        }
        this.clearDOM();
        return false; // super.on_touch_down(event, object, touch);
    }
    /**@type {Widget['on_touch_up']} */
    on_touch_up(event, object, touch) {
        if (super.on_touch_up(event, object, touch)) return true;
        if (touch.grabbed != this) return false;
        // touch.ungrab();
        if (!this.disable && this.collide(touch.rect)) {
            this._touching = false;
            this.addDOMInput();
            return true;
        }
        this.clearDOM();
        return false; // super.on_touch_up(event, object, touch);
    }
    /**
     * Listener for layout events, which is used by the TextInput to clear Input element from the DOM
     * because changing the window state is assumed to make the input lose focus
     */
    on_layout(event, object, value) {
        this.clearDOM();
    }
    DOMInputRect() {
        let r = this.rect;
        let t = this.getTransformRecurse()/*.inverse()*/;
        let rt = new Rect();
        let dp1 = t.transformPoint(new DOMPoint(r.x, r.y));
        let dp2 = t.transformPoint(new DOMPoint(r.right, r.bottom));
        [rt.x, rt.y] = [dp1.x, dp1.y];
        [rt.w, rt.h] = [dp2.x, dp2.y];
        rt.w -= rt.x;
        rt.h -= rt.y;
        return rt;
    }
    addDOMInput() {
        if (!this._textData) return;
        let app = App.get();
        let canvasdiv = document.getElementById('eskvapp');
        if (!canvasdiv) return;
        let type = this.wrap ? 'textarea' : 'input';
        let inp = document.createElement(type);
        if (!(inp instanceof HTMLInputElement) && !(inp instanceof HTMLTextAreaElement)) return;
        let fs;

        let rt = this.DOMInputRect();
        let color = this.color != null ? this.color : 'white';
        let bgColor = this.bgColor != null ? this.bgColor : 'black';
        inp.style.color = color;
        fs = (this._textData.size/this.h) * rt.h/this._textData.outText.length //this._textData.size * app.tileSize; 
        if (type == 'textarea') {
            let rows = this._textData.outText.length;
        }
        inp.value = this.text;
        fs = (Math.floor(fs * 100) / 100).toString() + 'px';
        inp.style.fontSize = fs;
        inp.style.backgroundColor = bgColor;
        inp.style.top = (Math.floor(rt.y * 100) / 100).toString() + 'px';
        inp.style.left = (Math.floor(rt.x * 100) / 100).toString() + 'px';
        inp.style.width = (Math.floor(rt.w * 100) / 100).toString() + 'px';
        inp.style.height = (Math.floor(rt.h * 100) / 100).toString() + 'px';
        inp.style.fontFamily = this.fontName;
        this._activeDOMInput = inp;
        canvasdiv.appendChild(inp);
        inp.addEventListener("focusout", (event) => this.clearDOM());
        inp.focus();
        inp.select();
        this.focus = true;
    }
    clearDOM() {
        if (this._activeDOMInput != null) {
            this.text = this._inputSanitizer? this._inputSanitizer(this._activeDOMInput.value, this)
                        :this._activeDOMInput.value;
            let inp = this._activeDOMInput;
            this._activeDOMInput = null;
            inp.remove();
            this.focus = false;
            this._needsLayout = true;
            let iph = App.get().inputHandler;
            if(iph?.grabbed===this) iph.ungrab();
        }
    }
    /**@type {Widget['layoutChildren']} */
    layoutChildren() {
        super.layoutChildren();
        if (this._activeDOMInput != null) {
            let rt = this.DOMInputRect();
            let inp = this._activeDOMInput;
            inp.style.top = (Math.floor(rt.y * 100) / 100).toString() + 'px';
            inp.style.left = (Math.floor(rt.x * 100) / 100).toString() + 'px';
            inp.style.width = (Math.floor(rt.w * 100) / 100).toString() + 'px';
            inp.style.height = (Math.floor(rt.h * 100) / 100).toString() + 'px';
        }
    }
}

/**
 * @typedef {import('./types').ImageWidgetProperties} ImageWidgetProperties
 */

/**
 * ImageWidget displays a HTMLImageElement from an image source such as a PNG of JPEG file.
 * The source image is set in the `src` property. Image display options include `lockAspect`,
 * `scaleToFit`, `antiAlias`, `angle`, `mirror`. You can also set `bgColor` and `outlineColor`
 * for the rect behind the Image. 
 */
export class ImageWidget extends Widget {
    bgColor = null;
    outlineColor = null;
    /**@type {string|null} filename or url of the image to display */
    src = null;
    /**@type {boolean} lock to the aspect ratio of the image if true, stretch/squeeze to fit if false */
    lockAspect = true;
    /**@type {boolean} scales the image to fit the available space*/
    scaleToFit = true;
    /**@type {boolean} apply antialiasing to scaled images if true (usually want this to be false to pixel art*/
    antiAlias = true;
    /**@type {number} angle in degrees to rotate the image*/
    angle = 0;
    /**@type {'center'|[number,number]} Position within the widget for the rotation point */
    anchor = 'center'; //anchor for rotation
    /**@type {boolean} flips the image on the along the y-axis before rotating*/
    mirror = false;
    /**
     * Constructs a new ImageWidget, optionally apply properties in `props`
     * @param {ImageWidgetProperties|null} props 
     */
    constructor(props = null) {
        super();
        this.image = new Image();
        if (props !== null) {
            this.updateProperties(props);
        }
        if (this.src) {
            this.image.src = this.src;
        }
    }
    on_src(event, object, data) {
        if (this.src) {
            this.image.src = this.src;
        } else {
            this.image.src = '';
        }
    }
    /**@type {Widget['layoutChildren']} */
    layoutChildren() {
        if (this._layoutNotify) this.emit('layout', null);
        let app = App.get();
        if ('w' in this.hints && this.hints['w'] == null) this[2] = this.image.width / app.tileSize
        if ('h' in this.hints && this.hints['h'] == null) this[3] = this.image.height / app.tileSize
        this._needsLayout = false;
        super.layoutChildren();
    }
    /**@type {Widget['draw']} */
    draw(app, ctx) {
        super.draw(app, ctx);
        if (!this.image.complete || this.image.naturalHeight == 0) return;
        let mirrorx = 1 - 2 * (this.mirror ? 1 : 0);
        let r = this.rect;
        //TODO: None of this will work quite right in a scroll view
        if (!this.scaleToFit) {
            r.x += r.w / 2 - this.image.width / 2 / app.tileSize;
            r.y += r.h / 2 - this.image.height / 2 / app.tileSize;
            r.w = this.image.width / app.tileSize;
            r.h = this.image.height / app.tileSize;
        }
        if (this.lockAspect) {
            let srcAspect = this.image.height / this.image.width;
            let dstAspect = r.h / r.w;
            let rh = r.h, rw = r.w;
            if (srcAspect < dstAspect) rh = r.w * srcAspect;
            if (srcAspect > dstAspect) rw = r.h / srcAspect;
            r.x += r.w / 2 - rw / 2;
            r.y += r.h / 2 - rh / 2;
            r.w = rw;
            r.h = rh;
        }
        ctx.save();
        ctx.imageSmoothingEnabled = this.antiAlias;
        let anchor = this.anchor;
        if (anchor == 'center') {
            anchor = [r.w / 2, r.h / 2];
        } else {
            anchor = [anchor[0] * r.w, anchor[1] * r.h];
        }
        ctx.translate(r.x + anchor[0],
            r.y + anchor[1]);
        if (this.angle != 0) ctx.rotate(this.angle);
        if (mirrorx) ctx.scale(-1, 1);
        ctx.translate(-anchor[0], -anchor[1]);
        ctx.drawImage(
            this.image,
            0,
            0,
            this.image.width,
            this.image.height,
            0,
            0,
            r.w,
            r.h
        );
        ctx.restore();
    }
}

/**
 * @typedef {import('./types').BoxLayoutProperties} BoxLayoutProperties
 */

/**
 * A BoxLayout is a layout widget that arranges its children either vertically or horizontally
 * controlled by the `orientation` property. Control horizontal and vertical spacing 
 * between widgets using `spacingX` and `spacingY` parameters. Set the amount of padding
 * from the edges of the BoxLayout using `paddingX` and `paddingY` parameters.
 */
export class BoxLayout extends Widget {
    /**@type {string|number} Horizontal spacing between widgets in a horizontal orientation*/
    spacingX = 0;
    /**@type {string|number} Vertical spacing between widgets in a vertical orientation*/
    spacingY = 0;
    /**@type {string|number} Padding at left and right sides of BoxLayout*/
    paddingX = 0;
    /**@type {string|number} Padding at top and bottom sides of BoxLayout*/
    paddingY = 0;
    /**@type {'vertical'|'horizontal'} Direction that child widgets are arranged in the BoxLayout*/
    orientation = 'vertical';
    /**@type {'forward'|'reverse'} Order that child widgets are arranged in the BoxLayout*/
    order = 'forward';
    /**
     * Creates an instance of a BoxLayout with properties optionally specified in `properties`.
     * @param {BoxLayoutProperties|null} properties 
     */
    constructor(properties = null) {
        super();
        if (properties !== null) {
            this.updateProperties(properties);
        }
    }
    *iterChildren() {
        if(this.order==='forward') {
            for(let c of this._children) yield c;
        } else {
            for(let i=this._children.length-1; i>=0; i--) {
                yield this._children[i];
            }
        }

    }
    on_numX(event, object, data) {
        this._needsLayout = true;
    }
    on_numY(event, object, data) {
        this._needsLayout = true;
    }
    on_spacingX(event, object, data) {
        this._needsLayout = true;
    }
    on_spacingY(event, object, data) {
        this._needsLayout = true;
    }
    on_paddingX(event, object, data) {
        this._needsLayout = true;
    }
    on_paddingY(event, object, data) {
        this._needsLayout = true;
    }
    on_orientation(event, object, data) {
        this._needsLayout = true;
    }
    /**@type {Widget['layoutChildren']} */
    layoutChildren() {
        if (this._layoutNotify) this.emit('layout', null);
        this._needsLayout = false;
        let spacingX = this.getMetric(this, 'spacincX', this.spacingX);
        let spacingY = this.getMetric(this, 'spacincY', this.spacingY);
        let paddingX = this.getMetric(this, 'paddingX', this.paddingX);
        let paddingY = this.getMetric(this, 'paddingY', this.paddingY);
        if (this.orientation == 'vertical') {
            let num = this.children.length;
            let h = this.h - spacingY * (num-1) - 2 * paddingY;
            let w = this.w - 2 * paddingX;
            //TODO: There should be a way to infer height of each c from height of c.children if c.hint['h']=null
            //The problem is that we only know size and not position at this point
            //so we'd probably need to split up layoutChildren into sizeChildren then placeChildren routines.
            let fixedh = 0
            for (let c of this.iterChildren()) {
                this.applyHints(c, w, h);
                if ('h' in c.hints) {
                    if (c.hints['h'] == null) c.layoutChildren();
                    fixedh += c.h;
                    num--;
                }
            }
            let ch = (h - fixedh) / num;
            let cw = w;
            let y = this.y + paddingY;
            let x = this.x + paddingX;
            for (let c of this.iterChildren()) {
                c.y = y;
                if (!('x' in c.hints) && !('center_x' in c.hints) && !('right' in c.hints)) c.x = x;
                if (!('w' in c.hints)) c.w = cw;
                if (!('h' in c.hints)) c.h = ch;
                c.layoutChildren();
                y += spacingY + c.h;
            }
            //TODO: should this be a separate property to control? e.g., expandToChildren
            if (num == 0 && 'h' in this.hints && this.hints['h'] == null) { //height determined by children
                this[3] = y + paddingY - this.y;
                // if('center_y' in this.hints) this.center_y=this.hints['center_y']*this.parent.h;
                // if('bottom' in this.hints) this.bottom=this.hints['bottom']*this.parent.h;
            }
            return;
        }
        if (this.orientation == 'horizontal') {
            let num = this.children.length;
            let h = this.h - 2 * paddingY;
            let w = this.w - spacingX * (num-1) - 2 * paddingX;
            let fixedw = 0
            for (let c of this.iterChildren()) {
                this.applyHints(c, w, h);
                if ('w' in c.hints) {
                    if (c.hints['w'] == null) c.layoutChildren();
                    fixedw += c.w;
                    num--;
                }
            }
            let ch = h;
            let cw = (w - fixedw) / num;
            let y = this.y + paddingY;
            let x = this.x + paddingX;
            for (let c of this.iterChildren()) {
                c.x = x;
                if (!('y' in c.hints) && !('center_y' in c.hints) && !('bottom' in c.hints)) c.y = y;
                if (!('w' in c.hints)) c.w = cw;
                if (!('h' in c.hints)) c.h = ch;
                c.layoutChildren();
                x += spacingX + c.w;
            }
            if (num == 0 && 'w' in this.hints && this.hints['w'] == null) { //width determined by children
                this[2] = x + paddingX - this.x;
            }
        }
    }
}

/**
 * @typedef {import('./types').GridLayoutProperties} GridLayoutProperties
 */

/**
 * A GridLayout is a layout widget that arranges its in a grid of either rows of 
 * `numX` children per row for a 'horizontal' `orientation` or colums of `numY` children 
 * for a 'vertical' one. Control horizontal and vertical spacing between widgets using 
 * `spacingX` and `spacingY` parameters. Set the amount of padding from the edges of the 
 * BoxLayout using `paddingX` and `paddingY` parameters.
 */
export class GridLayout extends Widget {
    /**@type {number} Number of widgets per row in a horizontal orientation*/
    numX = 1;
    /**@type {number} Number of widgets per column in a vertical orientation*/
    numY = 1;
    /**@type {string|number} Horizontal spacing between widgets in a horizontal orientation*/
    spacingX = 0;
    /**@type {string|number} Vertical spacing between widgets in a vertical orientation*/
    spacingY = 0;
    /**@type {string|number} Padding at left and right sides of BoxLayout*/
    paddingX = 0;
    /**@type {string|number} Padding at top and bottom sides of BoxLayout*/
    paddingY = 0;
    /**@type {'vertical'|'horizontal'} Direction that child widgets are arranged in the BoxLayout*/
    orientation = 'horizontal';
    //TODO: Need to track column widths and row heights based on max height/width hints in each row/col
    /**
     * Constructs a new GridLayout with optional properties set by `properties`
     * @param {GridLayoutProperties|null} properties 
     */
    constructor(properties = null) {
        super();
        if (properties !== null) {
            this.updateProperties(properties);
        }
    }
    on_numX(event, object, string) {
        this._needsLayout = true;
    }
    on_numY(event, object, string) {
        this._needsLayout = true;
    }
    on_spacingX(event, object, string) {
        this._needsLayout = true;
    }
    on_spacingY(event, object, string) {
        this._needsLayout = true;
    }
    on_paddingX(event, object, string) {
        this._needsLayout = true;
    }
    on_paddingY(event, object, string) {
        this._needsLayout = true;
    }
    on_orientation(event, object, string) {
        this._needsLayout = true;
    }
    /**@type {Widget['layoutChildren']} */
    layoutChildren() {
        if (this._layoutNotify) this.emit('layout', null);
        this._needsLayout = false;
        let spacingX = this.getMetric(this, 'spacincX', this.spacingX);
        let spacingY = this.getMetric(this, 'spacincY', this.spacingY);
        let paddingX = this.getMetric(this, 'paddingX', this.paddingX);
        let paddingY = this.getMetric(this, 'paddingY', this.paddingY);
        if (this.orientation == 'horizontal') {
            let numX = this.numX;
            let numY = Math.ceil(this.children.length / this.numX);
            let h = this.h - spacingY * (numY-1) - 2 * paddingY;
            let w = this.w - spacingX * (numX-1) - 2 * paddingX;

            let _colWidths = new Array(numX).fill(0);
            let _rowHeights = new Array(numY).fill(0);
            let r = 0, c = 0;
            let i = 0;
            for (let ch of this.children) {
                this.applyHints(ch, w, h);
                if ('w' in ch.hints) _colWidths[c] = Math.max(ch.w, _colWidths[c]);
                if ('h' in ch.hints) _rowHeights[r] = Math.max(ch.h, _rowHeights[r]);
                if ((i + 1) % numX == 0) {
                    r++;
                    c = 0;
                } else {
                    c++;
                }
                i++;
            }
            let fixedW = 0, fixedH = 0;
            let nfX = 0, nfY = 0;
            for (let cw of _colWidths) {
                fixedW += cw;
                if (cw > 0) nfX++;
            }
            for (let rh of _rowHeights) {
                fixedH += rh;
                if (rh > 0) nfY++;
            }

            let ch = numY > nfY ? (h - fixedH) / (numY - nfY) : 0;
            let cw = numX > nfX ? (w - fixedW) / (numX - nfX) : 0;
            let y = this.y + paddingY;
            let x = this.x + paddingX;
            r = 0, c = 0;
            for (let i = 0; i < this.children.length; i++) {
                let el = this.children[i];
                let cw0 = _colWidths[c] == 0 ? cw : _colWidths[c];
                let ch0 = _rowHeights[r] == 0 ? ch : _rowHeights[r]
                if (!('w' in el.hints)) el.w = cw0;
                if (!('h' in el.hints)) el.h = ch0;
                el.x = x;
                el.y = y;
                el.layoutChildren();
                if ((i + 1) % numX == 0) {
                    x = this.x + paddingX;
                    y += spacingY + ch0;
                    c = 0;
                    r++;
                } else {
                    x += spacingX + cw0;
                    c++;
                }
            }
            return;
        } else {
            let numX = Math.ceil(this.children.length / this.numY);
            let numY = this.numY;
            let h = this.h - spacingY * (numY-1) - 2 * paddingY;
            let w = this.w - spacingX * (numX-1) - 2 * paddingX;

            let _colWidths = new Array(numX).fill(0);
            let _rowHeights = new Array(numY).fill(0);
            let r = 0, c = 0;
            let i = 0;
            for (let ch of this.children) {
                this.applyHints(ch, w, h);
                if ('w' in ch.hints) _colWidths[c] = Math.max(ch.w, _colWidths[c]);
                if ('h' in ch.hints) _rowHeights[r] = Math.max(ch.h, _rowHeights[r]);
                if ((i + 1) % numY == 0) {
                    c++;
                    r = 0;
                } else {
                    r++;
                }
                i++;
            }
            let fixedW = 0, fixedH = 0;
            let nfX = 0, nfY = 0;
            for (let cw of _colWidths) {
                fixedW += cw;
                if (cw > 0) nfX++;
            }
            for (let rh of _rowHeights) {
                fixedH += rh;
                if (rh > 0) nfY++;
            }

            let ch = numY > nfY ? (h - fixedH) / (numY - nfY) : 0;
            let cw = numX > nfX ? (w - fixedW) / (numX - nfX) : 0;
            let y = this.y + paddingY;
            let x = this.x + paddingX;
            r = 0, c = 0;
            for (let i = 0; i < this.children.length; i++) {
                let el = this.children[i];
                let cw0 = _colWidths[c] == 0 ? cw : _colWidths[c];
                let ch0 = _rowHeights[r] == 0 ? ch : _rowHeights[r]
                if (!('w' in el.hints)) el.w = cw0;
                if (!('h' in el.hints)) el.h = ch0;
                el.x = x;
                el.y = y;
                el.layoutChildren();
                if ((i + 1) % numY == 0) {
                    y = this.y + paddingY;
                    x += spacingX + cw0;
                    r = 0;
                    c++;
                } else {
                    y += spacingY + ch0;
                    r++;
                }
            }
        }
    }
}

/**
 * @typedef {import('./types').ScrollViewProperties} ScrollViewProperties
 */

/**
 * A ScrollView is a layout widget that has a client area that can be larger than the bounding rectangle of the 
 * ScrollView and allows the user to scroll and zoom the area via mouse or touch controls.
 */
export class ScrollView extends Widget {
    /**@type {number} current x-axis scrolling position measured from left of client area in client area units */
    _scrollX = 0;
    /**@type {number} current y-axis scrolling position measured from top of client area in client area units */
    _scrollY = 0;
    /**@type {number} desired x-axis scrolling position measured from left of client area in client area units */
    scrollX = 0;
    /**@type {number} desired y-axis scrolling position measured from top of client area in client area units */
    scrollY = 0;
    /**@type {boolean} true if horizontal scrolling allowed */
    scrollW = true;
    /**@type {boolean} true if vertical scrolling allowed */
    scrollH = true;
    /**@type {'left'|'center'|'right'} how to align content horizontally if horizontal scrolling disallowed */
    wAlign = 'center'; //left, center, right
    /**@type {'top'|'middle'|'bottom'} how to align content vertically if vertical scrolling disallowed */
    hAlign = 'top'; //top, middle, bottom
    /**@type {boolean} zooming allowing via user input if true (pinch to zoom) */
    uiZoom = true;
    /**@type {number} zoom ratio (1=no zoom, <1 zoomed out, >1 zoomed in) */
    zoom = 1;
    /**@type {Vec2|null} tracks velocity of kinetic scrolling action */
    vel = null;
    /**@type {number} vel is set to zero on an axis if the absolute velocity falls below this cutoff */
    velCutoff = 1e-5;
    /**@type {number} velocity of kinetic motion, `vel`, declines by this decay ratio every 30ms */
    velDecay = 0.95;
    /**@type {boolean} unbounded vertical scrolling*/
    unboundedH = false;
    /**@type {boolean} unbounded horizontal scrolling*/
    unboundedW = false;
    /**@type {Vec2|null} */
    _zoomCenter = null;
    /**
     * Construcsts a new ScrollView with optional properties in `properties` 
     * @param {null|ScrollViewProperties} [properties=null] 
     */
    constructor(properties = null) {
        super();
        if (properties !== null) {
            this.updateProperties(properties);
        }
        this._processTouches = true;
        this._oldTouch = null;
        this._lastDist = null;
    }
    /**@type {EventCallbackNullable} */
    on_child_added(event, object, child) {
        if (this.children.length == 1) {
            this.scrollX = 0;
            this.scrollY = 0;
            this._needsLayout = true;
            child.bind('rect', (event, obj, data) => this._needsLayout = true);
            child.bind('w', (event, obj, data) => this._needsLayout = true);
            child.bind('h', (event, obj, data) => this._needsLayout = true);
        }
    }
    on_child_removed(event, object, child) {
        if (this.children.length == 0) {
            this.scrollX = 0;
            this.scrollY = 0;
            this._needsLayout = true;
        }
    }
    /**@type {Widget['layoutChildren']} */
    layoutChildren() {
        if (this._layoutNotify) this.emit('layout', null);
        this._needsLayout = false;
        this.children[0][0] = 0;
        this.children[0][1] = 0;
        if (!this.scrollW) this.children[0][2] = this.w;
        if (!this.scrollH) this.children[0][3] = this.h;
        for (let c of this.children) {
            c.layoutChildren();
        }
    }
    fitToClient() {
        this.zoom = Math.min(this.w/this.children[0].w, this.h/this.children[0].h);
        this.scrollX = 0.5*this.scrollableW;
        this.scrollY = 0.5*this.scrollableH;
    }
    on_uiZoom(event, object, value) {
        this._needsLayout = true;
    }
    on_hAlign(event, object, value) {
        this._needsLayout = true;
    }
    on_vAlign(event, object, value) {
        this._needsLayout = true;
    }
    *iter(recursive = true, inView = true) {
        yield this;
        if (!recursive) return;
        if (inView) {
            for (let c of this._children) {
                if (this.contains(c)) yield* c.iter(...arguments);
            }
        } else {
            for (let c of this._children) {
                yield* c.iter(...arguments);
            }
        }
    }
    on_scrollW(event, object, value) {
        this._needsLayout = true;
        this.scrollX = 0;
    }
    on_scrollH(event, object, value) {
        this._needsLayout = true;
        this.scrollY = 0;
    }
    /**@type {EventCallbackNullable} */
    on_scrollX(event, object, value) {
        if (this.children.length == 0) return;
        this._needsLayout = true;
        if(this.unboundedW) {
            this._scrollX = this.scrollX;
            return;
        } 
        let align = 0;
        switch (this.wAlign) {
            case 'center':
                align = 0.5*this.scrollableW; // (this.children[0].w-this.w/this.zoom)/2;
                break
            case 'right':
                align = 1*this.scrollableW; // (this.children[0].w-this.w/this.zoom);
        }
        this._scrollX = this.scrollableW <= 0 || this.scrollableW>=this.children[0].w ? align : value;
        this._scrollX = clamp(value, 0, this.scrollableW); //this.children[0].h-this.h/this.zoom
        }
    on_scrollY(event, object, value) {
        if (this.children.length == 0) return;
        this._needsLayout = true;
        if(this.unboundedH) {
            this._scrollY = this.scrollY;
            return;
        } 
        let align = 0;
        switch (this.hAlign) {
            case 'middle':
                align = 0.5*this.scrollableH; //(this.children[0].h-this.h/this.zoom)/2;
                break
            case 'bottom':
                align = 1*this.scrollableH; //(this.children[0].h-this.h/this.zoom);
        }
        this._scrollY = this.scrollableH <= 0 || this.scrollableH>=this.children[0].h ? align : value;
        this._scrollY = clamp(value, 0, this.scrollableH); //this.children[0].h-this.h/this.zoom
    }
    /**@type {Widget['update']} */
    update(app, millis) {
        super.update(app, millis);
        if (this.vel !== null) {
            this.scrollX += this.vel.x * millis;
            this.scrollY += this.vel.y * millis;
            this.vel = this.vel.scale(this.velDecay ** (millis / 30));
            let a = this.vel.abs();
            if (a.x <= this.velCutoff / this.zoom && 
                a.y <= this.velCutoff / this.zoom) this.vel = null;
        }
    }
    /**@type {Widget['getTransform']} */
    getTransform() {
        let transform = new DOMMatrix()
            .translate(this.x - this._scrollX * this.zoom,
                this.y - this._scrollY * this.zoom)
            .scale(this.zoom, this.zoom);
        return transform;
    }
    /**@type {Widget['on_touch_down']} */
    on_touch_down(event, object, touch) {
        this.vel = null;
        let r = touch.rect;
        this._lastDist = null;
        if (this.collide(r)) {
            let millis = Date.now();
            let tl = touch.asChildTouch(this);
            this._oldTouch = [tl.x, tl.y, tl.identifier, millis, null];
            if (super.on_touch_down(event, object, touch)) return true;
            touch.grab(this);
            return true;
        }
        return false;
    }
    /**@type {Widget['on_touch_up']} */
    on_touch_up(event, object, touch) {
        if(touch.grabbed !== this) {
            // let r = touch.rect;
            // if (this.collide(r)) {
            //     if (super.on_touch_up(event, object, touch)) return true;
            // }
            return false;
        }
        if (this._oldTouch != null) {
            //TODO: This doesn't quite work. Erratic velocity after release
            let ovel = this._oldTouch[4];
            let tl = new Vec2([this._oldTouch[0], this._oldTouch[1]]);
            let tln = touch.asChildTouch(this);
            let millis = Math.max(Date.now() - this._oldTouch[3], 1);
            let vx = (this.scrollableW > 0 || this.unboundedW) ? (tln.x - tl.x) / millis : 0;
            let vy = (this.scrollableH > 0 || this.unboundedH) ? (tln.y - tl.y) / millis : 0;
            this.vel = new Vec2([vx, vy]);
            if(ovel) this.vel = this.vel.add(ovel).scale(0.5);
        }
        this._oldTouch = null;
        this._lastDist = null;
        this._zoomCenter = null;
        // let r = touch.rect;
        // if (this.collide(r)) {
        //     if (super.on_touch_up(event, object, touch)) return true;
        // }
        touch.ungrab();
        return false;
    }
    /**@type {Widget['on_touch_move']} */
    on_touch_move(event, object, touch) {
        if(touch.grabbed !== this) {
            // let r = touch.rect;
            // if (this.collide(r)) {
            //     if (super.on_touch_move(event, object, touch)) return true;
            // }
            return false;
        }
        let r = touch.rect;
        if (this.collide(r)) {
            let tl = touch.asChildTouch(this);
            //Pan
            if (touch.nativeEvent == null || touch.nativeEvent instanceof TouchEvent && touch.nativeEvent.touches.length == 1) { // || touch.nativeEvent.touches.length==2
                //TODO: If two touches, average them together to make less glitchy
                if (this._oldTouch != null && touch.identifier == this._oldTouch[2]) {
                    if (this.scrollW) {
                        this.scrollX = this.scrollableW == 0 ? 0 : (this._scrollX + (this._oldTouch[0] - tl.x));
                    }
                    if (this.scrollH) {
                        this.scrollY = this.scrollableH == 0 ? 0 : (this._scrollY + (this._oldTouch[1] - tl.y));
                    }
                    //Need to recalc positions after moving scroll bars
                    let tln = touch.asChildTouch(this);
                    let ot = this._oldTouch;
                    let time = Date.now()
                    let vel = new Vec2([0, 0]), ovel = new Vec2([0, 0]);
                    if (ot != null) {
                        let millis = Math.max(time - ot[3], 1);
                        let vx = (this.scrollableW > 0 || this.unboundedW) ? (tln.x - tl.x) / millis : 0;
                        let vy = (this.scrollableH > 0 || this.unboundedH) ? (tln.y - tl.y) / millis : 0;
                        vel = new Vec2([vx, vy]);
                        ovel = ot[4] !== null ? ot[4] : ovel;
                    }
                    let nvel = vel.abs().sum()===0? vel: vel.add(ovel).scale(0.5);
                    this._oldTouch = [tln.x, tln.y, touch.identifier, time, nvel];
                }
            }
            //Zoom
            if (this.uiZoom && touch.nativeEvent && touch.nativeEvent instanceof TouchEvent && touch.nativeEvent.touches.length == 2) {
                //TODO: still too touchy trying to zoom and stay locked at corners and sides (partly because of centering when full zoomed out)
                let t0 = touch.nativeEvent.touches[0];
                let t1 = touch.nativeEvent.touches[1];
                let d = dist([t0.clientX, t0.clientY], [t1.clientX, t1.clientY]);
                if (this._lastDist != null) {
                    //TODO: This does not zoom on the correct point
                    let scrollPosCenterW = this._scrollX + this.w / this.zoom / 2;
                    let scrollPosCenterH = this._scrollY + this.h / this.zoom / 2;
                    let touchPixelPos0 = [t0.clientX, t0.clientY];
                    let touchPixelPos1 = [t1.clientX, t1.clientY];
                    let scrollableTouchPosBefore0 = this.appToChild(touchPixelPos0);
                    let scrollableTouchPosBefore1 = this.appToChild(touchPixelPos1);
                    let sTargetCenterPosBefore = [
                        (scrollableTouchPosBefore0[0] + scrollableTouchPosBefore1[0]) / 2, 
                        (scrollableTouchPosBefore0[1] + scrollableTouchPosBefore1[1]) / 2];
                    if(this._zoomCenter===null) this._zoomCenter = new Vec2(sTargetCenterPosBefore);
                    let zoom = this.zoom * d / this._lastDist;
                    let minZoom = Math.min((this.unboundedW?0.01:this.w / this.children[0].w), 
                        (this.unboundedH?0.01: this.h / this.children[0].h));
                    this.zoom = Math.max(zoom, minZoom);

                    // this.scrollX = (scrollPosCenterW + sTargetCenterPosBefore[0] - sTargetCenterPosAfter[0] - this.w / this.zoom / 2) / this.scrollableW;
                    // this.scrollY = (scrollPosCenterH + sTargetCenterPosBefore[1] - sTargetCenterPosAfter[1] - this.h / this.zoom / 2) / this.scrollableH;
                    // this.scrollX = (sTargetCenterPosAfter[0] - this.w / this.zoom / 2) / this.scrollableW;
                    // this.scrollY = (sTargetCenterPosAfter[1] - this.h / this.zoom / 2) / this.scrollableH;


                    // this.scrollX = (this._zoomCenter.x - this.w / this.zoom / 2);
                    // this.scrollY = (this._zoomCenter.y - this.h / this.zoom / 2);
                    let scrollableTouchPosAfter0 = this.appToChild(touchPixelPos0);
                    let scrollableTouchPosAfter1 = this.appToChild(touchPixelPos1);
                    let sTargetCenterPosAfter = [
                        (scrollableTouchPosAfter0[0] + scrollableTouchPosAfter1[0]) / 2, 
                        (scrollableTouchPosAfter0[1] + scrollableTouchPosAfter1[1]) / 2];
                    this.scrollX = (scrollPosCenterW + sTargetCenterPosBefore[0] - sTargetCenterPosAfter[0] - this.w / this.zoom / 2);
                    this.scrollY = (scrollPosCenterH + sTargetCenterPosBefore[1] - sTargetCenterPosAfter[1] - this.h / this.zoom / 2);
                }
                this._lastDist = d;
            }
//            if (super.on_touch_move(event, object, touch)) return true;
        }
        return false;
    }
    /**@type {Widget['on_touch_cancel']} */
    on_touch_cancel(event, object, touch) {
        this._lastDist = null;
        if(touch.grabbed===this) {
            touch.ungrab();
            return true;
        }
        if (super.on_touch_cancel(event, object, touch)) return true;
        return false;
    }
    /**@type {Widget['on_wheel']} */
    on_wheel(event, object, touch) {
        let app = App.get();
        if (!app.inputHandler) return true;
        let sx = this._scrollX + this.w / this.zoom / 2;
        let sy = this._scrollY + this.h / this.zoom / 2;

        let wheel = touch.nativeObject;
        if (!this.collide(touch.rect) && (!this.unboundedW || !this.unboundedH)) return false;
        if (!(wheel instanceof WheelEvent)) return false;
        if (this.uiZoom && app.inputHandler.isKeyDown("Control")) {
            //TODO: This does not center on the location correctly
            let loc = touch.asChildTouch(this);
            let lx = loc.pos[0];
            let ly = loc.pos[1];

            let zoom = this.zoom * Math.exp (-wheel.deltaY / app.h);
            let minZoom = Math.min(
                (this.unboundedW?0.01: this.w / this.children[0].w), 
                (this.unboundedH?0.01: this.h / this.children[0].h)
                );
            this.zoom = Math.max(zoom, minZoom);

            let moc = touch.asChildTouch(this);
            let mx = moc.pos[0];
            let my = moc.pos[1];

            // this.scrollX = (this.scrollableW == 0 && !this.unboundedW) ? 0 : (sx + lx - mx - this.w / this.zoom / 2) / this.scrollableW;
            // this.scrollY = (this.scrollableH == 0 && !this.unboundedH) ? 0 : (sy + ly - my - this.h / this.zoom / 2) / this.scrollableH;
            this.scrollX = (this.scrollableW == 0 && !this.unboundedW) ? 0 : (sx - this.w / this.zoom / 2);
            this.scrollY = (this.scrollableH == 0 && !this.unboundedH) ? 0 : (sy - this.h / this.zoom / 2);
            if (this.scrollX != this._scrollX) this.scrollX = this._scrollX;
            if (this.scrollY != this._scrollY) this.scrollY = this._scrollY;
            return true;
        }
        else if (this.scrollW && app.inputHandler.isKeyDown("Shift")) {
            this.scrollX += (this.scrollableW == 0 && !this.unboundedW) ? 0 : this.w / this.zoom * (wheel.deltaY / app.w);
            if (this.scrollX != this._scrollX) this.scrollX = this._scrollX;
            return true;
        } else if (this.scrollH) {
            this.scrollY += (this.scrollableH == 0 && !this.unboundedH) ? 0 : this.h / this.zoom * (wheel.deltaY / app.h);
            if (this.scrollY != this._scrollY) this.scrollY = this._scrollY;
            return true;
        }
        return false;
    }
    get scrollableW() {
        if (this.children.length == 0) return 0;
        return this.unboundedW? this.children[0].w - this.w / this.zoom : Math.max(this.children[0].w - this.w / this.zoom,0);
    }
    get scrollableH() {
        if (this.children.length == 0) return 0;
        return this.unboundedH? this.children[0].h - this.h / this.zoom : Math.max(this.children[0].h - this.h / this.zoom,0);
    }
    /**@type {Widget['_draw']} */
    _draw(app, ctx, millis) {
        this.draw(app, ctx);
        let r = this.rect;
        ctx.save();
        ctx.beginPath();
        ctx.rect(r[0], r[1], r[2], r[3]);
        ctx.clip();
        let newT = this.getTransform();
        if (newT) ctx.transform(newT.a, newT.b, newT.c, newT.d, newT.e, newT.f);
        this.children[0]._draw(app, ctx, millis);
        ctx.restore();
    }
}


/**
 * @typedef {import('./types').ModalViewProperties} ModalViewProperties
 */

/**
 * A ModalView functions like a popup window that is drawn on top of the baseWidget and
 * any other ModalView objects that are active in the App. The Widget derives from a
 * BoxLayout so children added will be arranged horizontally or vertically depending
 * on the `orientation` property.
 */
export class ModalView extends BoxLayout {
    /**@type {boolean} If true, clicking outside of the modal rect will close it*/
    closeOnTouchOutside = true;
    /**@type {string|null} background color of modal rect*/
    bgColor = 'slate';
    /**@type {string|null} outline color of modal rect*/
    outlineColor = 'gray';
    /**@type {boolean} If true, darken the entire canvas before drawing*/
    dim = true;
    /**@type {number} Amount of canvas dimming applied (0=none => 1=opaque black)*/
    dimScale = 0.8;
    /**
     * Construcsts a new ModalView with optional properties in `properties` 
     * @param {null|ModalViewProperties} [properties=null] 
     */
    constructor(properties = null) {
        super();
        if (properties !== null) {
            this.updateProperties(properties);
        }
    }
    /**
     * Call to programmaticaly open the modal. This adds to the App's current stack of modal widgets. 
     * @returns {boolean} returns true if successfully opened, false if already open
     */
    popup() {
        if (this.parent == null) {
            let app = App.get();
            this.parent = app;
            app.addModal(this);
            return true;
        }
        return false;
    }
    /**
     * Call to close the modal view programmetically
     * @param {number} exitVal 
     * @returns {boolean} returns true if successfully closed, false if already closed
     */
    close(exitVal = 0) {
        if (this.parent != null) {
            this.emit('close', exitVal);
            let app = App.get();
            this.parent = null;
            app.removeModal(this);
            return true;
        }
        return false;
    }
    /**@type {Widget['on_touch_down']} */
    on_touch_down(event, object, touch) {
        if (this.closeOnTouchOutside && !this.collide(touch.rect)) {
            this.close();
            return true;
        }
        return super.on_touch_down(event, object, touch);
    }
    /**@type {Widget['draw']} */
    draw(app, ctx) {
        if (this.dim) {
            let r = App.get().baseWidget.rect;
            let ctx = App.get().ctx;
            if (!ctx) return;
            ctx.fillStyle = "rgba(0,0,0," + this.dimScale + ")"
            ctx.rect(r[0], r[1], r[2], r[3]);
            ctx.fill();
            super.draw(app, ctx);
        }
    }
}
