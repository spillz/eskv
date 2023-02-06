export class Vec2 extends Array {
    constructor(vec){
        super();
        this[0] = vec[0];
        this[1] = vec[1];
    }
    static random(vec) {
        return new Vec2(getRandomPos(vec[0],vec[1]));
    }
    add(vec) {
        return new Vec2([this[0]+vec[0],this[1]+vec[1]]);
    }
    scale(scalar) {
        return new Vec2([this[0]*scalar,this[1]*scalar]);
    }
    mul(vec) {
        return new Vec2([this[0]*vec[0],this[1]*vec[1]]);
    }
    dot(vec) {
        return this[0]*vec[0]+this[1]*vec[1];
    }
    dist(vec) {
        return Math.hypot(this[0]-vec[0],this[1]-vec[1]);
    }
    abs(vec) {
        return new Vec2([Math.abs(this[0]),Math.abs(this[1])]);
    }
    sum(vec) {
        return this[0] + this[1];
    }
    set x(val) {
        this[0] = val;
    }
    set y(val) {
        this[1] = val;
    }
    get x() {
        return this[0];
    }
    get y() {
        return this[1];
    }
}

export class Rect extends Array {
    constructor(rect=null){
        super();
        if(rect==null) {
            this[0] = 0;
            this[1] = 0;
            this[2] = 0;
            this[3] = 0;
            return;
        }
        this[0] = rect[0];
        this[1] = rect[1];
        this[2] = rect[2];
        this[3] = rect[3];
    }
    set x(val) {
        this[0] = val;
    }
    set y(val) {
        this[1] = val;
    }
    set w(val) {
        this[2] = val;
    }
    set h(val) {
        this[3] = val;
    }
    set pos(vec) {
        this[0] = vec[0];
        this[1] = vec[1];
    }
    get pos() {
        return new Vec2([this[0],this[1]]);
    }
    get x() {
        return this[0];
    }
    get y() {
        return this[1];
    }
    get w() {
        return this[2];
    }
    get h() {
        return this[3];
    }
    get right() {
        return this[0]+this[2];        
    }    
    get bottom() {
        return this[1]+this[3];
    }    
    get center_x() {
        return this[0]+this[2]/2;        
    }
    get center_y() {
        return this[1]+this[3]/2;        
    }
    get center() {
        return new Vec2(this.center_x, this.center_y);
    }
    shift(pos) {
        return new Rect([this.x+pos[0],this.y+pos[1],this.w,this.h]);
    }
    shrinkBorders(value) {
        return new Rect([this.x+value, this.y+value, this.w-value*2, this.h-value*2]);
    }
    scaleBorders(scale) {
        return new Rect([this.x+this.w*(1-scale)/2, this.y+this.h*(1-scale)/2, this.w*scale, this.h*scale]);
    }
    mult(scalar) {
        return new Rect([
            this[0]*scalar,
            this[1]*scalar,
            this[2]*scalar,
            this[3]*scalar,
        ])        
    }
    multXY(vec) {
        return new Rect([
            this[0]*vec[0],
            this[1]*vec[1],
            this[2]*vec[0],
            this[3]*vec[1],
        ])        
    }
    scale(scalar, centered=true) {
        if(centered){
            let news = [this[2]*scalar, this[3]*scalar];
            return new Rect([
                    this[0] + 0.5*(this[2]-news[0]), 
                    this[1] + 0.5*(this[3]-news[1]),
                    news[0],
                    news[1]
                ]);
        } else {
            let news = [this[2]*scalar, this[3]*scalar];
            return new Rect([
                    this[0],
                    this[1],
                    news[0],
                    news[1]
                ]);

        }
    }
    collide(rect) {
        if(this.x < rect.x + rect.w &&
            this.x + this.w > rect.x &&
            this.y < rect.y + rect.h &&
            this.h + this.y > rect.y)
            return true;
        return false;
    }
    contains(rect) {
        return this.x <= rect.x && this.y<= rect.y && this.x+this.w>=rect.x+rect.w && this.y+this.h>=rect.y+rect.h;
    }
    contact(rect) {
        if(this.x <= rect.x + rect.w &&
            this.x + this.w >= rect.x &&
            this.y <= rect.y + rect.h &&
            this.h + this.y >= rect.y)
            return true;
        return false;
    }
}

