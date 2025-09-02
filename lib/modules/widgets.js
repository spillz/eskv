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
import { Rect, Vec2 } from './geometry.js';
import { colorString, clamp, dist } from './math.js';
import { Touch } from './input.js';
import { instanceClassData } from './markup.js';


/**
 * @typedef {import('./types').WidgetSizeHints} WidgetSizeHints
 */

/** 
 * @typedef {(event:string, obj:Widget|EventSink, data:any, listener:Widget|EventSink|null)=>boolean} EventCallback
*/

/** 
 * @typedef {(event:string, obj:Widget|EventSink, data:any, listener:Widget|EventSink|null)=>boolean|null|undefined|void} EventCallbackNullable
*/


/**@typedef {Object<string, number|[number,(propName:string)=>number]>} AnimationProperties*/

/**@type {WidgetSizeHints} */
export const hintsDefault = { x: 0, y: 0, w: 1, h: 1 };

/**
 * A resource is collection of global accessible data that can be referenced by ESKV widgets
 * Examples are `Image` collections or `SpriteSheet`. They are given unique string keys in a Map
 * property of the ESKV App class.
 */
export class Resource {
    /**
     * 
     * @param {App} app 
     * @param {number} millis 
     */
    update(app, millis) { }
}

/**
 * Rules are preset properties for classes that will be applied when the class
 * is intantiated. Note that Rules are not inherited (e.g., a Button will not
 * have the rules of the Label it inherits from applied). The Rules object
 * contains all registered classes and is added as a static object to the
 * App class.
 */
export class Rules {
    constructor() {
        /**@type {Map<string, Object>} */
        this.rules = new Map();
    }
    /**
     * Adds a rules object for a specified class
     * @param {string} widgetClass 
     * @param {Object} ruleProperties Object containing the default properties to be applied for this class
     * @param {Object} replace If true, removes all current properties (if they exist) and replaces them with `ruleProperties`. If false, merges with current properties.
     */
    add(widgetClass, ruleProperties, replace = true) {
        let curRuleset = this.rules.get(widgetClass);
        if (curRuleset && !replace) {
            for (let p in curRuleset) {
                curRuleset[p] = ruleProperties[p];
            }
        } else {
            this.rules.set(widgetClass, ruleProperties)
        }
    }
    /**
     * Retrieve the rules object for the specified class
     * @param {string} widgetClass 
     * @returns {Object}
     */
    get(widgetClass) {
        return this.rules.get(widgetClass) ?? {};
    }
    /**
     * Remove and return the rules object for the specified class
     * @param {string} widgetClass 
     */
    remove(widgetClass) {
        return this.rules.delete(widgetClass);
    }
}

/**
 * EventConnection tracks the listener object, event name, and callback of a given
 * event binding to an object.
 */
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
 * It essentially does two things:
 * 1. Maintains the map of events, listeners and callbacks
 * 2. Manages the removal of connections that are no longer in use (e.g., the object was removed from the widget hierarchy)
 */
export class EventManager {
    constructor() {
        /**@type {Map<string|Widget|EventSink, Set<EventConnection>>} */
        this.connections = new Map();
    }
    /**
     * 
     * @param {Widget|EventSink} listener 
     * @param {string} emitterEvent the object ID and event to listen for "objectId.eventName" or "eventName" to listen on this object
     * @param {EventCallbackNullable} callback 
     */
    listen(listener, emitterEvent, callback) {
        const [first, second] = emitterEvent.split('.', 2);
        emitterEvent = second ?? first;
        const emitterId = second === undefined ? listener["id"] ?? listener : first;
        let conn = new EventConnection(listener, emitterEvent, callback);
        let conns = this.connections.get(emitterId);
        if (conns) conns.add(conn);
        else this.connections.set(emitterId, new Set([conn]));
    }
    /**
     * 
     * @param {Widget|EventSink} emitter 
     * @param {string} event 
     * @param {*} data 
     */
    emit(emitter, event, data) {
        const conns = this.connections.get(emitter["id"] ?? emitter);
        if (!conns) return false;
        for (let conn of conns) {
            if (conn.event === event && conn.callback(event, emitter, data, conn.listener)) return true;
        }
        return false;
    }
    /**
     * Remove all connections associated with this widget
     * @param {*} widget 
     */
    disconnect(widget) {
        this.connections.delete(widget["id"] ?? widget);
        for (let emitter of this.connections.keys()) {
            /**@type {EventConnection[]} */
            const deleteList = [];
            const conns = this.connections.get(emitter);
            if (!conns) continue;
            for (let conn of conns) {
                if (conn.listener === widget) deleteList.push(conn);
            }
            deleteList.forEach(conn => conns.delete(conn));
        }
    }
}

/**
 * A widget animation is a sequence (`stack`) of dynamically applied property values
 * that can be attached to a `Widget` to update the position and other properties of the `Widget` 
 * on each update call.
 */
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
     * calling start for the animation to do anything useful).
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
            this.widget.emit('animationComplete', this);
        }
    }
}

/**
 * EventSink class is a property-only version of a Widget that does not
 * display to screen or receive input. Can be used to bind to property 
 * changes of other widget and emit changes to this or other widgets.
 */
