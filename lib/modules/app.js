//@ts-check

import { EventSink, ModalView, Widget, EventManager, Styling } from './widgets.js';
import { Timer } from './timer.js';
import { InputHandler } from './input.js';
import { Vec2 } from './geometry.js';

/**
 * App is the main object class for a kivy-like UI application
 * to run in the browser. 
 * Currently it is setup in a singleton model allowing one app
 * per html page.
 * The App maintains the HTML5 Canvas and drawing Context
 * It manages the update loop in the update method that repeatedly
 * calls requestAnimationFrame
 * User interaction is handled in the inputHandler instance
 * and it will automatically bubble touch input events through
 * the widget heirarchy.
 * Every app has a baseWidget and an array of modalWidgets.
 * Global events can be propagated to baseWidget and modalWidgets
 * via the emit method (it will be up to child widgets to
 * emit those events to their own children -- see on_touch_up
 * and on_touch_down implementations).
 * The modalWidgets are drawn over the top of the baseWidget
 * Use App.get() to access the running app instance. The
 * widgets added to the app will also access the running
 * singleton app instance
 */
export class App extends Widget {
    /**
     * Object representing the singleton App instance
     * @type {App|null}
     */
    static appInstance = null;
    /**
     * 
     * @param {Object|null} props 
     * @returns 
     */
    constructor(props=null) {
        if(App.appInstance!=null) return App.appInstance; //singleton
        super();
        App.appInstance = this;
        /** @type {EventManager} */
        this._eventManager = new EventManager();
        /** @type {Styling} */
        this.styling = new Styling()
        /** @type {string} */
        this.id = 'app';
        /** @type {number} */
        this.w =-1; //canvas pixel width
        /** @type {number} */
        this.h =-1; //canvas pixel height
        /** @type {Widget} The baseWidget object*/
        this._baseWidget = new Widget({hints:{x:0, y:0, w:1, h:1}});
        this._baseWidget.parent = this;
        /** @type {Array<ModalView>} Container for modal widgets*/
        this._modalWidgets = [];
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
        this.tileSize = this.getTileScale()*this.pixelSize;
        /** @type {string} DOM name of the canvas to draw the interface on*/
        this.canvasName = "canvas";
        /** @type {null|HTMLCanvasElement} Canvas object used to draw the App on*/
        this.canvas = null
        /** @type {number} x-axis offset in pixels from the left edge of the canvas*/
        this.offsetX = 0;
        /** @type {number} y-axis offset in pixels from the top edge of the canvas*/
        this.offsetY = 0;
        /** @type {number} x-axis shake offset in pixels (used for screen shake)*/
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
        if(props) this.updateProperties(props);
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
        this.timers = this.timers.filter(t=>t!=timer);
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
        this._modalWidgets = this._modalWidgets.filter(m => m!=modal);
    }
    /**
     * Static method to retrieve the singleton app instance
     * @returns {App}
     */
    static get() { //singleton
        if(!App.appInstance) App.appInstance = new App();
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
        window.onload = () => this._start();
    }
    /**
     * Internal function to actually start the main application loop once the main window has been loaded
     */
    _start() {
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
    childEmit(event, data, topModalOnly=false) { //TODO: Need to suppress some events for a modal view(e.g., touches)
        if(topModalOnly && this._modalWidgets.length>0) {
            return this._modalWidgets[this._modalWidgets.length-1].emit(event, data);
        } else {
            if(this._baseWidget.emit(event, data)) return true;
            for(let mw of this._modalWidgets) {
                if(mw.emit(event, data)) return true;
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
    *iter(recursive=true, inView=true) {
        yield this;
        yield *this._baseWidget.iter(...arguments);
        for(let mw of this._modalWidgets) {
            yield *mw.iter(...arguments);
        }
    }
    /**
     * Find the first widget in the heirarchy whose id property matches the value id
     * @param {string} id the id to search for
     * @returns {Widget|null}
     */
    findById(id) {
        for(let w of this.iter(true, false)) {
            if('id' in w && w.id==id) return w;
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
        for(let w of this.iter(true, false)) {
            if(property in w && w[property]===value) yield w;
        }
    }
    /**
     * Update is called by the DOM window's requestAnimationFrame to update 
     * the state of the widgets in the heirarchy and then draw them.
     */
    update() {
        this._requestedFrameUpdate = false;
        let millis = 15;
        let n_timer_tick = Date.now();
        if(this.timer_tick!=null){
            millis = Math.min(n_timer_tick - this.timer_tick, 30); //maximum of 30 ms refresh
        }
        if(this.timers.length>0 || this._needsLayout) this.requestFrameUpdate();
        for(let t of this.timers) {
            t.tick(millis);
        }
        if(this._needsLayout) {
            this.layoutChildren();
        }

        this._baseWidget.update(this, millis);
        for(let mw of this._modalWidgets) mw.update(this, millis);

        if(this.ctx) this._draw(this, this.ctx, millis);

        if(this.continuousFrameUpdates) this.requestFrameUpdate();
        this.timer_tick = n_timer_tick;
    }
    requestFrameUpdate() {
        if(!this._requestedFrameUpdate) {
            this._requestedFrameUpdate = true;    
            window.requestAnimationFrame(() => this.update());
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
    _draw(app, ctx, millis){
        if(!this.canvas) {
            return
        }
        ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
        this.shakeX = 0;
        this.shakeY = 0;
        this.screenShake();

        ctx.save();
        let tx = this.getTransform();
        if(tx) ctx.transform(tx.a, tx.b, tx.c, tx.d, tx.e, tx.f);

        this._baseWidget._draw(app, ctx, millis);
        for(let mw of this._modalWidgets) mw._draw(app, ctx, millis);
        ctx.restore();
    }
    // /**
    //  * Returns the matrix that converts from tile units to pixels.
    //  * This functions maybe called as part of a recursive chain from a descendant widget 
    //  * to recover the pixel position of a given position in tile units.
    //  * @param {[number, number]} pos 
    //  * @returns {[number, number]}
    //  */
    getTransform(recurse=true) {
        return new DOMMatrix()
            .translate(this.offsetX + this.shakeX, this.offsetY + this.shakeY)
            .scale(this.tileSize, this.tileSize);
    }
    /**
     * Resize event handler (updates the canvas size, tileSize, dimW, and dimH properties)
     */
    updateWindowSize() {
        this.x = 0;
        this.y = 0;
        this.w = window.innerWidth;
        this.h = window.innerHeight;
        this.tileSize = this.getTileScale();
        this.fitDimensionsToTileSize(this.tileSize);
        this.setupCanvas();
        try {
            screen.orientation.unlock();
        } catch(error) {
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
        let scale = 1/this.pixelSize;
        if(this.prefDimW<0 && this.prefDimH<0) {
            if(this.tileSize>0) scale = this.tileSize/this.pixelSize;
        } else if(this.prefDimW<0) {
            scale = sh/(this.prefDimH)/this.pixelSize;
        } else if(this.prefDimH<0) {
            scale = sw/(this.prefDimW)/this.pixelSize;
        } else {
            scale = Math.min(sh/(this.prefDimH)/this.pixelSize, sw/(this.prefDimW)/this.pixelSize);
        }
        if(this.integerTileSize && scale>1) scale = Math.floor(scale);
        return scale*this.pixelSize;
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
        if(this.exactDimensions) {
            if(this.prefDimW<0 && this.prefDimH<0) {
                this.dimW = sw/this.tileSize;
                this.dimH = sh/this.tileSize;    
            } else if (this.prefDimH<0) {
                this.dimW = this.prefDimW;
                this.dimH = sh/this.tileSize;    
            } else if (this.prefDimW<0) {
                this.dimW = sw/this.tileSize;
                this.dimH = this.prefDimH;    
            } else {
                this.dimH = this.prefDimH;
                this.dimW = this.prefDimW;        
            }
            return;
        }
        this.dimH = Math.floor(sh/scale);
        this.dimW = Math.floor(sw/scale);        
    }
    /**
     * Initialize the canvas named canvasName in the DOM. Called automatically during construction 
     * and in response to window resize events. Usually should not need to be called 
     * by application programs
     */
    setupCanvas(){
        this.canvas = document.querySelector(this.canvasName);
        if(!this.canvas) {
            //TODO: Need an error message here
            return;
        }

        this.canvas.width = this.w; //this.tileSize*(this.dimW);
        this.canvas.height = this.h; //this.tileSize*(this.dimH);
        this.canvas.style.width = this.canvas.width + 'px';
        this.canvas.style.height = this.canvas.height + 'px';

        this.ctx = this.canvas.getContext("2d");
        if(!this.ctx) {
            return;
        }
        this.ctx.imageSmoothingEnabled = false;

        this.offsetX = Math.floor((this.w - this.tileSize*this.dimW)/2);
        this.offsetY =  Math.floor((this.h - this.tileSize*this.dimH)/2);
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
        if(this.shakeAmount){
            this.shakeAmount--;
        }
        let shakeAngle = Math.random()*Math.PI*2;
        this.shakeX = Math.round(Math.cos(shakeAngle)*this.shakeAmount);
        this.shakeY = Math.round(Math.sin(shakeAngle)*this.shakeAmount);
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
        if(this._layoutNotify) this.emit('layout', null);
        this._needsLayout = false;
        this.applyHints(this._baseWidget);
        this._baseWidget.layoutChildren();
        for(let mw of this._modalWidgets) {
            this.applyHints(mw);
            mw.layoutChildren();
        }
    }
}
