//MODULE FOR THE ESKV IMPLEMENTATION OF STANDARD KIVY CLASSES
//Currently contains
//WidgetAnimation -- implementation of Kivy's Animation -- TODO: Move to own module
//Widget -- Widget replicates functionality of kivy widget, floatlayout and relativelayout
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

//Kivy standard widgtes
//UX: Label, Button, CheckBox, Image, Slider, Progress Bar, Text Input, Toggle button, Switch, Video
//Layouts: Anchor Layout, Box Layout, Float Layout, Grid Layout, PageLayout, Relative Layout, Scatter Layout, Stack Layout
//Complex UX: Bubble, Drop-Down List, FileChooser, Popup, Spinner, RecycleView, TabbedPanel, Video player, VKeyboard,
//Behaviors: Scatter, Stencil View
//Screen Manager: Screen Manager
import {sizeText, sizeWrappedText, getTextData, getWrappedTextData, drawText, drawWrappedText} from './text.js';
import {App} from './app.js';
import {Rect} from './geometry.js'; 
import {colorString, clamp, dist} from './math.js';


export const hints_default = {x:0, y:0, w:1, h:1};

export class WidgetAnimation {
    stack = [];
    widget = null;
    props = {}
    elapsed = 0;
    constructor() {
    }
    add(props, duration=1000) { 
        this.stack.push([props, duration]);
    }
    update(millis) { //todo: props can be of the form {prop1: 1, prop2: 2, ...} or {prop1: [1,func1], prop2: [2,func2]}
        //TODO: For some reason, something gets stuck after resize leaving widgets in incorrect final positions
        let targetProps = this.stack[0][0];
        let duration = this.stack[0][1];
        if(this.elapsed==0) {
            this.initProps = {};
            for(let p in targetProps) {
                this.initProps[p] = this.widget[p]; //TODO: If the window gets resized these will be out of date
            }
        }
        let skip = this.elapsed+millis-duration;
        this.elapsed = skip<0 ?this.elapsed+millis:duration;
        let wgt = duration==0? 1:this.elapsed/duration;
        if(skip<0) {
            for(let p in this.initProps) {
                this.widget[p] = (1-wgt)*this.initProps[p] + wgt*targetProps[p];
            }    
        } else {
            for(let p in this.initProps) {
                this.widget[p] = targetProps[p];
            }    
            this.stack = this.stack.slice(1);
            this.elapsed = skip;
            if(this.stack.length==0) this.cancel();
            else {
                this.initProps = {};
                for(let p in this.stack[0][0]) {
                    this.initProps[p] = this.widget[p];
                }    
            }
        }
    }
    start(widget) {
        this.widget = widget;
        widget._animation = this;
    }
    cancel() {
        this.widget._animation = null;
    }
}


