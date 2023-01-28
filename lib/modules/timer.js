export class Timer {
    constructor(time, elapsed=0, callback=null) {
        this.elapsed = 0; //elapsed time on timer
        this.timer = time; //time when timer will be triggered
        this.triggered = false; //true on the frame when the elapsed exceeds the timer
        this.callback = callback;
        if(elapsed>0) {
            this.tick(elapsed);
        }
    }
    finished() {
        return this.elapsed>=this.timer;
    }
    tick(millis) {
        if(this.elapsed>=this.timer) {
            if(this.triggered) this.triggered = false; // No longer show a triggered state
            return false;
        }
        this.elapsed+=millis;
        if(this.elapsed>=this.timer) {
            if(this.callback != null) this.callback('timer', this);
            this.triggered = true;
            return true;
        }
        return false;
    }
    reset(time=-1, elapsed=0) {
        this.elapsed=elapsed;
        this.triggered = false;
        if(time>=0) this.timer=time;
    }
}

export class IndefiniteTimer {
    constructor() {
        this.elapsed = 0;
    }
    tick(millis) {
        this.elapsed+=millis;
        return this.elapsed;
    }
    reset(elapsed=0) {
        this.elapsed = elapsed;
    }
}
