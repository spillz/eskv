//@ts-check

import  {App, Widget, Label, Vec2, math} from '../../lib/eskv.js'; //Import ESKV objects into an eskv namespace

/**
 * The pong ESKV App.
 * In ESKV, Apps are singletons that display in a canvas, which is stretched to the 
 * browser window dimensions as much as possible. This setup is a work-in-progress that 
 * needs to be simplified and adapted to other use cases.
 * The App subclass specifies a minimum logical size in prefDimW and prefDimH properties.
 * After pong.start() is called in index.html, the actual logical size 
 * will be populated in dimW and dimH representing size of the window in the native 
 * units of the app. That will then be used to set geometry for widgets that are 
 * added to the App. There is also an associated tileSize representing the number of 
 * physical pixels per logical units. 
 */
class Pong extends App { 
    prefDimW = 20; //preferred logical width
    prefDimH = 10; //preferred logical height
    exactDimensions = true;  //prefDimW and prefDimH will be used as dimW and dimH 
                //if exactDimensions is true, otherwise one of those dimensions will be enlarged
                //to fill as much of the canvas as possible
    integerTileSize = false; //shrinks tileSize to an integer height and width if true (only useful when displaying sprites in logical unit aligned widgets)
    constructor() {
        super();
        this._baseWidget.children = [ //the app has a baseWidget derived from Widget. Every object can have children, including widget
            new Widget({w:0.5, hints:{center_x:0.5,y:0,h:1}, bgColor:'white'}), //white center line
            new Label({id:'score', score1: 0, score2: 0, hints: {center_x:0.5,y:0,w:0.25,h:0.2}, //score
                        text: (score)=>score.score1+'    '+score.score2}), //auto-binding properties!!
            new Paddle({id: 'paddle1', y:0, h:3, w:0.5, hints:{x:0}, bgColor:'red'}),  //paddle1
            new Paddle({id: 'paddle2', y:0, h:3, w:0.5, hints:{right:1}, bgColor:'blue'}), //paddle2
            new Ball({id:'ball', w:1, h:1}) //ball
        ];
    }
}

class Ball extends Widget {
    vel = new Vec2([0,0]); //velocity property
    stopped = true;
    draw() { //drawing with native 
        let ctx = App.get().ctx; //the canvas context object is saved in the ctx property. Note that App is a singleton class
        if(!ctx) return;
        ctx.fillStyle = 'yellow';
        ctx.beginPath();
        ctx.arc(this.center_x, this.center_y, this.w/2, 0, 2*Math.PI);
        ctx.fill();
    }
    update(millis) { 
        //all widgets have an update loop that you can override 
        //(rarely needed in most apps) but definitely call super
        super.update(millis);
        if(this.vel==null) {
            this.reset();
        }
        let p1 = App.get().findById('paddle1');
        let p2 = App.get().findById('paddle2');
        if(!p1 || !p2 || !this.parent) return;
        this.x += this.vel[0]*millis;
        this.y += this.vel[1]*millis;
        //deflect if hit by paddle
        if(this.collide(p1) && this.vel.x<0) {
            this.vel.x*=-1.1;
            this.vel.y = math.clamp(this.vel.y+0.01*(this.center_y-p1.center_y)/p1.h,-.01,.01);
        }
        if(this.collide(p2) && this.vel.x>0){
            this.vel.x*=-1.1;
            this.vel.y = math.clamp(this.vel.y+0.01*(this.center_y-p2.center_y)/p2.h,-.01,.01);
        }
        //bounce if hits upper or lower wall
        if(this.y<this.parent.y && this.vel.y<0 || this.vel.y>0 && this.bottom>this.parent.bottom) {
            this.vel.y*=-1;
        }
        //score player 2 and reset at left edge
        if(this.x<this.parent.x) {
            // @ts-ignore
            App.get().findById('score').score2 += 1;
            this.reset();
        }
        //score player 1 and reset at right edge
        if(this.right>this.parent.right) {
            // @ts-ignore
            App.get().findById('score').score1 += 1;
            this.reset();
        }
    }
    reset() { //set the ball in the center of the playfield with random velocity
        if(this.parent===null) return;
        this.center_x = this.parent.center_x;
        this.center_y = this.parent.center_y;
        let dx = Math.random()>0.5?Math.random()*0.5+0.5:-Math.random()*0.5-0.5
        let dy = Math.random()>0.5?Math.random()*0.25+0.25:-Math.random()*0.25-0.25
        this.vel = new Vec2([dx,dy]).scale(0.005);
    }
}

class Paddle extends Widget {
    lastTouch = null;
    on_touch_down(event, object, touch) { //Like kivy's on_touch methods, handles both mouse and touch interaction
        if(this.rect.scale(5).collide(touch.rect)) { //touch movement of the paddle is allowed anywhere in the vicinity of the paddle
            this.lastTouch = touch;
        }
        return false;
    }
    on_touch_move(event, object, touch) {
        if(this.rect.scale(5).collide(touch.rect)) {
            if(this.lastTouch!==null) {
                // @ts-ignore
                this.y += touch.y - this.lastTouch.y;
            }
            this.lastTouch = touch;
        }
        return false;
    }
}

var pong = new Pong();
pong.start();