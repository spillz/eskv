import {Widget} from './widgets.js';
import {Timer} from './timer.js';
import { InputHandler} from './input.js';

export class App extends Widget {
    //App is the main object class for a kivy-like UI application
    //to run in the browser. 
    //Currently it is setup in a singleton model allowing one app
    //per html page.
    //The App maintains the HTML5 Canvas and drawing Context
    //It manages the update loop in the update method that repeatedly
    //calls requestAnimationFrame
    //User interaction is handled in the inputHandler instance
    //and it will automatically bubble touch input events through
    //the widget heirarchy.
    //Every app has a baseWidget and an array of modalWidgets.
    //Global events can be propagated to baseWidget and modalWidgets
    //via the emit method (it will be up to child widgets to
    //emit thos events to tehir own children -- see on_touch_up
    //and on_touch_down implementations).
    //The modalWidgets are drawn over the top of the baseWidget
    //Use App.get() to access the running app instance. The
    //widgets added to the app will also access the running
    //singleton app instance
    static appInstance = null;
    constructor() {
        if(App.appInstance!=null) return appInstance; //singleton
        super();
        // widget container
        this._baseWidget = new Widget({hints:{x:0, y:0, w:1, h:1}});
        this._baseWidget.parent = this;
        // modal widgets
        this._modalWidgets = [];


        App.appInstance = this;
        this.pixelSize = 1;
        this.integerTileSize = false;
        this.exactDimensions = false;
        this.w =-1; //canvas pixel width
        this.h =-1; //canvas pixel height
        this.dimW = this.prefDimW = 32; //logical width
        this.dimH = this.prefDimH = 16; //logical height
        this.tileSize = this.getTileScale()*this.pixelSize; //size of each logical unit
        this.canvasName = "canvas";
        this.id = 'app';

        this.offsetX = 0;
        this.offsetY = 0;
        this.shakeX = 0;                 
        this.shakeY = 0;      
        this._needsLayout = false;

        // timer container
        this.timer_tick = null;
        this.timers = [];

    }
    get baseWidget() {
        return this._baseWidget;
    }
    addTimer(duration, callback) {
        let t = new Timer(duration, 0, callback);
        this.timers.push(t);
        return t;
    }
    removeTimer(timer) {
        this.timers = this.timers.filter(t=>t!=timer);
    }
    addModal(modal) {
        this._modalWidgets.push(modal);
        this._needsLayout = true;
    }
    removeModal(modal) {
        this._modalWidgets = this._modalWidgets.filter(m => m!=modal);
    }
    static get() { //singleton
        if(!App.appInstance) App.appInstance = new App();
        return App.appInstance;
    }
    start() {
        let that = this;
        window.onresize = (() => that.updateWindowSize());
        this.setupCanvas();
        this.inputHandler = new InputHandler(this);
        this.updateWindowSize();

        window.onload = () => this._start();
    }
    _start() {
        this.update();    
    }
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
    *iter(recursive=true, inView=true) {
        yield this;
        yield *this._baseWidget.iter(...arguments);
        for(let mw of this._modalWidgets) {
            yield *mw.iter(...arguments);
        }
    }
    findById(id) {
        for(let w of this.iter(true, false)) {
            if('id' in w && w.id==id) return w;
        }
        return null;
    }
    update() {
        let millis = 15;
        let n_timer_tick = Date.now();
        if(this.timer_tick!=null){
            millis = Math.min(n_timer_tick - this.timer_tick, 30); //maximum of 30 ms refresh
        }
        for(let t of this.timers) {
            t.tick(millis);
        }
        if(this._needsLayout) this.layoutChildren();

        this._baseWidget.update(millis);
        for(let mw of this._modalWidgets) mw.update(millis);

        this.draw(millis);

        window.requestAnimationFrame(() => this.update());
        this.timer_tick = n_timer_tick;
    }
    draw(millis){
        this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
        this.shakeX = 0;
        this.shakeY = 0;
        this.shakeAmount = 0;
        this.screenShake();

        this.ctx.save();
        this.ctx.translate(this.offsetX + this.shakeX, this.offsetY + this.shakeY);
        this.ctx.scale(this.tileSize, this.tileSize);

        this._baseWidget._draw(millis);
        for(let mw of this._modalWidgets) mw._draw(millis);
        this.ctx.restore();
    }
    to_local(pos) {
        return [(pos[0]-this.offsetX-this.shakeX)/this.tileSize, (pos[1]-this.offsetY-this.shakeY)/this.tileSize];
//        return pos;
    }
    updateWindowSize() {
        this.x = 0;
        this.y = 0;
        this.w = window.innerWidth;
        this.h = window.innerHeight;
        this.tileSize = this.getTileScale();
        this.fitMaptoTileSize(this.tileSize);
        this.setupCanvas();
        try {
            screen.orientation.unlock();
        } catch(error) {
        }

        this._needsLayout = true;
    }
    getTileScale() {
        let sh = this.h;
        let sw = this.w;
        let scale;
        scale = Math.min(sh/(this.prefDimH)/this.pixelSize,sw/(this.prefDimW)/this.pixelSize);
        if(this.integerTileSize) { //pixel perfect scaling
            scale = Math.floor(scale);
        }    
        return scale*this.pixelSize;
    }
    fitMaptoTileSize(scale) {
        let sh = this.h;
        let sw = this.w;
        if(this.exactDimensions) {
            this.dimH = this.prefDimH;
            this.dimW = this.prefDimW;        

        } else {
            this.dimH = Math.floor(sh/scale);
            this.dimW = Math.floor(sw/scale);        
        }
    }
    setupCanvas(){
        this.canvas = document.querySelector(this.canvasName);

        this.canvas.width = this.w; //this.tileSize*(this.dimW);
        this.canvas.height = this.h; //this.tileSize*(this.dimH);
        this.canvas.style.width = this.canvas.width + 'px';
        this.canvas.style.height = this.canvas.height + 'px';

        this.ctx = this.canvas.getContext("2d");
        this.ctx.imageSmoothingEnabled = false;

        this.offsetX = Math.floor((this.w - this.tileSize*this.dimW)/2);
        this.offsetY =  Math.floor((this.h - this.tileSize*this.dimH)/2);
    }
    applyHints(c) {
        let hints = c.hints;
        if('w' in hints && hints['w']!=null) c.w = hints['w']*this.dimW;
        if('h' in hints && hints['h']!=null) c.h = hints['h']*this.dimH;
        if('x' in hints && hints['x']!=null) c.x = hints['x']*this.dimW;
        if('y' in hints && hints['y']!=null) c.y = hints['y']*this.dimH;
        if('center_x' in hints && hints['center_x']!=null) c.center_x = hints['center_x']*this.dimW;
        if('center_y' in hints && hints['center_y']!=null) c.center_y = hints['center_y']*this.dimH;
        if('right' in hints && hints['right']!=null) c.right = hints['right']*this.dimW;
        if('bottom' in hints && hints['bottom']!=null) c.bottom = hints['bottom']*this.dimH;
    }
    screenShake() {
        if(this.shakeAmount){
            this.shakeAmount--;
        }
        let shakeAngle = Math.random()*Math.PI*2;
        this.shakeX = Math.round(Math.cos(shakeAngle)*this.shakeAmount);
        this.shakeY = Math.round(Math.sin(shakeAngle)*this.shakeAmount);
    }    
    layoutChildren() {
        //Key concept: 
        //As a general rule, each widget (and the app) controls the placement of its child widgets.
        //Whenever the layout properties (x,y,w,h etc) of any widget (or the app itself) have changed, 
        //all layout properites of the children of that widget will be updated at the next update call. 
        //Each widget has an internal _needsLayout boolean that tracks whether the layoutChildren should 
        //be called in that widget's update routine. That flag gets cleared once the layoutChildren of the 
        //child has been called to prevent multiple unecessary calls.

        // The layout in the app will respect hints but otherwise assume the widgets will control their
        // size and postioning
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