export class EventSink {
    static _ALLOW_CONSTRUCT = false;
    /**
     * EventSink constructor for internal use only. Use EventSink.a(id, props) to create an instance
     */
    constructor() {
        if (!EventSink._ALLOW_CONSTRUCT) {
            throw new Error(`[ESKV] Do not use 'new ${typeof this}()'. Use '${typeof this}.a(...)' instead.`);
        }
        EventSink._ALLOW_CONSTRUCT = false; // reset immediately
        /** @type {Object.<string, Array<EventCallbackNullable>>} */
        this._events = {};
        /** @type {Widget|null} */
        this.parent = null
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
    /**
     * Acquires a new instance of an EventSink (use in place of constructor)
     *@type {WidgetFactory['a']} 
    **/
    static a(arg1, arg2) {
        EventSink._ALLOW_CONSTRUCT = true;
        const obj = new this(); // now safe
        EventSink._ALLOW_CONSTRUCT = false;

        let id = null, props = {};
        if (typeof arg1 === "string") {
            id = arg1;
            props = arg2 ?? {};
        } else {
            props = arg1 ?? {};
        }

        if (id) obj["id"] = id;
        obj.updateProperties?.(props);
        return /**@type {ReturnType<WidgetFactory['a']>}*/(obj);
    }
    /**deferredProperties binds properties to that are defined as a callback that links them to
     * other properties in this object or any other object in the App widget tree. This function
     * is called by the framework and does not need to be called by user code.
     * @param {App} app 
     */
    deferredProperties(app) {
        let properties = this._deferredProps;
        this._deferredProps = null;
        for (let p in properties) {
            if (!p.startsWith('on_') && !p.startsWith('_') && typeof properties[p] == 'function') { //Dynamic property binding
                //TODO: this needs to be deferred again if any of the objs can't be found yet
                let func = /** @type {Function} */(properties[p]).bind(this);
                let args, rval;
                [args, rval] = (func['text'] ?? func.toString()).split('=>');
                args = args.replace('(', '').replace(')', '').split(',').map(a => a.trim());
                let objs = args.map(a => app.findById(a));
                let obmap = {}
                for (let a of args) {
                    obmap[a] = app.findById(a);
                }
                //Bind to all object properties in the RHS of the function
                const re = /(\w+)\.(\w+)|(\w+)\[['"](\w+)['"]\]/g; //handle properties reference as both obj.prop, obj['prop'], or obj["prop"]
                for (let pat of rval.matchAll(re)) {
                    let pr, ob;
                    [ob, pr] = pat.slice(1);
                    if (ob === 'this') this.listen(pr, (evt, obj, data) => {
                        try { this[p] = func(...objs) }
                        catch (error) { console.log('Dynamic binding error', this, p, error) }
                    })
                    else if (ob in obmap) this.listen(`${ob}.${pr}`, (evt, obj, data) => {
                        try { this[p] = func(...objs) }
                        catch (error) { console.log('Dynamic binding error', this, p, error) }
                    });
                }
                //Immediately evaluate the function on the property
                try {
                    this[p] = func(...objs);
                } catch (error) {
                    console.log('Dynamic binding error', this, p, error);
                }
            }
        }
    }
    /**
     * Update the properties of the EventSink
     * @param {Object} properties Object containing properties to udpate
     * TODO: We could add logic for markup parsing
     */
    updateProperties(properties) {
        for (let p in properties) {
            if (!p.startsWith('on_') && !p.startsWith('_') && typeof properties[p] == 'function' && !('markupMethod' in properties[p])) { //Dynamic property binding
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
     */
    listen(event, func) {
        App.get()._eventManager.listen(this, event, func);
    }
    /** 
     * Called internally by the widget to emit property changes on_<event> handlers 
     * @param {string} event name of property to ubbind 
     * @param {any} data data value to send
     * @param {Widget} listener
     */
    emit(event, data, listener) {
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
        if (this._deferredProps !== null) this.deferredProperties(app);
    }
}

/**
 * @typedef {import('./types').WidgetProperties} WidgetProperties
 */

/**
 * Acquires a new instance of a specific Widget class (use in place of constructor)
 * @type {import('./types').GlobalStaticFactory} 
 **/
export function a(klass, arg1, arg2) {
    Widget._ALLOW_CONSTRUCT = true;
    const obj = new klass();
    Widget._ALLOW_CONSTRUCT = false;

    let id = null, props = {};
    if (typeof arg1 === "string") {
        id = arg1;
        props = arg2 ?? {};
    } else {
        props = arg1 ?? {};
    }
    if (id) obj["id"] = id;
    //Note that instanceClassData gathers any class rules then calls 
    //updateProperties with applyRuleData set to false so that the class props
    //(and markup defined object props) get applied.
    if (obj instanceof Widget) {
        instanceClassData(obj, {}, obj);
    }
    obj.updateProperties?.(props);
    return obj;
}

// /**@typedef {import('./types').WidgetFactory} WidgetFactory */

/**
 * @typedef {{
 *   new (): any; 
 *   a<T extends WidgetFactory, P extends Record<string, any>>( 
 *      this: T, 
 *      arg1: string | (Partial<InstanceType<T>>&P), 
 *      arg2?: Partial<InstanceType<T>>&P | undefined): 
 *      InstanceType<T>& Omit<P, keyof InstanceType<T>>;
 * }} WidgetFactory 
 **/

/**
 * Widget is the basic object type in ESKV
 * @type {WidgetFactory}
 */
export class Widget extends Rect {
    /**@property {string} [id] Optional widget ID */
    /**@type {boolean} */
    static _ALLOW_CONSTRUCT = false;
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
     * Do not call `new Widget()`. Instead call `Widget.a([id], [props])` to instantiate it.
     */
    constructor() {
        super();
        if (!Widget._ALLOW_CONSTRUCT) {
            throw new Error(`[ESKV] Do not use 'new ${typeof this}()'. Use '${typeof this}.a(...)' instead.`);
        }
        Widget._ALLOW_CONSTRUCT = false; // reset immediately

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
        return new Proxy(this, {
            set(target, name, value, receiver) {
                if (typeof name === 'string') {
                    if (['x', 'y', 'w', 'h', 'children', 'rect'].includes(name) || name[0] == '_') return Reflect.set(target, name, value, receiver);
                }
                Reflect.set(target, name, value, receiver);
                if (typeof name === 'string') {
                    Reflect.apply(target['emit'], receiver, [name, value])
                }
                return true;
            },
        });
    }

    /**
     * Acquires a new instance of an Widget (use in place of constructor)
     *@type {WidgetFactory['a']} 
    **/
    static a(arg1, arg2 = undefined) {
        Widget._ALLOW_CONSTRUCT = true;
        const obj = /**@type {ReturnType<WidgetFactory['a']>}*/(new this());
        Widget._ALLOW_CONSTRUCT = false;

        let id = null, props = {};
        if (typeof arg1 === "string") {
            id = arg1;
            props = arg2 ?? {};
        } else {
            props = arg1 ?? {};
        }
        if (id) obj["id"] = id;
        // Note that instanceClassData gathers any class rules then calls 
        // updateProperties so that the class props (and markup defined 
        // object props) get applied.
        if (obj instanceof Widget) {
            instanceClassData(obj, {}, obj);
        }
        obj.updateProperties?.(props);
        return obj;
    }
    /**
     * Sets the widget's ID and returns itself.
     * This ID is used for cross-widget communication and registration in App.objects.
     *
     * @param {string} id - The unique ID to assign to this widget.
     * @returns {this}
     */
    i(id) {
        this["id"] = id;
        return this;
    }
    /**
     * 
     * @param {Partial<this>&{id?:string}} props 
     * @returns {this}
     */
    p(props) {
        this.updateProperties(props)
        return this;
    }
    /**
     * Sets the sizing/layout hints for this widget.
     * Hints control alignment, stretch, min/max sizing, etc.
     *
     * @param {WidgetSizeHints} hints - The hints to apply.
     * @param {'merge'|'replace'} [mode='replace'] - Whether to merge with existing hints or replace them.
     */
    sh(hints, mode = 'replace') {
        if (mode === 'merge') {
            this.hints = Object.assign({}, this.hints ?? {}, hints);
        } else {
            this.hints = hints;
        }
        return this;
    }
    /**
     * Subscribes to a property change on another object and responds with a callback.
     * This widget will react when the bound object's property changes, like an event listener.
     *
     * The callback receives the event name, the source object, the new value, and this widget itself.
     * The dependency source must be defined in `deferredProps` using a string like "someOtherId.prop".
     *
     * Example:
     *   .d("enabled", "controller.running")
     *    .b("enabled", (event, controller, value, self) => self.bgColor = value ? "green" : "red")
     *
     * @template {Widget} T
     * @param {string} property - The name of the property to listen for on the source object.
     * @param {(event: string, object: Widget, value: any, self: T) => any} callback - Function to invoke when the source property changes.
     */
    b(property, callback) {
        if (!this._deferredProps) this._deferredProps = {};
        this._deferredProps[property] = callback;
        return /** @type {this} */ (this);
    }
    /**
     * Adds one or more child widgets to this widget.
     * Accepts a single widget or an array of widgets.
     *
     * @param {Widget|Widget[]} child - The widget(s) to add as children.
     */
    c(child) {
        if (child instanceof Widget) {
            this.addChild(child);
        } else {
            for (const ch of child) this.addChild(ch);
        }
        return this;
    }
    /**
     * Declares a computed property whose value depends on other widgets.
     * The arguments to `computeFn` are widgets, resolved by matching the parameter names
     * to IDs in `App.objects`. The return value is assigned to the given property.
     *
     * Example:
     *   .d("visible", (scoreLabel, gameState) => scoreLabel.value > 0 && gameState.active)
     *
     * @param {string} property - Property on this widget to assign.
     * @param {(...args: Widget[]) => any} computeFn - Function that takes widgets (by ID) and returns computed value.
     */
    d(property, computeFn) {
        if (!this._deferredProps) this._deferredProps = {};
        this._deferredProps[property] = computeFn;
        return this;
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
    deferredProperties(app) {
        let properties = this._deferredProps;
        this._deferredProps = null;
        for (let p in properties) {
            if (!p.startsWith('on_') && !p.startsWith('_') && typeof properties[p] == 'function') { //Dynamic property binding
                //TODO: this needs to be deferred again if any of the objs can't be found yet
                let func = properties[p];
                let args, rval;
                [args, rval] = (func['text'] ?? func.toString()).split('=>');
                args = args.replace('(', '').replace(')', '').split(',').map(a => a.trim());
                let objs = args.map(a => app.findById(a));
                // TODO: Probably this resolution needs to take place in the callback itself
                let obmap = {}
                for (let a of args) {
                    obmap[a] = app.findById(a);
                }
                //Bind to all object properties in the RHS of the function
                const re = /(\w+)\.(\w+)|(\w+)\[['"](\w+)['"]\]/g; //handle properties reference as both obj.prop, obj['prop'], or obj["prop"]
                for (let pat of rval.matchAll(re)) {
                    let pr, ob;
                    [ob, pr] = pat.slice(1);
                    if (ob === 'this') this.listen(pr, (evt, obj, data) => {
                        try { this[p] = func(...objs) }
                        catch (error) { console.log('Dynamic binding error', this, p, error) }
                    })
                    else if (ob in obmap) {
                        try {
                            this.listen(`${ob}.${pr}`, (evt, obj, data) => {
                                try { this[p] = func(...objs) }
                                catch (error) { console.log('Dynamic binding error', this, p, error) }
                            });
                        } catch (error) {
                            console.log(`Warning: ${ob} cannot be bound on`, this, '\nproperty', p, '\nerror', error)
                        }
                    }
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
        for (let p in properties) {
            if (!p.startsWith('on_') && !p.startsWith('_') && typeof properties[p] == 'function' && !('markupMethod' in properties[p])) { //Dynamic property binding
                this._deferredProps = properties;
            } else {
                //TODO: Ignore any property with a leading underscore name?
                this[p] = properties[p];
            }
        }
    }
    /**
     * Bind a callback to property changes of this or another Widget
     * @param {string} emitterEvent name of property or objectId.property to bind to (the event)
     * @param {EventCallbackNullable} func callback function to trigger when property changes
     */
    listen(emitterEvent, func) {
        App.get()._eventManager.listen(this, emitterEvent, func);
        return this;
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
    getTransformRecurse(includeSelf = false, widget = null) {
        let transform = this !== widget && this.parent !== null ? this.parent.getTransformRecurse(true, widget) : new DOMMatrix();
        if (!includeSelf) return transform;
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
    applyTransform(pt, invert = false, recurse = false, includeSelf = false, firstWidget = null) {
        let tx = recurse ? this.getTransformRecurse(includeSelf, firstWidget) : this.getTransform();
        if (!tx) return pt;
        if (invert) tx = tx.inverse();
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
        if (this.parent) {
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
        return this;
    }
    /**
     * @template {new () => any} C
     * @param {C} klass 
     * @param {string|(Partial<InstanceType<C>>&{id?:string})} props_or_id 
     * @param {(Partial<InstanceType<C>>&{id?:string})} props 
     */
    addNew(klass, props_or_id, props) {
        this.addChild(a(klass, props_or_id, props));
        return this;
    }
    /**
     * Remove a child widget from this widget
     * @param {Widget} child The child widget to add
     */
    removeChild(child, disconnect = true) {
        this._children = this.children.filter(c => c != child);
        if (disconnect) App.get()._eventManager.disconnect(child);
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
                    value = (+rule.slice(0, -1)) * parentWidth;
                    break;
                }
                if (r1 == 'h') {
                    value = (+rule.slice(0, -1)) * parentHeight;
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
                    value = (+rule.slice(0, -1)) * parentWidth;
                    break;
                }
                if (r1 == 'h') {
                    value = (+rule.slice(0, -1)) * parentHeight;
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
            ctx.transform(transform.a, transform.b, transform.c, transform.d, transform.e, transform.f);
            for (let c of this._children)
                c._draw(app, ctx, millis);
            ctx.restore();
            return;
        }
        for (let c of this._children)
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
            const origFill = ctx.fillStyle;
            ctx.fillStyle = this.bgColor;
            ctx.fill();
            ctx.fillStyle = origFill;
        }
        if (this.outlineColor != null) {
            let lw = ctx.lineWidth;
            ctx.lineWidth = this.getMetric(this, 'lineWidth', this.hints.lineWidth??`${1.0 / app.tileSize}`); //1 pixel line width by default
            const origStroke = ctx.strokeStyle;
            ctx.strokeStyle = this.outlineColor;
            ctx.stroke();
            ctx.lineWidth = lw;
            ctx.strokeStyle = origStroke;
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
        if (this._deferredProps != null) {
            this.deferredProperties(app);
        }
        if (this._animation != null) {
            this._animation.update(app, millis);
            app.requestFrameUpdate();
        }
        if (this._needsLayout) {
            this.layoutChildren();
            app.requestFrameUpdate();
        }
        for (let c of this._children) c.update(app, millis);
    }
}

import { Timer } from './timer.js';
import { InputHandler } from './input.js';
import { drawRichText, getRichText, sizeRichText } from './richtext.js';

/** @typedef {Object<String, [*, String]>} WidgetClassInfo */

/**
 * App is the main object class for an ESKV application
 * -- a kivy like app that runs in the browser rendering to a cnvas. 
 * Currently it is setup in a singleton model allowing one app
 * per html page that renders in a canvas.
 * The App maintains references to the HTML5 Canvas and drawing Context
 * It manages an update loop in the update method that repeatedly
 * calls requestAnimationFrame to trigger screen refreshes
 * User interaction is handled in the inputHandler instance
 * and it will automatically bubble touch and mouse input events 
 * through the widget heirarchy. Keyboard events are emitted to the
 * app but do not propagate through the widget heirarchy.
 * Every app has a baseWidget and an array of modalWidgets.
 * Global events can be propagated to baseWidget and modalWidgets
 * via the emit method (it will be up to child widgets to
 * emit those events to their own children -- see on_touch_up
 * and on_touch_down implementations).
 * The modalWidgets are drawn over the top of the baseWidget
 * Use App.get() to access the running app instance. The
 * widgets added to the app will also access the running
 * singleton app instance.
 * The App class also tracks several static objects:
 * - appInstance -- the singleton reference to the object (you can 
 *   also retrieve it with App.get())
 * - classes -- an object containing all registered widget classes
 * - rules -- set of styling and other rules that can be applied to
 * each registered Widget class
 */
export class App extends Widget {
    /**
     * Object representing the singleton App instance
     * @type {App|null}
     */
    static appInstance = null;
    /** @type {Rules} */
    static rules = new Rules();
    /** @type {Map<string, Resource>} */
    static resources = new Map();
    /** @type {WidgetClassInfo} */
    static classes = {};
    /**
     * 
     * @param {string} name 
     * @param {Function} cls 
     * @param {string} baseClsName
     */
    static registerClass(name, cls, baseClsName) {
        App.classes[name] = [cls, baseClsName];
    }
    constructor() {
        if (App.appInstance != null) return App.appInstance; //singleton
        Widget._ALLOW_CONSTRUCT = true;
        super();
        Widget._ALLOW_CONSTRUCT = false;
        App.appInstance = this;
        //@ts-ignore
        window.app = this;
        /** @type {EventManager} */
        this._eventManager = new EventManager();
        /** @type {string} */
        this.id = 'app';
        /** @type {null|HTMLCanvasElement} Canvas object used to draw the App on*/
        this.canvas = null
        /** @type {string} DOM id of the canvas to draw the interface on*/
        this.canvasName = "canvas";
        /** @type {null|HTMLCanvasElement} Canvas object used to draw the App on*/
        this.canvas = null
        /** @type {string} DOM id of the canvas to draw the interface on*/
        this.canvasName = "canvas";
        /** @type {number} */
        this.w =  -1; //canvas pixel width
        /** @type {number} */
        this.h =  -1; //canvas pixel height
        /** @type {Widget} The baseWidget object*/
        this._baseWidget = a(Widget, { hints: { x: 0, y: 0, w: 1, h: 1 } });
        this._baseWidget.parent = this;
        /** @type {Array<ModalView>} Container for modal widgets*/
        this._modalWidgets = [];
        this._udpateActive = true;
        /** 
         * @type {number} Size of a (assumed square) pixel in logical units (all 
         * measurements in the engine are in logical units)*/
        this.pixelSize = 1;
        /** 
         * @type {boolean} Flag indicating whether to round tiles to an integer multiple 
         * (useful to pixel art based UIs). Ignored if `exactDimensions` is true.`*/
        this.integerTileSize = false;
        /** 
         * @type  {boolean} Flag indicating that exact tile dimensions in `prefDimW` and 
         * `prefDimH` will be used if true, or rounded to nearest integer if false*/
        this.exactDimensions = false;
        /** 
         * @type {number} Preferred width of canvas in square tiles. If negative will set dimW 
         * using available screen size after setting `dimH`
        */
        this.prefDimW = 32;
        /** 
         * @type {number}  Preferred height of canvas in square tiles. If negative will set dimW 
         * using available screen size after setting `dimW`*/
        this.prefDimH = 16;
        /** @type {number} Actual width of canvas in square tiles*/
        this.dimW = this.prefDimW;
        /** @type {number} Actual height of canvas in square tiles*/
        this.dimH = this.prefDimH;
        /** 
         * @type {number} Contains the tile size (in logical units). Set by the App during setup 
         * maximizes use of available space*/
        this.tileSize = this.getTileScale() * this.pixelSize;
        this.tileSize = this.getTileScale() * this.pixelSize;
        /** @type {number} x-axis offset in pixels from the left edge of the canvas*/
        this.offsetX = 0;
        /** @type {number} y-axis offset in pixels from the top edge of the canvas*/
        this.offsetY = 0;
        /** @type {number} x-axis shake offset in pixels (used for screen shake)*/
        this.shakeX = 0;
        this.shakeX = 0;
        /** @type {number} y-axis shake offset in pixels (used for screen shake)*/
        this.shakeY = 0;
        /** @type {number} current amount of screen shake */
        this.shakeAmount = 0;
        /** @type {number|null} Number representing the current time*/
        this.timer_tick = null;
        /** @type {Array<Timer>} Array of timer objects*/
        this.timers = [];
        /** 
         * @type {boolean} If set to true will request a new animation frame after every 
         * update, if false, waits until something happens 
         * */
        this.continuousFrameUpdates = false;
        /** 
         * @type {boolean} Used internally to track whether a frame update is already
         * pending 
         * */
        this._requestedFrameUpdate = false;
    }
    /**
     * @type {Widget}
     * @readonly
     */
    get baseWidget() {
        return this._baseWidget;
    }
    /**
     * Add a timer with a callback that will be triggered
     * @param {number} duration - time in milliseconds for time
     * @param {(event:string, timer:Timer)=>void} callback - callback to trigger when duration has elapsed 
     * @returns 
     */
    addTimer(duration, callback) {
        let t = new Timer(duration, 0, callback);
        this.timers.push(t);
        return t;
    }
    /**
     * Remove a timer from the list of timers
     * @param {Timer} timer 
     */
    removeTimer(timer) {
        this.timers = this.timers.filter(t => t != timer);
        this.timers = this.timers.filter(t => t != timer);
    }
    /**
     * Adds a ModalView object to the App, which will overlays the main app UI and take control of user interaction.
     * @param {ModalView} modal - the instance of the ModalView object to add
     */
    addModal(modal) {
        this._modalWidgets.push(modal);
        this._needsLayout = true;
    }
    /**
     * Removes a ModalView object, returns control to the prior ModalView in the list or if empty, the main App.
     * @param {ModalView} modal 
     */
    removeModal(modal) {
        this._modalWidgets = this._modalWidgets.filter(m => m != modal);
        this._modalWidgets = this._modalWidgets.filter(m => m != modal);
    }
    /**
     * Static method to retrieve the singleton app instance
     * @returns {App}
     */
    static get() { //singleton
        if  (!App.appInstance) App.appInstance = new App();
        return App.appInstance;
    }
    /**
     * Start the application runnning
     */
    start() {
        let that = this;
        this.setupCanvas();
        this.inputHandler = new InputHandler(this);
        window.onresize = (() => that.updateWindowSize());
        // document.onvisibilitychange = (() => that.requestFrameUpdate());
        this.updateWindowSize();
        // this.update();
        setTimeout(() => this._start(), 1);
        setTimeout(() => this._start(), 1);
    }
    /**
     * Internal function to actually start the main application loop once the main window has been loaded
     */
    _start() {
        this.update();
        this.update();
    }
    /**
     * Reursively propagate an event (such as a touch event through the active widget heirarchy) 
     * until true is returned or there are no more widgets to propagate.
     * @param {string} event name of the event to propagate
     * @param {object} data object data to propagate
     * @param {boolean} topModalOnly send only to the topmost modal widget (used for touch events)
     * @returns {boolean} true if at least one widget processed the event and returned true
     */
    childEmit(event, data, topModalOnly = false) { //TODO: Need to suppress some events for a modal view(e.g., touches)
        if (topModalOnly && this._modalWidgets.length > 0) {
            return this._modalWidgets[this._modalWidgets.length - 1].emit(event, data);
        } else {
            if (this._baseWidget.emit(event, data)) return true;
            for (let mw of this._modalWidgets) {
                if (mw.emit(event, data)) return true;
            }
            return false;
        }
    }
    /**
     * Iterates over the entire widget tree including modal widgets.
     * Use sparingly in larger apps.
     * @param {boolean} recursive iterates recursively through children 
     * @param {boolean} inView excludes widgets that are hidden
     * @yields {Widget}
     */
    *iter(recursive = true, inView = true) {
        yield this;
        yield* this._baseWidget.iter(...arguments);
        for (let mw of this._modalWidgets) {
            yield* mw.iter(...arguments);
        }
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
     * Iterator to yield widgets in the heirarchy that match a particular
     * property name and value. Use sparingly in larger Apps (probaby OK during
     * setup but bad if called every update).
     * @param {string} property Property name to find 
     * @param {string|number} value Value the property must have
     * @yields {Widget}
     */
    *iterByPropertyValue(property, value) {
        for (let w of this.iter(true, false)) {
            if (property in w && w[property] === value) yield w;
        }
    }
    /**
     * Update is called by the DOM window's requestAnimationFrame to update 
     * the state of the widgets in the heirarchy and then draw them.
     */
    update() {
        this._requestedFrameUpdate = false;
        this._udpateActive = true;
        let millis = 15;
        let n_timer_tick = Date.now();
        if (this.timer_tick != null) {
            millis = Math.min(n_timer_tick - this.timer_tick, 30); //maximum of 30 ms refresh
        }
        if (this.timers.length > 0 || this._needsLayout) this.requestFrameUpdate();
        for (let t of this.timers) {
            t.tick(millis);
        }
        if (this._needsLayout) {
            this.layoutChildren();
        }

        for (let res of App.resources.values()) res.update(this, millis);
        this._baseWidget.update(this, millis);
        for (let mw of this._modalWidgets) mw.update(this, millis);

        if (this.ctx) this._draw(this, this.ctx, millis);

        if (this.continuousFrameUpdates) this.requestFrameUpdate();
        this.timer_tick = n_timer_tick;

        this._udpateActive = false;
        if (this._requestedFrameUpdate) {
            this._requestedFrameUpdate = false;
            this.requestFrameUpdate();
        }
    }
    requestFrameUpdate() {
        if (!this._requestedFrameUpdate) {
            if (this._udpateActive) {
                //Wait for end of the update loop if this is being called during an update
                this._requestedFrameUpdate = true;
            } else {
                //Otherwise request now
                this._udpateActive = true;
                window.requestAnimationFrame(() => this.update());
            }
        }
    }
    /**
     * Draw is called during the update loop after all child widgets were updated
     * rendering to screen all widgets in the App in the order they were added to
     * the heirarchy (model widgets are always drawn after widgets in the baseWidget
     * chain).
     * @param {App} app - application instanace 
     * @param {CanvasRenderingContext2D} ctx - drawing context
     * @param {number} millis - time elapsed since last udpate 
     */
    _draw(app, ctx, millis) {
        if (!this.canvas) {
            return
        }
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.shakeX = 0;
        this.shakeY = 0;
        this.screenShake();

        ctx.save();
        let tx = this.getTransform();
        if (tx) ctx.transform(tx.a, tx.b, tx.c, tx.d, tx.e, tx.f);

        this._baseWidget._draw(app, ctx, millis);
        for (let mw of this._modalWidgets) mw._draw(app, ctx, millis);
        ctx.restore();
    }
    // /**
    //  * Returns the matrix that converts from tile units to pixels.
    //  * This functions maybe called as part of a recursive chain from a descendant widget 
    //  * to recover the pixel position of a given position in tile units.
    //  * @param {[number, number]} pos 
    //  * @returns {[number, number]}
    //  */
    getTransform(recurse = true) {
        return new DOMMatrix()
            .translate(this.offsetX + this.shakeX, this.offsetY + this.shakeY)
            .scale(this.tileSize, this.tileSize);
    }
    on_prefDimW(e, o, v) {
        this.updateWindowSize();
    }
    on_prefDimH(e, o, v) {
        this.updateWindowSize();
    }
    on_tileSize(e, o, v) {
        if (this.prefDimH < 0 && this.prefDimW < 0) this.updateWindowSize();
    }
    computeDeviceScale() {
        const dpr = window.devicePixelRatio || 1;
        const screenMin = Math.min(window.innerWidth, window.innerHeight);

        // Physical pixel width (gives sense of actual sharpness)
        const physicalWidth = screenMin * dpr;

        // Assume 1080 is a comfortable base for phone UIs
        const scale = 1080 / physicalWidth;

        // Clamp aggressively to ensure legibility
        return Math.max(1, Math.min(scale, 3));
    }
    /**
     * Resize event handler (updates the canvas size, tileSize, dimW, and dimH properties)
     */
    updateWindowSize() {
        this.x = 0;
        this.y = 0;
        this.w = window.innerWidth;
        this.h = window.innerHeight;
        this.pixelSize = this.computeDeviceScale();
        if (this.prefDimH >= 0 || this.prefDimW >= 0) this.tileSize = this.getTileScale();
        this.fitDimensionsToTileSize(this.tileSize);
        if (this.canvas !== null) {
            this.setupCanvas();
        }
        try {
            screen.orientation.unlock();
        } catch (error) {
        }
        this._needsLayout = true;
        this.requestFrameUpdate();
    }
    /**
     * Returns the tile size in logical units given the screen dimensions and the preferred tile dimensions
     * @returns {number}
     */
    getTileScale() {
        let sh = this.h;
        let sw = this.w;
        let scale = 1 / this.pixelSize;
        if (this.prefDimW < 0 && this.prefDimH < 0) {
            if (this.tileSize > 0) scale = this.tileSize / this.pixelSize;
        } else if (this.prefDimW < 0) {
            scale = sh / (this.prefDimH) / this.pixelSize;
        } else if (this.prefDimH < 0) {
            scale = sw / (this.prefDimW) / this.pixelSize;
        } else {
            scale = Math.min(sh / (this.prefDimH) / this.pixelSize, sw / (this.prefDimW) / this.pixelSize);
        }
        if (this.integerTileSize && scale > 1) scale = Math.floor(scale);
        return scale * this.pixelSize;
    }
    /**
     * Updates dimH and dimW to best fit the window given the tileSize fot the aspect ratio
     * If `exactDimensions` flag is true, then dimH and dimW will always be set to the preferred dimensions
     * potentiall leaving the canvas much smaller than the window size on one of the dimensions and
     * smaller on both dimensions if `integerTileSize` is also true.
     * @param {number} scale; 
     */
    fitDimensionsToTileSize(scale) {
        let sh = this.h;
        let sw = this.w;
        if (this.exactDimensions) {
            if (this.prefDimW < 0 && this.prefDimH < 0) {
                this.dimW = sw / this.tileSize;
                this.dimH = sh / this.tileSize;
            } else if (this.prefDimH < 0) {
                this.dimW = this.prefDimW;
                this.dimH = sh / this.tileSize;
            } else if (this.prefDimW < 0) {
                this.dimW = sw / this.tileSize;
                this.dimH = this.prefDimH;
            } else {
                this.dimH = this.prefDimH;
                this.dimW = this.prefDimW;
            }
            return;
        }
        this.dimH = Math.floor(sh / scale);
        this.dimW = Math.floor(sw / scale);
    }
    /**
     * Initialize the canvas named canvasName in the DOM. Called automatically during construction 
     * and in response to window resize events. Usually should not need to be called 
     * by application programs
     */
    setupCanvas() {
        const canvas = document.getElementById(this.canvasName);
        if (!(canvas instanceof HTMLCanvasElement)) {
            throw ("No canvas element named " + this.canvasName);
        }
        this.canvas = canvas;

        this.canvas.width = this.w; //this.tileSize*(this.dimW);
        this.canvas.height = this.h; //this.tileSize*(this.dimH);
        // this.canvas.style.width = this.canvas.width + 'px';
        // this.canvas.style.height = this.canvas.height + 'px';

        this.ctx = this.canvas.getContext("2d");
        if (!this.ctx) {
            return;
        }
        this.ctx.imageSmoothingEnabled = false;

        this.offsetX = Math.floor((this.w - this.tileSize * this.dimW) / 2);
        this.offsetY = Math.floor((this.h - this.tileSize * this.dimH) / 2);
    }
    /**
     * Given the geometry of the App, sets the geometry of children using their hints property
     * @param {Widget} c 
     */
    applyHints(c) {
        super.applyHints(c, this.dimW, this.dimH);
    }
    /**
     * Can be called during the update loop to implement screen shake
     */
    screenShake() {
        if (this.shakeAmount) {
            this.shakeAmount--;
        }
        let shakeAngle = Math.random() * Math.PI * 2;
        this.shakeX = Math.round(Math.cos(shakeAngle) * this.shakeAmount);
        this.shakeY = Math.round(Math.sin(shakeAngle) * this.shakeAmount);
    }
    /**
     * layoutChildren will recursively reposition all widgets based on positioning
     * data of the parent using the hints information of the child
     * Called during the update loop on widgets whose _needsLayout flag is true
     * Ocassionally useful to call manually but avoid if possible.
     */
    layoutChildren() {
        //Key concept: 
        //As a general rule, each widget (and the app) controls the placement of its child widgets.
        //Whenever the layout properties (x,y,w,h etc) of any widget (or the app itself) have changed, 
        //all layout properites of the children of that widget will be updated at the next update call. 
        //Each widget has an internal _needsLayout boolean that tracks whether the layoutChildren should 
        //be called in that widget's update routine. That flag gets cleared once the layoutChildren of the 
        //child has been called to prevent multiple unecessary calls.

        // The layout in the app will respect hints but otherwise assume the widgets will control their
        // size and positioning
        if (this._layoutNotify) this.emit('layout', null);
        this._needsLayout = false;
        this.applyHints(this._baseWidget);
        this._baseWidget.layoutChildren();
        for (let mw of this._modalWidgets) {
            this.applyHints(mw);
            mw.layoutChildren();
        }
    }
}


/**
 * @typedef {import('./types').LabelProperties} LabelProperties
 */

/**
 * A label is a rectangle of colored text on an optionally colored background. 
 */
export class Label extends Widget {
    /**@type {number|string|null} size of the font in tile units, adapts to fit to the rect if null */
    fontSize = null;
    /**
     * @type {string} If label is part of a size group, the fontSize (not the rect) 
     * will be set to the smallest that will fit text to the rect for all Labels
     * in the group. */
    sizeGroup = '';
    /**@type {boolean} If clip is true, the text will be clipped to the bounding rect */
    clip = false;
    /**
     * @type {boolean} If ignoreSizeForGroup is true and this Label is part of a group,
     * this Label's fontSize will not be used to set the fontSize for the group (useful
     * in combination with clip to handle text that can be very long). */
    ignoreSizeForGroup = false;
    /**@type {string} name of the font */
    fontName = '"Nimbus Mono PS", "Courier New", monospace';
    /**@type {string} text displayed in the label*/
    text = '';
    /**@type {boolean} true to wrap long lines of text */
    wrap = false;
    /**@type {boolean} true to wrap long lines of text */
    richText = false;
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
     * */
    constructor() {
        super();
        this._textData = null;
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
    on_richText(e, object, v) {
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
                this[3] = this.richText? sizeRichText(ctx, this.text, fontSize, this.fontName, this.rect, this.color, this.wrap)[1] :  
                    this.wrap ? sizeWrappedText(ctx, this.text, fontSize, this.fontName, this.align == "center", this.rect, this.color, this.wrapAtWord)[1] :
                    sizeText(ctx, this.text, fontSize, this.fontName, this.align == "center", this.rect, this.color)[1];
            }
        }
        if ('w' in this.hints && this.hints['w'] == null) {
            if (fontSize !== null) {
                this[2] = this.richText? sizeRichText(ctx, this.text, fontSize, this.fontName, this.rect, this.color, this.wrap)[0] :  
                    this.wrap ? sizeWrappedText(ctx, this.text, fontSize, this.fontName, this.align == "center", this.rect, this.color, this.wrapAtWord)[0] :
                    sizeText(ctx, this.text, fontSize, this.fontName, this.align == "center", this.rect, this.color)[0];
            }
        }
        fontSize = fontSize === null ? this.h / 2 : fontSize;
        if (this.fontSize === null && this.rect.w !== undefined) {
            let i = 0;
            let w, h;
            while (true && i < 50) {
                if (this.richText) {
                    [w, h] = sizeRichText(ctx, this.text, fontSize, this.fontName, this.rect, this.color, this.wrap);
                } else if (this.wrap) {
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
                const err = Math.min(1.1, this.w / w, this.h / h);
                if (this.wrap) {
                    fontSize *= err ** 0.5;
                } else {
                    fontSize *= err ** 1.1;
                }
                i++;
            }
            if (fontSize === undefined) fontSize = 0.001 * App.get().h;
        }
        if (this.sizeGroup !== '') {
            this._bestFontSize = fontSize;
            this._textData = null;
        } else {
            if (this.richText) {
                this._textData = getRichText(ctx, this.text, fontSize, this.fontName, this.align, this.valign, this.rect, this.color, this.wrap);
            } else if (this.wrap) {
                this._textData = getWrappedTextData(ctx, this.text, fontSize, this.fontName, this.align, this.valign, this.rect, this.color, this.wrapAtWord);
            } else {
                this._textData = getTextData(ctx, this.text, fontSize, this.fontName, this.align, this.valign, this.rect, this.color);
            }
        }
        super.layoutChildren();
    }
    sizeToGroup(ctx) {
        if (this._bestFontSize === undefined) return;
        let fontSize = Infinity;
        for (let lbl of App.get().iterByPropertyValue('sizeGroup', this.sizeGroup)) {
            if (fontSize > lbl._bestFontSize && !lbl.ignoreSizeForGroup) fontSize = lbl._bestFontSize;
        }
        if (fontSize > 0) {
            for (let lbl of App.get().iterByPropertyValue('sizeGroup', this.sizeGroup)) {
                const fs = lbl.clip || !lbl.ignoreSizeForGroup ? fontSize : lbl._bestFontSize;
                if (lbl.richText) {
                    lbl._textData = getRichText(ctx, lbl.text, fs, lbl.fontName, lbl.align, lbl.valign, lbl.rect, lbl.color, lbl.wrap);
                } else if (lbl.wrap) {
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
        if (this.clip) {
            ctx.save();
            const r = this.rect;
            ctx.rect(r.x, r.y, r.w, r.h);
            ctx.clip();
        }
        if (!this._textData && this.sizeGroup !== '') this.sizeToGroup(ctx);
        if (this._textData) {
            if (this.richText) {
                //@ts-ignore
                drawRichText(ctx, this._textData);
            } else if (this.wrap) {
                //@ts-ignore
                drawWrappedText(ctx, this._textData, this.color);
            } else {
                //@ts-ignore
                drawText(ctx, this._textData, this.color);
            }
        }
        if (this.clip) ctx.restore();
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
     */
    constructor() {
        super();
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
 * @typedef {import('./types').BasicButtonProperties} BasicButtonProperties
 */


/**
 * BasicButton is a widget (a colored rectangle) that can be pressed or clicked, emits a 
 * `'press'` event when the button is released
 */
export class BasicButton extends Widget {
    /**@type {string} Color of button (derives from widget)*/
    color = colorString([0.8, 0.8, 0.8]);
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
     */
    constructor() {
        super();
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
    /**@type {boolean} State of the ToggleButton, true if checked and false if unchecked */
    _press = false;
    /**@type {string|null} If not null, the ToggleButton becomes part of a group where only one option in the group can be active */
    group = null;
    /**@type {boolean} If group is true, activating this button deactivates others  */
    singleSelect = true;
    /**
     * Constructs a new Checkbox with specified propertes in `props` 
     */
    constructor() {
        super();
    }
    /**@type {boolean}*/
    get press() {
        return this._press;
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
        // if (super.on_touch_up(event, object, touch)) return true;
        if (touch.grabbed !== this) return false;
        touch.ungrab();
        this._touching = false;
        if (this.collide(touch.rect)) {
            if (this.group === null || !this.singleSelect) {
                this.press = !this.press;
            } else {
                if (this.parent !== null) {
                    for (let w of this.parent.iterByPropertyValue('group', this.group)) {
                        if (w !== this) w._press = false;
                    }
                }
                this.press = true;
            }
            return true;
        }
        return false;
    }
    /**@type {Widget['on_touch_move']} */
    on_touch_move(event, object, touch) {
        // if (super.on_touch_move(event, object, touch)) return true;
        if (touch.grabbed === this) {
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
     * Constructs a new Checkbox. 
     */
    constructor() {
        super();
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
     * Constructs a slider
     */
    constructor() {
        super();
    }
    /**@type {(touch:Touch)=>void} */
    setValue(touch) {
        let max = this.max ?? this.curMax;
        let value = 0;
        if (this.orientation == 'horizontal') value = clamp((touch.rect.x - this.x - this.w * this.sliderSize / 2) / (this.w * (1 - this.sliderSize)), 0, 1);
        if (this.orientation == 'vertical') value = clamp((touch.rect.y - this.y - this.h * this.sliderSize / 2) / (this.h * (1 - this.sliderSize)), 0, 1);
        if (this.max === null && this.curMax / this.unboundedStopMultiple > this.min) {
            value = value > 0.5 ?
                max / this.unboundedStopMultiple + (value - 0.5) / 0.5 * (max - max / this.unboundedStopMultiple) :
                this.min + value / 0.5 * (max / this.unboundedStopMultiple - this.min);
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
        if (this.max === null) this.curMax = this.unboundedStopMultiple * this.value;
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
        if (touch.grabbed !== this) return super.on_touch_move(event, object, touch);
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

            let max = this.max ?? this.curMax;
            let vPos;
            if (this.max === null && this.curMax / this.unboundedStopMultiple > this.min) {
                vPos = this.value > max / this.unboundedStopMultiple ?
                    (0.5 + 0.5 * (this.value - max / this.unboundedStopMultiple) / (max - max / this.unboundedStopMultiple)) * r.w :
                    0.5 * (this.value - this.min) / (max / this.unboundedStopMultiple - this.min) * r.w;
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

            let max = this.max ?? this.curMax;
            let vPos;
            if (this.max === null && this.curMax / this.unboundedStopMultiple > this.min) {
                vPos = this.value > max / this.unboundedStopMultiple ?
                    (0.5 + 0.5 * (this.value - max / this.unboundedStopMultiple) / (max - max / this.unboundedStopMultiple)) * r.h :
                    0.5 * (this.value - this.min) / (max / this.unboundedStopMultiple - this.min) * r.h;
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
     */
    constructor() {
        super();
        /** */
        this._textData = null;
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
    /** Vertically align textarea content inside the overlay rect using padding-top. */
    _syncTextareaVAlign(inp, rt, lhPx) {
        // Use the label's precomputed line count for initial placement
        const lines = Math.max(1, (this._textData?.outText?.length) || 1);
        const blockH = lines * lhPx;
        let padTop = 0;
        if (this.valign === 'middle') padTop = Math.max(0, (rt.h - blockH) / 2);
        else if (this.valign === 'bottom') padTop = Math.max(0, rt.h - blockH);
        inp.style.paddingTop = `${Math.floor(padTop)}px`;
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
        const app = App.get();
        const canvasdiv = document.getElementById('eskvapp');
        if (!canvasdiv) return;

        const type = this.wrap ? 'textarea' : 'input';
        const inp = document.createElement(type);
        if (!(inp instanceof HTMLInputElement) && !(inp instanceof HTMLTextAreaElement)) return;

        // --- geometry ---
        const rt = this.DOMInputRect();

        // --- font / color ---
        const color = this.color ?? 'white';
        const bgColor = this.bgColor ?? 'black';
        // Use the same size computed for the label
        const fsPx = Math.max(1, this._textData.size * app.tileSize); // <- matches canvas font size
        const lhPx = Math.round(fsPx * 1.25);                         // reasonable line-height

        inp.value = this.text;
        inp.style.position = 'absolute';
        inp.style.top = `${Math.floor(rt.y * 100) / 100}px`;
        inp.style.left = `${Math.floor(rt.x * 100) / 100}px`;
        inp.style.width = `${Math.floor(rt.w * 100) / 100}px`;
        inp.style.height = `${Math.floor(rt.h * 100) / 100}px`;
        inp.style.fontSize = `${fsPx}px`;
        inp.style.lineHeight = `${lhPx}px`;
        inp.style.fontFamily = this.fontName;
        inp.style.color = color;
        inp.style.background = bgColor;
        inp.style.textAlign = this.align;           // left | center | right
        inp.style.border = 'none';
        inp.style.outline = 'none';
        inp.style.padding = '0';
        inp.style.margin = '0';
        inp.style.boxSizing = 'border-box';
        inp.style.caretColor = color;

        if (type === 'textarea') {
            // Make textarea wrap like your label:
            // - word wrap like canvas when wrapAtWord=true
            // - character wrap when wrapAtWord=false
            inp.setAttribute('wrap', 'soft');          // don't inject CRLFs on submit
            inp.style.whiteSpace = 'pre-wrap';       // keep newlines, collapse spaces
            inp.style.overflowWrap = this.wrapAtWord ? 'break-word' : 'anywhere';
            inp.style.wordBreak = this.wrapAtWord ? 'normal' : 'break-all';
            inp.style.resize = 'none';
            inp.style.overflowY = 'auto';           // scroll if user types past box
            // vertical alignment (approximate): add top padding to center/bottom
            this._syncTextareaVAlign(inp, rt, lhPx);
            inp.addEventListener('input', () => this._syncTextareaVAlign(inp, this.DOMInputRect(), lhPx));
        } else {
            // single-line input behaves like non-wrapped label
            inp.style.whiteSpace = 'nowrap';
            inp.style.overflow = 'hidden';
        }

        this._activeDOMInput = inp;
        canvasdiv.appendChild(inp);
        inp.addEventListener('focusout', () => this.clearDOM());
        inp.focus();
        inp.select();
        this.focus = true;
    }
    clearDOM() {
        if (this._activeDOMInput != null) {
            this.text = this._inputSanitizer ? this._inputSanitizer(this._activeDOMInput.value, this)
                : this._activeDOMInput.value;
            let inp = this._activeDOMInput;
            this._activeDOMInput = null;
            inp.remove();
            this.focus = false;
            this._needsLayout = true;
            let iph = App.get().inputHandler;
            if (iph?.grabbed === this) iph.ungrab();
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
            if (this._activeDOMInput instanceof HTMLTextAreaElement && this.wrap) {
                const fsPx = parseFloat(this._activeDOMInput.style.fontSize) || 16;
                const lhPx = parseFloat(this._activeDOMInput.style.lineHeight) || Math.round(fsPx * 1.25);
                this._syncTextareaVAlign(this._activeDOMInput, rt, lhPx);
            }
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
    /**@type {HTMLImageElement} */
    image = new Image();
    /**@type {string|null} */
    bgColor = null;
    /**@type {string|null} */
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
     */
    constructor() {
        super();
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
        // let mirrorx = 1 - 2 * (this.mirror ? 1 : 0);
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
        if (this.mirror) ctx.scale(-1, 1);
        ctx.translate(r.x + anchor[0],
            r.y + anchor[1]);
        if (this.angle != 0) ctx.rotate(this.angle);
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
     * Creates an instance of a BoxLayout. Use BoxLayout.a(id?, props?) to create an instance in your app.
     */
    constructor() {
        super();
    }
    *iterChildren() {
        if (this.order === 'forward') {
            for (let c of this._children) yield c;
        } else {
            for (let i = this._children.length - 1; i >= 0; i--) {
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
    layoutChildren() {
        if (this._layoutNotify) this.emit('layout', null);
        this._needsLayout = false;
        let spacingX = this.getMetric(this, 'spacingX', this.spacingX);
        let spacingY = this.getMetric(this, 'spacingY', this.spacingY);
        let paddingX = this.getMetric(this, 'paddingX', this.paddingX);
        let paddingY = this.getMetric(this, 'paddingY', this.paddingY);
        if (this.orientation === 'vertical') {
            let num = this.children.length;
            let h = this.h - spacingY * (num - 1) - 2 * paddingY;
            let w = this.w - 2 * paddingX;
            //TODO: There should be a way to infer height of each c from height of c.children if c.hint['h']=null
            //The problem is that we only know size and not position at this point
            //so we'd probably need to split up layoutChildren into sizeChildren then placeChildren routines.
            let fixedh = 0
            for (let c of this.iterChildren()) {
                c.w = w;
                this.applyHints(c, w, h);
                if ('h' in c.hints) {
                    if (c.hints['h'] === null) c.layoutChildren();
                    fixedh += c.h;
                    num--;
                }
            }
            let ch = (h - fixedh) / num;
            let cw = w;
            if ((num === 0 && h > 0 || ch < 0) && this.hints['h'] !== null) paddingY = (h - fixedh) / 2;
            let y = this.y + paddingY;
            let x = this.x + paddingX;
            for (let c of this.iterChildren()) {
                c.y = y;
                if (!('w' in c.hints)) c.w = cw;
                if (!('h' in c.hints)) c.h = ch;
                if (!('x' in c.hints) && !('center_x' in c.hints) && !('right' in c.hints)) {
                    c.x = x;
                    if (w !== c.w) {
                        c.x += (w - c.w) / 2;
                    }
                }
                c.layoutChildren();
                y += spacingY + c.h;
            }
            //TODO: should this be a separate property to control? e.g., fitToChildren
            if (num === 0 && this.hints['h'] === null) { //height determined by children
                const oldH = this[3];
                this[3] = y + 2 * paddingY - this.y;
                //WORKAROUND: Need to relayout everything now that we have the size set
                if (Math.abs(oldH - this[3]) > 1e-6) {
                    App.get()._needsLayout = true;
                }
            }
            return;
        }
        if (this.orientation === 'horizontal') {
            let num = this.children.length;
            let h = this.h - 2 * paddingY;
            let w = this.w - spacingX * (num - 1) - 2 * paddingX;
            let fixedw = 0
            for (let c of this.iterChildren()) {
                c.h = h;
                this.applyHints(c, w, h);
                if ('w' in c.hints) {
                    if (c.hints['w'] === null) c.layoutChildren();
                    fixedw += c.w;
                    num--;
                }
            }
            let ch = h;
            let cw = (w - fixedw) / num;
            if ((num === 0 && w > 0 || cw < 0) && this.hints['w'] !== null) paddingX = (w - fixedw) / 2;
            let y = this.y + paddingY;
            let x = this.x + paddingX;
            for (let c of this.iterChildren()) {
                c.x = x;
                if (!('w' in c.hints)) c.w = cw;
                if (!('h' in c.hints)) c.h = ch;
                if (!('y' in c.hints) && !('center_y' in c.hints) && !('bottom' in c.hints)) {
                    c.y = y;
                    if (h !== c.h) {
                        c.y += (h - c.h) / 2;
                    }
                }
                c.layoutChildren();
                x += spacingX + c.w;
            }
            if (num === 0 && this.hints['w'] === null) { //width determined by children
                const oldW = this[2];
                this[2] = x + 2 * paddingX - this.x;
                //WORKAROUND: Need to relayout everything now that we have the size set
                if (Math.abs(oldW - this[2]) > 1e-6) {
                    App.get()._needsLayout = true;
                }
            }
        }
    }
}

/**
 * @typedef {import('./types').NotebookProperties} NotebookProperties
 */

/**
 * A notebook is a layout widget that one `Widget` at a time collection of 
 * ordered `Widget`s where only the widget on the activePage is displayed. 
 * Widgets can be added and removed as children using the standard behavior. 
 */
export class Notebook extends Widget {
    activePage = 0;
    /**
     * Creates an instance of a Notebook. Use Notebook.a to create an instance
     */
    constructor() {
        super();
    }
    /**@type {Widget['on_wheel']} */
    on_wheel(event, object, wheel) {
        const ch = this.children[this.activePage] ?? undefined;
        if (ch !== undefined) if (ch.emit(event, wheel)) return true;
        return false;
    }
    /**@type {Widget['on_touch_down']} */
    on_touch_down(event, object, touch) {
        let newT = this.getTransform();
        if (newT) {
            let t = touch.copy();
            let dp = newT.inverse().transformPoint(new DOMPoint(t.pos[0], t.pos[1]));
            t.pos = [dp.x, dp.y]
            const ch = this.children[this.activePage] ?? undefined;
            if (ch !== undefined) if (ch.emit(event, t)) return true;
        } else {
            const ch = this.children[this.activePage] ?? undefined;
            if (ch !== undefined) if (ch.emit(event, touch)) return true;
        }
        return false;
    }
    /**@type {Widget['on_touch_up']} */
    on_touch_up(event, object, touch) {
        let newT = this.getTransform();
        if (newT) {
            let t = touch.copy();
            let dp = newT.inverse().transformPoint(new DOMPoint(t.pos[0], t.pos[1]));
            t.pos = [dp.x, dp.y]
            const ch = this.children[this.activePage] ?? undefined;
            if (ch !== undefined) if (ch.emit(event, t)) return true;
        } else {
            const ch = this.children[this.activePage] ?? undefined;
            if (ch !== undefined) if (ch.emit(event, touch)) return true;
        }
        return false;
    }
    /**@type {Widget['on_touch_move']} */
    on_touch_move(event, object, touch) {
        let newT = this.getTransform();
        if (newT) {
            let t = touch.copy();
            let dp = newT.inverse().transformPoint(new DOMPoint(t.pos[0], t.pos[1]));
            t.pos = [dp.x, dp.y]
            const ch = this.children[this.activePage] ?? undefined;
            if (ch !== undefined) if (ch.emit(event, t)) return true;
        } else {
            const ch = this.children[this.activePage] ?? undefined;
            if (ch !== undefined) if (ch.emit(event, touch)) return true;
        }
        return false;
    }
    /**@type {Widget['on_touch_cancel']} */
    on_touch_cancel(event, object, touch) {
        let newT = this.getTransform();
        if (newT) {
            let t = touch.copy();
            let dp = newT.inverse().transformPoint(new DOMPoint(t.pos[0], t.pos[1]));
            t.pos = [dp.x, dp.y]
            const ch = this.children[this.activePage] ?? undefined;
            if (ch !== undefined) if (ch.emit(event, t)) return true;
        } else {
            const ch = this.children[this.activePage] ?? undefined;
            if (ch !== undefined) if (ch.emit(event, touch)) return true;
        }
        return false;
    }
    on_activePage(e, o, v) {
        this._needsLayout = true;
    }
    /**@type {Widget['_draw']} */
    _draw(app, ctx, millis) {
        this.draw(app, ctx)
        let transform = this.getTransform();
        if (transform) {
            ctx.save();
            ctx.transform(transform.a, transform.b, transform.c, transform.d, transform.e, transform.f);
            let w = this.children[this.activePage] ?? undefined;
            if (w !== undefined) w._draw(app, ctx, millis);
            ctx.restore();
            return;
        }
        let w = this.children[this.activePage] ?? undefined;
        if (w !== undefined) w._draw(app, ctx, millis);
    }
}

/**
 * @typedef {import('./types').NotebookProperties} TabbedNotebookProperties
 */

/**
 * TabbedNotebook is a composite of a button strip and a notebook
 */
export class TabbedNotebook extends Notebook {
    /**@type {string|number} The height hint for the tabbed area of the TabbedNotebook */
    tabHeightHint = '1';
    /**@type {string} The named of the button group for the TabbedNotebook */
    tabGroupName = 'tabbedNotebookGroup';
    /**
     * Creates an instance of a Notebook with properties optionally specified in `properties`.
     */
    constructor() {
        super();
        this.buttonBox = a(BoxLayout, {
            orientation: 'horizontal',
            hints: { h: this.tabHeightHint, w: null },
        })
        this.buttonScroller = a(ScrollView, {
            id: '_scrollview',
            hints: { h: this.tabHeightHint, w: 1 },
            children: [
                this.buttonBox,
            ]
        });
        this._children = [this.buttonScroller];
        this.buttonScroller.parent = this;
        this.updateButtons();
    }
    on_tabHeightHint(e, o, v) {
        this.buttonBox.hints['h'] = this.tabHeightHint;
    }
    /**@type {EventCallbackNullable} */
    on_child_added(e, o, v) {
        this.updateButtons();
    }
    /**@type {EventCallbackNullable} */
    on_child_removed(e, o, v) {
        this.updateButtons();
    }
    /**@type {Widget['on_wheel']} */
    on_wheel(event, object, wheel) {
        const bb = this._children[0] ?? undefined;
        if (bb !== undefined) if (bb.emit(event, wheel)) return true;
        const ch = this.children[this.activePage] ?? undefined;
        if (ch !== undefined) if (ch.emit(event, wheel)) return true;
        return false;
    }
    /**@type {Widget['on_touch_down']} */
    on_touch_down(event, object, touch) {
        let newT = this.getTransform();
        if (newT) {
            let t = touch.copy();
            let dp = newT.inverse().transformPoint(new DOMPoint(t.pos[0], t.pos[1]));
            t.pos = [dp.x, dp.y]
            const bb = this._children[0] ?? undefined;
            if (bb !== undefined) if (bb.emit(event, t)) return true;
            const ch = this.children[this.activePage] ?? undefined;
            if (ch !== undefined) if (ch.emit(event, t)) return true;
        } else {
            const bb = this._children[0] ?? undefined;
            if (bb !== undefined) if (bb.emit(event, touch)) return true;
            const ch = this.children[this.activePage] ?? undefined;
            if (ch !== undefined) if (ch.emit(event, touch)) return true;
        }
        return false;
    }
    /**@type {Widget['on_touch_up']} */
    on_touch_up(event, object, touch) {
        let newT = this.getTransform();
        if (newT) {
            let t = touch.copy();
            let dp = newT.inverse().transformPoint(new DOMPoint(t.pos[0], t.pos[1]));
            t.pos = [dp.x, dp.y]
            const bb = this._children[0] ?? undefined;
            if (bb !== undefined) if (bb.emit(event, t)) return true;
            const ch = this.children[this.activePage] ?? undefined;
            if (ch !== undefined) if (ch.emit(event, t)) return true;
        } else {
            const bb = this._children[0] ?? undefined;
            if (bb !== undefined) if (bb.emit(event, touch)) return true;
            const ch = this.children[this.activePage] ?? undefined;
            if (ch !== undefined) if (ch.emit(event, touch)) return true;
        }
        return false;
    }
    /**@type {Widget['on_touch_move']} */
    on_touch_move(event, object, touch) {
        let newT = this.getTransform();
        if (newT) {
            let t = touch.copy();
            let dp = newT.inverse().transformPoint(new DOMPoint(t.pos[0], t.pos[1]));
            t.pos = [dp.x, dp.y];
            const bb = this._children[0] ?? undefined;
            if (bb !== undefined) if (bb.emit(event, t)) return true;
            const ch = this.children[this.activePage] ?? undefined;
            if (ch !== undefined) if (ch.emit(event, t)) return true;
        } else {
            const bb = this._children[0] ?? undefined;
            if (bb !== undefined) if (bb.emit(event, touch)) return true;
            const ch = this.children[this.activePage] ?? undefined;
            if (ch !== undefined) if (ch.emit(event, touch)) return true;
        }
        return false;
    }
    /**@type {Widget['on_touch_cancel']} */
    on_touch_cancel(event, object, touch) {
        let newT = this.getTransform();
        if (newT) {
            let t = touch.copy();
            let dp = newT.inverse().transformPoint(new DOMPoint(t.pos[0], t.pos[1]));
            t.pos = [dp.x, dp.y]
            const bb = this._children[0] ?? undefined;
            if (bb !== undefined) if (bb.emit(event, t)) return true;
            const ch = this.children[this.activePage] ?? undefined;
            if (ch !== undefined) if (ch.emit(event, t)) return true;
        } else {
            const bb = this._children[0] ?? undefined;
            if (bb !== undefined) if (bb.emit(event, touch)) return true;
            const ch = this.children[this.activePage] ?? undefined;
            if (ch !== undefined) if (ch.emit(event, touch)) return true;
        }
        return false;
    }
    /**@type {Widget[]} Read/write access to the list of child widgets*/
    get children() {
        return this._children.slice(1);
    }
    set children(children) {
        for (let c of this._children.slice(1)) {
            this.emit('child_removed', c);
            c.parent = null;
            this._needsLayout = true;
            this.updateButtons();
        }
        this._children = this._children.slice(0, 1);
        for (let c of children) {
            this.addChild(c);
        }
    }
    updateButtons() {
        this.buttonBox.children = []
        let i = 0;
        for (let page of this.children) {
            const tb = a(ToggleButton, {
                text: page['name'] ?? String(i + 1),
                group: this.tabGroupName,
                singleSelect: true,
                press: this.activePage === i,
                fontSize: '0.5',
                hints: { h: null, w: null },
            });
            tb.listen('press', (e, o, v) => {
                this.activePage = this.buttonBox.children.findIndex((w) => w === o);
            });
            this.buttonBox.addChild(tb);
            i++;
        }
    }
    layoutChildren() {
        if (this._layoutNotify) this.emit('layout', null);
        this._needsLayout = false;
        const bb = this._children[0];
        this.applyHints(bb);
        bb.x = this.x;
        bb.y = this.y;
        bb.layoutChildren();
        const h = this.h - bb.h;
        const w = this.w;
        for (let c of this.children) {
            c.y = this.y + bb.h;
            c.x = this.x;
            c.w = w;
            c.h = h;
            c.layoutChildren();
        }
    }
    /**@type {Widget['_draw']} */
    _draw(app, ctx, millis) {
        this.draw(app, ctx)
        let transform = this.getTransform();
        if (transform) {
            ctx.save();
            ctx.transform(transform.a, transform.b, transform.c, transform.d, transform.e, transform.f);
            let bb = this._children[0] ?? undefined;
            if (bb !== undefined) bb._draw(app, ctx, millis);
            let w = this.children[this.activePage] ?? undefined;
            if (w !== undefined) w._draw(app, ctx, millis);
            ctx.restore();
            return;
        }
        let bb = this._children[0] ?? undefined;
        if (bb !== undefined) bb._draw(app, ctx, millis);
        let w = this.children[this.activePage] ?? undefined;
        if (w !== undefined) w._draw(app, ctx, millis);
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
     * Constructs a new GridLayout. Create a new instance using GridLayout.a(id?, props?)
     */
    constructor() {
        super();
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
        let spacingX = this.getMetric(this, 'spacingX', this.spacingX);
        let spacingY = this.getMetric(this, 'spacingY', this.spacingY);
        let paddingX = this.getMetric(this, 'paddingX', this.paddingX);
        let paddingY = this.getMetric(this, 'paddingY', this.paddingY);
        if (this.orientation == 'horizontal') {
            let numX = this.numX;
            let numY = Math.ceil(this.children.length / this.numX);
            let h = this.h - spacingY * (numY - 1) - 2 * paddingY;
            let w = this.w - spacingX * (numX - 1) - 2 * paddingX;

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
            let h = this.h - spacingY * (numY - 1) - 2 * paddingY;
            let w = this.w - spacingX * (numX - 1) - 2 * paddingX;

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
    /**@type {boolean} zooming allowed via user input if true (pinch to zoom) */
    uiZoom = true;
    /**@type {boolean} moving allowed via user input if true (touch and slide to move) */
    uiMove = true;
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
     * Constructs a new ScrollView.
     */
    constructor() {
        super();
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
            child.listen('rect', (event, obj, data) => this._needsLayout = true);
            child.listen('w', (event, obj, data) => this._needsLayout = true);
            child.listen('h', (event, obj, data) => this._needsLayout = true);
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
        this.zoom = Math.min(this.w / this.children[0].w, this.h / this.children[0].h);
        this.scrollX = 0.5 * this.scrollableW;
        this.scrollY = 0.5 * this.scrollableH;
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
        if (this.unboundedW) {
            this._scrollX = this.scrollX;
            return;
        }
        let align = 0;
        switch (this.wAlign) {
            case 'center':
                align = 0.5 * this.scrollableW; // (this.children[0].w-this.w/this.zoom)/2;
                break
            case 'right':
                align = 1 * this.scrollableW; // (this.children[0].w-this.w/this.zoom);
        }
        this._scrollX = this.scrollableW <= 0 || this.scrollableW >= this.children[0].w ? align : value;
        this._scrollX = clamp(value, 0, this.scrollableW); //this.children[0].h-this.h/this.zoom
    }
    on_scrollY(event, object, value) {
        if (this.children.length == 0) return;
        this._needsLayout = true;
        if (this.unboundedH) {
            this._scrollY = this.scrollY;
            return;
        }
        let align = 0;
        switch (this.hAlign) {
            case 'middle':
                align = 0.5 * this.scrollableH; //(this.children[0].h-this.h/this.zoom)/2;
                break
            case 'bottom':
                align = 1 * this.scrollableH; //(this.children[0].h-this.h/this.zoom);
        }
        this._scrollY = this.scrollableH <= 0 || this.scrollableH >= this.children[0].h ? align : value;
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
        const ts = App.get().tileSize;
        let transform = new DOMMatrix()
            .translate(Math.floor((this.x - this._scrollX * this.zoom) * ts) / ts,
                Math.floor((this.y - this._scrollY * this.zoom) * ts) / ts)
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
        if (touch.grabbed !== this) {
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
            this.vel = new Vec2([-vx, -vy]);
            if (ovel) this.vel = this.vel.add(ovel).scale(0.5);
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
        if (touch.grabbed !== this) {
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
            if (this.uiMove && touch.nativeEvent == null || touch.nativeEvent instanceof TouchEvent && touch.nativeEvent.touches.length == 1) { // || touch.nativeEvent.touches.length==2
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
                    let nvel = vel.abs().sum() === 0 ? vel : vel.add(ovel).scale(0.5);
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
                    if (this._zoomCenter === null) this._zoomCenter = new Vec2(sTargetCenterPosBefore);
                    let zoom = this.zoom * d / this._lastDist;
                    let minZoom = Math.min((this.unboundedW ? 0.01 : this.w / this.children[0].w),
                        (this.unboundedH ? 0.01 : this.h / this.children[0].h));
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
        if (touch.grabbed === this) {
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

            let zoom = this.zoom * Math.exp(-wheel.deltaY / app.h);
            let minZoom = Math.min(
                (this.unboundedW ? 0.01 : this.w / this.children[0].w),
                (this.unboundedH ? 0.01 : this.h / this.children[0].h)
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
        else if (this.uiMove && this.scrollW && app.inputHandler.isKeyDown("Shift")) {
            this.scrollX += (this.scrollableW == 0 && !this.unboundedW) ? 0 : this.w / this.zoom * (wheel.deltaY / app.w);
            if (this.scrollX != this._scrollX) this.scrollX = this._scrollX;
            return true;
        } else if (this.uiMove && this.scrollH) {
            this.scrollY += (this.scrollableH == 0 && !this.unboundedH) ? 0 : this.h / this.zoom * (wheel.deltaY / app.h);
            if (this.scrollY != this._scrollY) this.scrollY = this._scrollY;
            return true;
        }
        return false;
    }
    get scrollableW() {
        if (this.children.length == 0) return 0;
        return this.unboundedW ? this.children[0].w - this.w / this.zoom : Math.max(this.children[0].w - this.w / this.zoom, 0);
    }
    get scrollableH() {
        if (this.children.length == 0) return 0;
        return this.unboundedH ? this.children[0].h - this.h / this.zoom : Math.max(this.children[0].h - this.h / this.zoom, 0);
    }
    /**@type {Widget['_draw']} */
    _draw(app, ctx, millis) {
        this.draw(app, ctx);
        let r = this.rect;
        r[0] = Math.floor(r[0] * app.tileSize * app.pixelSize) / (app.tileSize * app.pixelSize);
        r[1] = Math.floor(r[1] * app.tileSize * app.pixelSize) / (app.tileSize * app.pixelSize);
        r[2] = Math.floor(r[2] * app.tileSize * app.pixelSize) / (app.tileSize * app.pixelSize);
        r[3] = Math.floor(r[3] * app.tileSize * app.pixelSize) / (app.tileSize * app.pixelSize);
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
     * Constructs a new ModalView.
     */
    constructor() {
        super();
    }
    get visible() {
        return App.get()._modalWidgets.indexOf(this) >= 0;
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
     * Call to close the modal view programmatically
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