export class Widget extends Rect {
    bgColor = null;
    outlineColor = null;
    _animation = null;
    _layoutNotify = false; //By default, we don't notify about layout events because that's a lot of function calls across a big widget collection
    hints = {};
    constructor(properties=null) {
        super();
        this.parent = null;
        this.processTouches = false;
        this._deferredProps = null;
        this._children = []; //widget has arbitrarily many children
        this._needsLayout = true;
        this._events = {
        };
        if(properties!=null) {
            this.updateProperties(properties);
        }
        return new Proxy(this, {
            set(target, name, value) {
                if(['x','y','w','h','children','rect'].includes[name] || name[0]=='_') return Reflect.set(...arguments);
                Reflect.set(...arguments);
//                target[name] = value;
                target.emit(name, value);
                return true;
            }
          });
    }
    set rect(rect) {
        this[0] = rect[0];
        this[1] = rect[1];
        this[2] = rect[2];
        this[3] = rect[3];
        this._needsLayout = true;
    }
    get rect() {
        return new Rect(this);
    }
    deferredProperties() {
        let app = App.get();
        let properties = this._deferredProps;
        this._deferredProps = null;
        for(let p in properties) {
            if(!p.startsWith('on_') && typeof properties[p] == 'function') { //Dynamic property binding
                //TODO: this needs to be deferred again if any of the objs can't be found yet
                let func = properties[p];
                let args,rval;
                [args, rval] = func.toString().split('=>')
                args = args.replace('(','').replace(')','').split(',').map(a=>a.trim());
                let objs = args.map(a=>app.findById(a));
                let obmap = {}
                for(let a of args) {
                    obmap[a] = app.findById(a);
                }
                //Bind to all object properties in the RHS of the function
                const re = /(\w+)\.(\w+)/g;
                for(let pat of rval.matchAll(re)) {
                    let pr,ob;
                    [ob, pr] = pat.slice(1);
                    obmap[ob].bind(pr, (evt, obj, data)=> { try { this[p] = func(...objs) } catch(error) {console.log('Dynamic binding error',this,p,error)}});
                }
                //Immediately evaluate the function on the property
                try {
                    this[p] = func(...objs);
                } catch(error) {
                    console.log('Dynamic binding error',this,p,error)
                }
            }
        }
    }
    updateProperties(properties) {
        for(let p in properties) {
            if(!p.startsWith('on_') && typeof properties[p] == 'function') { //Dynamic property binding
                this._deferredProps = properties;
            } else {
                this[p] = properties[p];
            }
        }    
    }
    bind(event, func) {
        if(!(event in this._events)) this._events[event] = [];
        this._events[event].push(func);
    }
    unbind(event, func) {
        this._events[event] = this._events[event].filter(b => b!=func);
    }
    emit(event, data) {
        if('on_'+event in this) {
            if(this['on_'+event](event, data)) return true;
        }
        if(!(event in this._events)) return;
        let listeners = this._events[event];
        for(let func of listeners)
            if(func(event, this, data)) return true;
        return false;
    }
    *iter(recursive=true, inView=true) {
        yield this;
        if(!recursive) return;
        for(let c of this._children) {
            yield *c.iter(...arguments);
        }
    }
    *iterParents() {
        yield this.parent;
        if(this.parent != App.get()) yield *this.parent.iterParents();
    }
    findById(id) {
        for(let w of this.iter(true, false)) {
            if('id' in w && w.id==id) return w;
        }
        return null;
    }
    *iterByPropertyValue(property, value) {
        for(let w of this.iter(true, false)) {
            if(property in w && w[property]==value) yield w;
        }
    }
    to_local(pos) {
        return pos;
    }
    addChild(child, pos=-1) {
        if(pos==-1) {
            this._children.push(child);
        } else {
            this._children = [...this._children.slice(0,pos), child, ...this._children.slice(pos)];
        }
        this.emit('child_added', child);
        child.parent = this;
        this._needsLayout = true;
    }
    removeChild(child) {
        this._children = this.children.filter(c => c!=child);
        this.emit('child_removed', child);
        child.parent = null;
        this._needsLayout = true;
    }
    get children() {
        return this._children;
    }
    set children(children) {
        for(let c of this._children) {
            this.emit('child_removed', c);
            c.parent = null;
            this._needsLayout = true;
        }
        this._children = [];
        for(let c of children) {
            this.addChild(c);
        }
    }
    set x(val) {
        this._needsLayout = true;
        this[0] = val;
    }
    set center_x(val) {
        this._needsLayout = true;
        this[0] = val-this[2]/2;
    }
    set right(val) {
        this._needsLayout = true;
        this[0] = val-this[2];
    }
    set y(val) {
        this._needsLayout = true;
        this[1] = val;
    }
    set center_y(val) {
        this._needsLayout = true;
        this[1] = val-this[3]/2;
    }
    set bottom(val) {
        this._needsLayout = true;
        this[1] = val-this[3];
    }
    set w(val) {
        this._needsLayout = true;
        this[2] = val;
    }
    set h(val) {
        this._needsLayout = true;
        this[3] = val;
    }
    get x() {
        return this[0];
    }
    get center_x() {
        return this[0] + this[2]/2;
    }
    get right() {
        return this[0] + this[2];
    }
    get y() {
        return this[1];
    }
    get center_y() {
        return this[1] + this[3]/2;
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
    on_wheel(event, wheel) {
        for(let c of this.children) if(c.emit(event, wheel)) return true;
        return false;
    }
    on_touch_down(event, touch) {
        for(let c of this.children) if(c.emit(event, touch)) return true;
        return false;
    }
    on_touch_up(event, touch) {
        for(let c of this.children) if(c.emit(event, touch)) return true;
        return false;
    }
    on_touch_move(event, touch) {
        for(let c of this.children) if(c.emit(event, touch)) return true;
        return false;
    }
    on_touch_cancel(event, touch) {
        for(let c of this.children) if(c.emit(event, touch)) return true;
        return false;
    }
    on_back_button(event, history) {
        // for(let c of this.children) if(c.emit(event, touch)) return true;
        return false;
    }
    getMetric(widget, target, rule) {
        //TODO: If these result in elements scaled to big/small for the layout they can cause 
        //some infinite loops in the layout logic for some widgets
        let app = App.get();
        if (rule === null) {
            return widget[target];
        }
        let value = 0;
        let ruleType = 'proportion';
        let base = 'relative';
        while(true) {
            if (rule.constructor == String) {
                let r2 = rule.slice(-2);
                if(r2 == 'ww') {
                    value = (+rule.slice(0,-2))*widget.w;
                    break;
                }
                if(r2 == 'wh') {
                    value = (+rule.slice(0,-2))*widget.h;
                    break;
                }
                if(r2 == 'aw') {
                    value = (+rule.slice(0,-2))*app.w;
                    base = 'absolute';
                    break;    
                }
                if(r2 == 'ah') {
                    value = (+rule.slice(0,-2))*app.h;
                    base = 'absolute';
                    break;        
                }
                let r1 = rule.slice(-1);
                if(r1 == 'w') {
                    value = (+rule.slice(0,-2))*this.w;
                    break;            
                }
                if(r1 == 'h') {
                    value = (+rule.slice(0,-2))*this.h;
                    break;                            
                }
                ruleType = 'numeric';
                value = (+rule);
                break;
            }
            ruleType = 'numeric';
            if(target=='w'||target=='x'||target=='center_x'||target=='right') {
                value = rule;
                break;
            }
            value = rule;
            break;
        }
        if(base=='relative'/*&& ruleType=='proportion'*/) {
            if(['x','center_x','right'].includes(target)) value+=this.x; //position is relative to parent widget unless it references App dimensions
            if(['y','center_y','bottom'].includes(target)) value+=this.y;    
        }
        return value;
    }
    applyHintMetric(widget, target, rule) {
        let app = App.get();
        if (rule === null) {
            return;
        }
        let value = 0;
        let ruleType = 'proportion';
        let base = 'relative';
        while(true) {
            if (rule.constructor == String) {
                let r2 = rule.slice(-2);
                if(r2 == 'ww') {
                    value = (+rule.slice(0,-2))*widget.w;
                    break;
                }
                if(r2 == 'wh') {
                    value = (+rule.slice(0,-2))*widget.h;
                    break;
                }
                if(r2 == 'aw') {
                    value = (+rule.slice(0,-2))*app.w;
                    base = 'absolute';
                    break;    
                }
                if(r2 == 'ah') {
                    value = (+rule.slice(0,-2))*app.h;
                    base = 'absolute';
                    break;        
                }
                let r1 = rule.slice(-1);
                if(r1 == 'w') {
                    value = (+rule.slice(0,-2))*this.w;
                    break;            
                }
                if(r1 == 'h') {
                    value = (+rule.slice(0,-2))*this.h;
                    break;                            
                }
                ruleType = 'numeric';
                value = (+rule);
                break;
            }
            ruleType = 'proportion';
            if(target=='w'||target=='x'||target=='center_x'||target=='right') {
                value = rule*this.w;
                break;
            }
            value = rule*this.h;
            break;
        }
        if(base=='relative'/*&& ruleType=='proportion'*/) {
            if(['x','center_x','right'].includes(target)) value+=this.x; //position is relative to parent widget unless it references App dimensions
            if(['y','center_y','bottom'].includes(target)) value+=this.y;    
        }
        widget[target] = value;
    }
    applyHints(c,w=null,h=null) {
        let hints = c.hints;
        if('w' in hints && hints['w'].constructor == String && hints['w'].slice(-2)=='wh') {
            if('h' in hints) this.applyHintMetric(c, 'h',hints['h']); 
            if('w' in hints) this.applyHintMetric(c, 'w',hints['w']);     
        } else {
            if('w' in hints) this.applyHintMetric(c, 'w',hints['w']);     
            if('h' in hints) this.applyHintMetric(c, 'h',hints['h']); 
        }
        for(let h in hints) {
            if(h!='w' && h!='h') this.applyHintMetric(c, h, hints[h]);
        }
    }
    layoutChildren() { //The default widget has children but does not apply a layout a la kivy FloatLayout
        if(this._layoutNotify) this.emit('layout', null);
        this._needsLayout = false;
        for(let c of this.children) {
            this.applyHints(c);
            c.layoutChildren();
        }
        //TODO: This should also handle layout of self in case the sizing is being set externally(e.g., to lock an aspect ratio)
        //If so, rename to layoutSelfAndChildren or just layout?
    }
    _draw(millis) {
        if(this.draw()=='abort') return;
        for(let c of this.children)
            c._draw(millis);
    }
    draw() {
        //Usually widget should draw itself, then draw children in order
        let r = this.rect;
        let app = App.get();
        app.ctx.beginPath();
        app.ctx.rect(r[0], r[1], r[2], r[3]);
        if(this.bgColor!=null) {
            app.ctx.fillStyle = this.bgColor;
            app.ctx.fill();    
        }
        if(this.outlineColor!=null) {
            let lw = app.ctx.lineWidth;
            app.ctx.lineWidth = 1.0/app.tileSize; //1 pixel line width
            app.ctx.strokeStyle = this.outlineColor;
            app.ctx.stroke();    
            app.ctx.lineWidth = lw;
        }
    }
    update(millis) {
        if(this._deferredProps!=null) this.deferredProperties();
        if(this._animation!=null) this._animation.update(millis);
        if(this._needsLayout) this.layoutChildren();
        for(let c of this.children) c.update(millis);
    }
}


export class Label extends Widget {
    fontSize = null;
    fontName = 'Monospace';
    text = '';
    wrap = false;
    wrapAtWord = true;
    align = 'center';
    valign = 'middle';
    color = "white";
    constructor(properties) {
        super(...arguments);
        this._textData = null;
        this.updateProperties(properties)
        }
    on_align(e,v) {
        this._needsLayout = true;
    }
    on_valign(e,v) {
        this._needsLayout = true;
    }
    on_wrap(e,v) {
        this._needsLayout = true;
    }
    on_wrapAtWord(e,v) {
        this._needsLayout = true;
    }
    on_color(e,v) {
        this._needsLayout = true;
    }
    on_text(e,v) {
        this._needsLayout = true;
    }
    on_fontSize(e,v) {
        this._needsLayout = true;
    }
    on_fontName(e,v) {
        this._needsLayout = true;
    }
    layoutChildren() {
        let app = App.get()
        super.layoutChildren();
        let fontSize = this.getMetric(this, 'fontSize', this.fontSize);
        if(this.fontSize!=null && 'h' in this.hints && this.hints['h']==null) {
            this[3] = this.wrap? sizeWrappedText(app.ctx, this.text, fontSize, this.fontName, this.align=="center", this.rect, this.color, this.wrapAtWord)[1] :
                sizeText(app.ctx, this.text, this.fontSize, this.fontName, this.align=="center", this.rect, this.color)[1]; 
        }

        fontSize = fontSize==null? this.h/2 : fontSize;
        if(this.fontSize==null && this.rect.w!=undefined) {
            let i=0;
            while(true) {
                let w, h;
                if(this.wrap) {
                    [w, h] = sizeWrappedText(app.ctx, this.text, fontSize, this.fontName, this.align=="center", this.rect, this.color, this.wrapAtWord);
                } else {
                    [w, h] = sizeText(app.ctx, this.text, fontSize, this.fontName, this.align=="center", this.rect, this.color)
                }
                if((this.h >= h ||'h' in this.hints &&this.hints['h']==null || fontSize<0.01) 
                    && (this.w >= w ||'w' in this.hints &&this.hints['w']==null)) {
                    if('h' in this.hints && this.hints['h']==null) this.h = h;
                    if('w' in this.hints && this.hints['w']==null) this.w = w;
                    break;
                }
                fontSize = this.h/(3+i);
                i++;
            }
        }
        if(this.wrap) {
            this._textData = getWrappedTextData(app.ctx, this.text, fontSize, this.fontName, this.align, this.valign, this.rect, this.color, this.wrapAtWord);
        } else {
            this._textData = getTextData(app.ctx, this.text, fontSize, this.fontName, this.align, this.valign, this.rect, this.color);
        }
    }
    draw() {
        super.draw();
        let r = this.rect;
        let ctx = App.get().ctx;
        if(this.wrap) {
            drawWrappedText(ctx, this._textData, this.color);
        } else {
            drawText(ctx, this._textData, this.color);
        }
    }
}

export class Button extends Label {
    selectColor = colorString([0.7,0.7,0.8]);
    bgColor = colorString([0.5,0.5,0.5]);
    disableColor1 = colorString([0.2,0.2,0.2])
    disableColor2 = colorString([0.4,0.4,0.4])
    disable = false;
    constructor(props) {
        super();
        this.updateProperties(props);
    }
    on_touch_down(event, touch) {
        if(!this.disable && this.collide(touch.rect)) {
            touch.grab(this);
            this._touching = true;
            return true;
        }
        return super.on_touch_down();
    }
    on_touch_up(event, touch) {
        if(touch.grabbed!=this) return;
        touch.ungrab();
        if(!this.disable && this.collide(touch.rect)) {
            this._touching = false;
            this.emit('press', null);
            return true;
        }
        return super.on_touch_up();
    }
	on_touch_move(event, touch) {
		if(touch.grabbed==this && !this.disable) {
			this._touching = this.collide(touch.rect);
		}
		return super.on_touch_move(event, touch);
	}
    draw() {
        let saved = this.bgColor;
        let saved2 = this.color;
        if(this._touching) this.bgColor = this.selectColor;
        if(this.disable) {
            this.bgColor = this.disableColor1;
            this.color = this.disableColor2;
        }
        super.draw();
        this.bgColor = saved;
        this.color = saved2;
    }
}

export class CheckBox extends Widget {
    selectColor = colorString([0.7,0.7,0.8]);
    color = colorString([0.6,0.6,0.6])
    bgColor = colorString([0.5,0.5,0.5]);
    disableColor1 = colorString([0.2,0.2,0.2])
    disableColor2 = colorString([0.3,0.3,0.3])
    disable = false;
    check = false;
    group = null;
    constructor(props) {
        super();
        this.updateProperties(props);
    }
    on_touch_down(event, touch) {
        if(!this.disable && this.collide(touch.rect)) {
            touch.grab(this);
            this._touching = true;
            return true;
        }
        return super.on_touch_down();
    }
    on_touch_up(event, touch) {
        if(touch.grabbed!=this) return;
        touch.ungrab();
        if(!this.disable && this.collide(touch.rect)) {
            this._touching = false;
            if(this.group==null) {
                this.check = !this.check;
            } else {
                for(let w of this.parent.iterByPropertyValue('group',this.group)) {
                    if(w!=this) w.check=false;    
                }
                this.check=true;
            }
//            this.emit('toggle', this.check);
            return true;
        }
        return super.on_touch_up();
    }
	on_touch_move(event, touch) {
		if(touch.grabbed==this && !this.disable) {
			this._touching = this.collide(touch.rect);
		}
		return super.on_touch_move(event, touch);
	}
    draw() {
        if(this.group!=null) {
            let r = this.rect;
            r.w = r.h = 0.5*Math.min(r.w, r.h);
            r.x = this.x+(this.w-r.w)/2;
            r.y = this.y+(this.h-r.h)/2;
    
            let ts = App.get().tileSize;
            let ctx = App.get().ctx;

            ctx.strokeStyle = this.disable? this.disableColor1 : this.bgColor;
            ctx.lineWidth = 1/ts;
            ctx.beginPath()
            ctx.arc(r.center_x, r.center_y, r.w/2,0, 2*Math.PI);
            ctx.stroke();
            if(this._touching || this.disable) {
                ctx.fillStyle = this.disable? this.disableColor1:this.selectColor;
                ctx.fill();
            }

            if(this.check) {
                ctx.fillStyle = this.disable? this.disableColor2: this.color;
                ctx.beginPath()
                ctx.arc(r.center_x, r.center_y, r.w/3,0, 2*Math.PI);
                ctx.fill();    
            }

            return;
        }
        let r = this.rect;
        r.w = r.h = 0.5*Math.min(r.w, r.h);
        r.x = this.x+(this.w-r.w)/2;
        r.y = this.y+(this.h-r.h)/2;

        let ts = App.get().tileSize;
        let ctx = App.get().ctx;

        ctx.beginPath()
        ctx.strokeStyle = this.bgColor;
        if(this.disable) {
            ctx.strokeStyle = this.disableColor1;
        }
        ctx.lineWidth = 1/ts;
        ctx.rect(...r);
        ctx.stroke();
        if(this._touching) {
            ctx.fillStyle = this.selectColor;
            ctx.fill();
        }

        if(this.check) {
            ctx.strokeStyle = this.color;
            if(this.disable) {
                ctx.strokeStyle = this.disableColor2;
            }
            ctx.beginPath();
            ctx.lineWidth = r.w/5///ts;
            ctx.moveTo(r.x,r.y);
            ctx.lineTo(r.right,r.bottom);
            ctx.moveTo(r.right,r.y);
            ctx.lineTo(r.x,r.bottom);
            ctx.stroke();    
        }
    }
}

export class Slider extends Widget {
    selectColor = colorString([0.7,0.7,0.8]);
    color = colorString([0.6,0.6,0.6])
    bgColor = colorString([0.4,0.4,0.4]);
    disableColor1 = colorString([0.2,0.2,0.2])
    disableColor2 = colorString([0.3,0.3,0.3])
    disable = false;
    min = 0.0;
    max = 1.0;
    step = null;
    orientation = 'horizontal';
    value = 0.0;
    sliderSize = 0.2; //fraction of total slider length
    constructor(props) {
        super();
        this.updateProperties(props);
    }
    setValue(touch) {
        let value=0;
        if(this.orientation=='horizontal') value = clamp((touch.rect.x-this.x-this.w*this.sliderSize/2)/(this.w*(1-this.sliderSize)),0,1);
        if(this.orientation=='vertical') value = clamp((touch.rect.y-this.y-this.h*this.sliderSize/2)/(this.h*(1-this.sliderSize)),0,1);
        value = this.min + (this.max-this.min)*value;
        if(this.step!=null) value = Math.round(value/this.step)*this.step;
        this.value = value;
    }
    on_touch_down(event, touch) {
        if(!this.disable && this.collide(touch.rect)) {
            touch.grab(this);
            this._touch = true;
            this.setValue(touch);
            return true;
        }
        return super.on_touch_down();
    }
    on_touch_up(event, touch) {
        if(touch.grabbed!=this) return;
        touch.ungrab();
        if(!this.disable && this.collide(touch.rect)) {
            this._touching = false;
            this.setValue(touch);
            return true;
        }
        return super.on_touch_up();
    }
	on_touch_move(event, touch) {
		if(touch.grabbed==this && !this.disable) {
			this._touching = this.collide(touch.rect);
            this.setValue(touch);
		}
		return super.on_touch_move(event, touch);
	}
    draw() {
        let ctx = App.get().ctx;
        let ts = App.get().tileSize;
        let r = this.rect;
        if(this.orientation=='horizontal') {
            r.w -= this.sliderSize*this.w;
            r.x += this.sliderSize/2*this.w;
            let rad = Math.min(this.sliderSize/2*this.w, this.h/2)/2
            ctx.strokeStyle = this.disable? this.disableColor1 : this.bgColor;
            ctx.beginPath();
            ctx.lineWidth = 4/ts;
            ctx.moveTo(r.x,r.center_y);
            ctx.lineTo(r.right,r.center_y);
            ctx.stroke();

            let vPos = (this.value - this.min)/(this.max-this.min)*r.w;
            ctx.strokeStyle = this.disable? this.disableColor2 : this.bgColor;
            ctx.beginPath();
            ctx.arc(r.x + vPos, r.center_y, rad,0, 2*Math.PI);
            ctx.stroke();
            ctx.fillStyle = this.color;
            if(this._touching || this.disable) {
                ctx.fillStyle = this.disable? this.disableColor1:this.selectColor;
            }
            ctx.fill();
        }
        if(this.orientation=='vertical') {
            r.h -= this.sliderSize*this.h;
            r.y += this.sliderSize/2*this.h;
            let rad = Math.min(this.sliderSize/2*this.h, this.w/2)/2
            ctx.strokeStyle = this.disable? this.disableColor1 : this.bgColor;
            ctx.beginPath();
            ctx.lineWidth = 4/ts;
            ctx.moveTo(r.center_x,r.y);
            ctx.lineTo(r.center_x,r.bottom);
            ctx.stroke();

            let vPos = (this.value - this.min)/(this.max-this.min)*r.h;
            ctx.strokeStyle = this.disable? this.disableColor2 : this.bgColor;
            ctx.beginPath();
            ctx.arc(r.center_x, r.y+vPos, rad,0, 2*Math.PI);
            ctx.stroke();
            ctx.fillStyle = this.color;
            if(this._touching || this.disable) {
                ctx.fillStyle = this.disable? this.disableColor1:this.selectColor;
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

export class TextInput extends Label {
    _activeDOMInput = null;
    disable = false;
    on_layout(event, value) {
        this.clearDOM();
    }
    on_touch_down(event, touch) {
        if(!this.disable && this.collide(touch.rect)) {
            touch.grab(this);
            this._touching = true;
            return true;
        }
        this.clearDOM();
        return super.on_touch_down();
    }
    on_touch_up(event, touch) {
        if(touch.grabbed!=this) return;
        touch.ungrab();
        if(!this.disable && this.collide(touch.rect)) {
            this._touching = false;
            this.addDOMInput();
            return true;
        }
        this.clearDOM();
        return super.on_touch_up();
    }
    clearDOM() {
        if(this._activeDOMInput!=null) {
            this.text = this._activeDOMInput.value;
            let inp = this._activeDOMInput;
            this._activeDOMInput = null;
            inp.remove();
        }
    }
    layoutChildren() {
        super.layoutChildren();
        if(this._activeDOMInput!=null) {
            let r = this.rect;
            let app = App.get();
            r.x = app.offsetX + app.shakeX + r.x*app.tileSize;
            r.y = app.offsetY + app.shakeY + r.y*app.tileSize;
            r.w *= app.tileSize;
            r.h *= app.tileSize;
            let inp = this._activeDOMInput;
            inp.style.top = (Math.floor(r.y*100)/100).toString()+'px';
            inp.style.left = (Math.floor(r.x*100)/100).toString()+'px';
            inp.style.width = (Math.floor(r.w*100)/100).toString()+'px';
            inp.style.height = (Math.floor(r.h*100)/100).toString()+'px';
        }
    }
    addDOMInput() {
        let app=App.get();
        let canvasdiv = document.getElementById('eskvapp');
        let type = this.wrap?'textarea':'input';
        let inp = document.createElement(type);
        let fs;
        let r = this.rect;
        r.x = app.offsetX + app.shakeX + r.x*app.tileSize;
        r.y = app.offsetY + app.shakeY + r.y*app.tileSize;
        r.w *= app.tileSize;
        r.h *= app.tileSize;
        let color = this.color!=null?this.color:'white';
        let bgColor = this.bgColor!=null?this.bgColor:'black';
        inp.style.color = color;
        if(type=='textarea') {
            let rows;
            if(this.fontSize!=null) {
                rows = Math.floor(1 + this.h/(this.fontsize));
            } else {
                rows = this._textData.outText.length;
            }
            inp.rows = rows;
            fs = (this.fontSize==null?r.h/(rows+1):this.fontSize*app.tileSize);
        } else {
            fs = (this.fontSize==null?r.h/2:this.fontSize*app.tileSize);
        }
        fs = (Math.floor(fs*100)/100).toString()+'px';
        inp.style.fontSize = fs;
        inp.style.backgroundColor = bgColor;
        inp.value = this.text;
        inp.style.top = (Math.floor(r.y*100)/100).toString()+'px';
        inp.style.left = (Math.floor(r.x*100)/100).toString()+'px';
        inp.style.width = (Math.floor(r.w*100)/100).toString()+'px';
        inp.style.height = (Math.floor(r.h*100)/100).toString()+'px';
        inp.style.fontFamily = this.fontName;
        this._activeDOMInput = inp;
        canvasdiv.appendChild(inp);
        inp.addEventListener("focusout", (event)=>this.clearDOM());
        inp.focus();
        inp.select();
    }
}

export class ImageWidget extends Widget {
    src = null;
    bgColor = null;
    outlineColor = null;
    lockAspect = true;
    scaleToFit = true;
    antiAlias = true;
    angle = 0;
    anchor = 'center'; //anchor for rotation
    mirror = false;
    constructor(props) {
        super();
        this.updateProperties(props);
        this.image = new Image();
        this.image.src = this.src;
    }
    draw() {
        super.draw();
        if(!this.image.complete || this.image.naturalHeight == 0) return;
        let app = App.get();
        let mirrorx = 1 - 2*this.mirror;
        let r = this.rect;
        //TODO: None of this will work quite right in a scroll view
        if(!this.scaleToFit) { 
            r.x += r.w/2 - this.image.width/2/app.tileSize;            
            r.y += r.h/2 - this.image.height/2/app.tileSize;
            r.w = this.image.width/app.tileSize;
            r.h = this.image.height/app.tileSize;
        }
        if(this.lockAspect) {
            let srcAspect = this.image.height/this.image.width;
            let dstAspect = r.h/r.w;
            let rh=r.h, rw=r.w;
            if(srcAspect<dstAspect) rh = r.w*srcAspect;
            if(srcAspect>dstAspect) rw = r.h/srcAspect;
            r.x+=r.w/2-rw/2;
            r.y+=r.h/2-rh/2;
            r.w = rw;
            r.h = rh;
        }
        app.ctx.save();
        app.ctx.imageSmoothingEnabled = this.antiAlias;
        let anchor = this.anchor;
        if(anchor == 'center') {
            anchor = [r.w/2,r.h/2];
        } else {
            anchor = [anchor[0]*r.w, anchor[1]*r.h];
        }
        app.ctx.translate(r.x + anchor[0], 
                        r.y + anchor[1]);
        if(this.angle!=0) app.ctx.rotate(this.angle);
        if(mirrorx) app.ctx.scale(-1,1);
        app.ctx.translate(-anchor[0], -anchor[1]);
        app.ctx.drawImage(
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
        app.ctx.restore();
    }
}

export class BoxLayout extends Widget {
    spacingX = 0;
    spacingY = 0;
    paddingX = 0;
    paddingY = 0;
    orientation = 'vertical';
    constructor(properties=null) {
        super();
        this.updateProperties(properties);
    }
    on_numX(event, data) {
        this._needsLayout = true;
    }
    on_numY(event, data) {
        this._needsLayout = true;
    }
    on_spacingX(event, data) {
        this._needsLayout = true;
    }
    on_spacingY(event, data) {
        this._needsLayout = true;
    }
    on_paddingX(event, data) {
        this._needsLayout = true;
    }
    on_paddingY(event, data) {
        this._needsLayout = true;
    }
    on_orientation(event, data) {
        this._needsLayout = true;
    }

    layoutChildren() {
        if(this._layoutNotify) this.emit('layout', null);
        this._needsLayout = false;
        let spacingX = this.getMetric(this, 'spacincX', this.spacingX);
        let spacingY = this.getMetric(this, 'spacincY', this.spacingY);
        let paddingX = this.getMetric(this, 'paddingX', this.paddingX);
        let paddingY = this.getMetric(this, 'paddingY', this.paddingY);
        if(this.orientation=='vertical') {
            let num = this.children.length;
            let h = this.h - spacingY*num - 2*paddingY;
            let w = this.w - 2*paddingX;
            //TODO: There should be a way to infer height of each c from height of c.children if c.hint['h']=null
            //The problem is that we only know size and not position at this point
            //so we'd probably need to split up layoutChildren into sizeChildren then placeChildren routines.
            let fixedh = 0
            for(let c of this.children) {
                this.applyHints(c,w,h);
                if('h' in c.hints) {
                    if(c.hints['h'] == null) c.layoutChildren();
                    fixedh += c.h;
                    num--;
                }
            }
            let ch = (h-fixedh)/num;
            let cw = w;
            let y = this.y+paddingY;
            let x = this.x+paddingX;
            for(let c of this.children) {
                c.y=y;
                if(!('x' in c.hints) && !('center_x' in c.hints) && !('right' in c.hints)) c.x=x;
                if(!('w' in c.hints)) c.w=cw;
                if(!('h' in c.hints)) c.h=ch;
                c.layoutChildren();
                y+=spacingY+c.h;
            }
            //TODO: should this be a separate property to control? e.g., expandToChildren
            if(num == 0 && 'h' in this.hints && this.hints['h']==null) { //height determined by children
                this[3] = y + paddingY - this.y;
                // if('center_y' in this.hints) this.center_y=this.hints['center_y']*this.parent.h;
                // if('bottom' in this.hints) this.bottom=this.hints['bottom']*this.parent.h;
            }
            return;
        }
        if(this.orientation=='horizontal') {
            let num = this.children.length;
            let h = this.h - 2*paddingY;
            let w = this.w - spacingX*num - 2*paddingX;
            let fixedw = 0
            for(let c of this.children) {
                this.applyHints(c,w,h);
                if('w' in c.hints) {
                    if(c.hints['w'] == null) c.layoutChildren();
                    fixedw += c.w;
                    num--;
                }
            }
            let ch = h;
            let cw = (w-fixedw)/num;
            let y = this.y+paddingY;
            let x = this.x+paddingX;
            for(let c of this.children) {
                c.x=x;
                if(!('y' in c.hints) && !('center_y' in c.hints) && !('bottom' in c.hints)) c.y=y;
                if(!('w' in c.hints)) c.w=cw;
                if(!('h' in c.hints)) c.h=ch;
                c.layoutChildren();
                x+=spacingX+c.w;
            }
            if(num == 0 && 'w' in this.hints && this.hints['w']==null) { //width determined by children
                this[2] = x+paddingX-this.x;
                // oldx = this.x;
                // if('x' in this.hints) this[0]=this.parent.x+this.hints['x']*this.parent.w - this.w/2;
                // if('center_x' in this.hints) this[0]=this.parent.x+this.hints['center_x']*this.parent.w - this.w/2;
                // if('right' in this.hints) this[0]=this.parent.x+this.hints['right']*this.parent.w - this.w;
                // diff = x-this.x;
            }
        }
    }
}


export class GridLayout extends Widget {
    numX = 1;
    numY = 1;
    spacingX = 0;
    spacingY = 0;
    paddingX = 0;
    paddingY = 0;
    orientation = 'horizontal';
    //TODO: Need to track column widths and row heights based on max height/width hints in each row/col
    constructor(properties) {
        super();
        this.updateProperties(properties);
    }
    on_numX() {
        this._needsLayout = true;
    }
    on_numY() {
        this._needsLayout = true;
    }
    on_spacingX() {
        this._needsLayout = true;
    }
    on_spacingY() {
        this._needsLayout = true;
    }
    on_paddingX() {
        this._needsLayout = true;
    }
    on_paddingY() {
        this._needsLayout = true;
    }
    on_orientation() {
        this._needsLayout = true;
    }
    layoutChildren() {
        if(this._layoutNotify) this.emit('layout', null);
        this._needsLayout = false;
        let spacingX = this.getMetric(this, 'spacincX', this.spacingX);
        let spacingY = this.getMetric(this, 'spacincY', this.spacingY);
        let paddingX = this.getMetric(this, 'paddingX', this.paddingX);
        let paddingY = this.getMetric(this, 'paddingY', this.paddingY);
        if(this.orientation=='horizontal') {
            let numX = this.numX;
            let numY = Math.ceil(this.children.length/this.numX);
            let h = this.h - spacingY*numY - 2*paddingY;
            let w = this.w - spacingX*numX - 2*paddingX;

            let _colWidths = new Array(numX).fill(0);
            let _rowHeights = new Array(numY).fill(0);
            let r = 0, c = 0;
            let i=0;
            for(let ch of this.children) {
                this.applyHints(ch,w,h);
                if('w' in ch.hints) _colWidths[c] = Math.max(ch.w, _colWidths[c]);
                if('h' in ch.hints) _rowHeights[r] = Math.max(ch.h, _rowHeights[r]);
                if((i+1)%numX == 0) {
                    r++;
                    c=0;
                } else {
                    c++;
                }
                i++;
            }
            let fixedW = 0, fixedH = 0;
            let nfX = 0, nfY = 0;
            for(let cw of _colWidths) {
                fixedW += cw;
                if(cw>0) nfX++;
            }
            for(let rh of _rowHeights) {
                fixedH += rh;
                if(rh>0) nfY++;
            }

            let ch = numY>nfY? (h-fixedH)/(numY-nfY): 0;
            let cw = numX>nfX? (w-fixedW)/(numX-nfX): 0;
            let y = this.y+paddingY;
            let x = this.x+paddingX;
            r = 0, c = 0;
            for(let i=0;i<this.children.length;i++) {
                let el = this.children[i];
                let cw0 = _colWidths[c]==0?cw:_colWidths[c];
                let ch0 = _rowHeights[r]==0?ch:_rowHeights[r]
                if(!('w' in el.hints)) el.w=cw0;
                if(!('h' in el.hints)) el.h=ch0;
                el.x=x;
                el.y=y;
                el.layoutChildren();
                if((i+1)%numX == 0) {
                    x = this.x + paddingX;
                    y += spacingY+ch0;
                    c = 0;
                    r++;
                } else {
                    x+=spacingX+cw0;
                    c++;
                }
            }
            return;
        } else {
            let numX = Math.ceil(this.children.length/this.numY);
            let numY = this.numY;
            let h = this.h - spacingY*numY - 2*paddingY;
            let w = this.w - spacingX*numX - 2*paddingX;

            let _colWidths = new Array(numX).fill(0);
            let _rowHeights = new Array(numY).fill(0);
            let r = 0, c = 0;
            let i=0;
            for(let ch of this.children) {
                this.applyHints(ch,w,h);
                if('w' in ch.hints) _colWidths[c] = Math.max(ch.w, _colWidths[c]);
                if('h' in ch.hints) _rowHeights[r] = Math.max(ch.h, _rowHeights[r]);
                if((i+1)%numY == 0) {
                    c++;
                    r=0;
                } else {
                    r++;
                }
                i++;
            }
            let fixedW = 0, fixedH = 0;
            let nfX = 0, nfY = 0;
            for(let cw of _colWidths) {
                fixedW += cw;
                if(cw>0) nfX++;
            }
            for(let rh of _rowHeights) {
                fixedH += rh;
                if(rh>0) nfY++;
            }

            let ch = numY>nfY? (h-fixedH)/(numY-nfY): 0;
            let cw = numX>nfX? (w-fixedW)/(numX-nfX): 0;
            let y = this.y+paddingY;
            let x = this.x+paddingX;
            r = 0, c = 0;
            for(let i=0;i<this.children.length;i++) {
                let el = this.children[i];
                let cw0 = _colWidths[c]==0?cw:_colWidths[c];
                let ch0 = _rowHeights[r]==0?ch:_rowHeights[r]
                if(!('w' in el.hints)) el.w=cw0;
                if(!('h' in el.hints)) el.h=ch0;
                el.x=x;
                el.y=y;
                el.layoutChildren();
                if((i+1)%numY == 0) {
                    y = this.y + paddingY;
                    x += spacingX+cw0;
                    r = 0;
                    c++;
                } else {
                    y+=spacingY+ch0;
                    r++;
                }
            }
        }
    }
}

export class ScrollView extends Widget {
    scrollW = true;
    scrollH = true;
    _scrollX = 0;
    _scrollY = 0;
    scrollX = 0;
    scrollY = 0;
    wAlign = 'center'; //left, center, right
    hAlign = 'top'; //top, middle, bottom
    uiZoom = true;
    zoom = 1;
    constructor(properties) {
        super();
        this.updateProperties(properties);
        this.processTouches = true;
        this.oldTouch = null;
        this.oldMouse = null;
        this._lastDist = null;
        this.scrollX = this._scrollX;
        this.scrollY = this._scrollY;
    }
    on_child_added(event, child) {
        if(this.children.length==1) {
            this.scrollX = 0;
            this.scrollY = 0;
            this._needsLayout = true;
            child.bind('rect', (event, obj, data) => this._needsLayout = true);
            child.bind('w', (event, obj, data) => this._needsLayout = true);
            child.bind('h', (event, obj, data) => this._needsLayout = true);
        }
    }
    on_child_removed(event, child) {
        if(this.children.length==0) {
            this.scrollX = 0;
            this.scrollY = 0;
            this._needsLayout = true;
        }
    }
    layoutChildren() {
        if(this._layoutNotify) this.emit('layout', null);
        this._needsLayout = false;
        this.children[0].x = 0;
        this.children[0].y = 0;
        if(!this.scrollW) this.children[0].w = this.w;
        if(!this.scrollH) this.children[0].h = this.h;
        for(let c of this.children) {
            c.layoutChildren();
        }
    }
    setZoom(zoom) {
        this.zoom = zoom;
        this.scrollX = 0;
        this.scrollY = 0;
    }
    on_uiZoom() {
        this._needsLayout = true;
    }
    on_hAlign() {
        this._needsLayout = true;
    }
    on_vAlign() {
        this._needsLayout = true;
    }
    *iter(recursive=true, inView=true) {
        yield this;
        if(!recursive) return;
        if(inView) {
            for(let c of this._children) {
                if(this.contains(c)) yield *c.iter(...arguments);
            }
        } else {
            for(let c of this._children) {
                yield *c.iter(...arguments);
            }
        }
    }
    on_scrollW(event, value) {
        this._needsLayout = true;
        this.scrollX = 0;
    }
    on_scrollH(event, value) {
        this._needsLayout = true;
        this.scrollY = 0;
    }
    on_scrollX(event, value) {
        if(this.children.length==0) return;
        this._needsLayout = true;
        let align=0;
        switch(this.wAlign) {
            case 'center':
                align = (this.children[0].w-this.w/this.zoom)/2;
                break
            case 'right':
                align = (this.children[0].w-this.w/this.zoom);
        }
        this._scrollX = this.children[0].w*this.zoom<this.w ? 
                        align : Math.min(Math.max(0, value),this.children[0].w-this.w/this.zoom);
    }
    on_scrollY(event, value) {
        if(this.children.length==0) return;
        this._needsLayout = true;
        let align=0;
        switch(this.hAlign) {
            case 'middle':
                align = (this.children[0].h-this.h/this.zoom)/2;
                break
            case 'bottom':
                align = (this.children[0].h-this.h/this.zoom);
        }
        this._scrollY = this.children[0].h*this.zoom<this.h ? 
                        align : Math.min(Math.max(0, value),this.children[0].h-this.h/this.zoom);
    }
    to_local(pos) {
        return [(pos[0]-this.x)/this.zoom+this._scrollX, (pos[1]-this.y)/this.zoom+this._scrollY];
    }
    on_touch_down(event, touch) {
        let r = touch.rect;
        this._lastDist = null;
        if(this.collide(r)) {
            let tl = touch.local(this);
            this.oldTouch = [tl.x, tl.y, tl.identifier];
            for(let c of this.children) if(c.emit(event, tl)) {
                return true;
            }
        }
        return false;
    }
    on_touch_up(event, touch) {
        this.oldTouch = null;
        this._lastDist = null;
        let r = touch.rect;
        if(this.collide(r)) {
            let tl = touch.local(this);
            for(let c of this.children) if(c.emit(event, tl)) {
                return true;
            }
        }
        return false;
    }
    on_touch_move(event, touch) {
        let r = touch.rect;
        let app = App.get();
        if(this.collide(r)) {
            let tl = touch.local(this);
            //Pan
            if(touch.nativeEvent==null || touch.nativeEvent.touches.length==1) { // || touch.nativeEvent.touches.length==2
                //TODO: If two touches, average them together to make less glitchy
                if(this.oldTouch!=null && tl.identifier==this.oldTouch[2]) {
                    if(this.scrollW) {
                        this.scrollX = (this._scrollX + (this.oldTouch[0] - tl.x));
                    }
                    if(this.scrollH) {
                        this.scrollY = (this._scrollY + (this.oldTouch[1] - tl.y));
                    }
                    //Need to recalc positions after moving scroll bars
                    tl = touch.local(this);
                    this.oldTouch = [tl.x, tl.y, tl.identifier];    
                }
            } 
            //Zoom
            if(this.uiZoom && touch.nativeEvent!=null && touch.nativeEvent.touches.length==2) {
                //TODO: still too touch trying to zoom and stay locked at corners and sides (partly because of centering when full zoomed out)
                let t0 = touch.nativeEvent.touches[0];
                let t1 = touch.nativeEvent.touches[1];
                let d = dist([t0.clientX, t0.clientY], [t1.clientX, t1.clientY]);
                if(this._lastDist != null) {
                    let pos0 = [t0.clientX, t0.clientY];
                    let pos1 = [t1.clientX, t1.clientY];
                    let pos0l = [...this.iterParents()].reverse().reduce((prev,cur)=>cur.to_local(prev), pos0);
                    let pos1l = [...this.iterParents()].reverse().reduce((prev,cur)=>cur.to_local(prev), pos1);
                    let posctr = [(pos0l[0]+pos1l[0])/2, (pos0l[1]+pos1l[1])/2];
                    let loc = this.to_local(posctr);
                    let zoom = this.zoom * d/this._lastDist;
                    let minZoom = Math.min(this.w/this.children[0].w, this.h/this.children[0].h)
                    this.zoom = Math.max(zoom, minZoom);
                    let moc = this.to_local(posctr);
                    this.scrollX = (this._scrollX + loc[0] - moc[0]);
                    this.scrollY = (this._scrollY + loc[1] - moc[1]);
                }
                this._lastDist = d;
            }
            for(let c of this.children) if(c.emit(event, tl)) return true;
        }
        return false;
    }
    on_touch_cancel(event, touch) {
        this._lastDist = null;
        let r = touch.rect;
        let tl = touch.local(this);
        for(let c of this.children) if(this.collide(r) && c.emit(event, tl)) return true;
        return false;
    }
    on_wheel(event, touch) {
        let app = App.get();
        let sx = this._scrollX;// - this.w/this.zoom/2;
        let sy = this._scrollY;// - this.h/this.zoom/2;

        let wheel = touch.nativeObject;
        if(!this.collide(touch.rect)) return;
        if(this.uiZoom && app.inputHandler.isKeyDown("Control")) {
            let loc = touch.local(this);
            let lx = loc.x;
            let ly = loc.y;
    
    
            let zoom = this.zoom / (1 + wheel.deltaY/app.h);
            let minZoom = Math.min(this.w/this.children[0].w, this.h/this.children[0].h)
            this.zoom = Math.max(zoom, minZoom);
    
            let moc = touch.local(this);
            let mx = moc.x;
            let my = moc.y;
    
            this.scrollX = (sx+lx-mx);
            this.scrollY = (sy+ly-my);    
            if(this.scrollX!=this._scrollX) this.scrollX = this._scrollX;
            if(this.scrollY!=this._scrollY) this.scrollY = this._scrollY;
        }
        else if(this.scrollW && app.inputHandler.isKeyDown("Shift")) {
            this.scrollX += this.children[0].w * (wheel.deltaY/app.w);
            if(this.scrollX!=this._scrollX) this.scrollX = this._scrollX;
        } else if(this.scrollH) {
            this.scrollY += this.children[0].h * (wheel.deltaY/app.h);
            if(this.scrollY!=this._scrollY) this.scrollY = this._scrollY;
        }

    }
    _draw() {
        this.draw();
        let r = this.rect;
        let app = App.get();
        app.ctx.save();
        app.ctx.beginPath();
        app.ctx.rect(r[0],r[1],r[2],r[3]);
        app.ctx.clip();
        app.ctx.translate(this.x-this._scrollX*this.zoom,
                        this.y-this._scrollY*this.zoom)
        app.ctx.scale(this.zoom, this.zoom);
        this.children[0]._draw()
        app.ctx.restore();
    }
}

export class ModalView extends BoxLayout {
    closeOnTouchOutside = true;
    bgColor = 'slate';
    outlineColor = 'gray';
    dim = true;
    constructor(properties=null) {
        super();
        this.updateProperties(properties);
    }
    popup() {
        if(this.parent==null) {
            let app = App.get();
            this.parent = app;
            app.addModal(this);
            return true;    
        }
        return false;
    }
    close(exitVal=0) {
        if(this.parent!=null) {
            this.emit('close',exitVal);
            let app = App.get();
            this.parent = null;
            app.removeModal(this);
            return true;
        }
        return false;
    }
    on_touch_down(event, touch) {
        if(this.closeOnTouchOutside && !this.collide(touch.rect)) {
            this.close();
            return true;
        }
        super.on_touch_down(event, touch);
    }
    draw() {
        if(this.dim) {
            let r=App.get().baseWidget.rect;
            let ctx = App.get().ctx;
            ctx.fillStyle="rgba(0,0,0,0.8)"
            console.log(r);
            ctx.rect(...r);
            ctx.fill();
            super.draw();    
        }
    }
}
