//@ts-check

/**
 * Timer object that optionally triggers callbacks after a certain amount of time has elapsed
 * Updated discretely during the update loop of the ESKV App object.
 */
export class Timer {
    /**
     * Construst a new timer object that will trigger when the elapsed time exceeds the timer value
     * @param {number} time time until the timer will trigger
     * @param {number} initElapsed initial elapsed time 
     * @param {null|((event:string, timer:Timer)=>void)} callback callback function called when timer is triggered
     */
    constructor(time, initElapsed=0, callback=null) {
        /** @type {number} elapsed time on timer */
        this.elapsed = 0;
        /** @type {number} time when timer will be triggered */
        this.timer = time; 
        /** @type {boolean} true on the frame when the elapsed exceeds the timer */
        this.triggered = false; 
        /** @type {null|((event:string, timer:Timer)=>void)} Callback function called when timer triggers*/
        this.callback = callback;
        if(initElapsed>0) {
            this.tick(initElapsed);
        }
    }
    /**
     * Return true if timer has finished, i.e., elapsed time exceeds timer.
     * @returns {boolean}
     */
    finished() {
        return this.elapsed>=this.timer;
    }
    /**
     * Called to update the timer, i.e., adds millis to the timer.
     * The App will call this during it's update loop for timers added with App.addTimer
     * @param {number} millis amount of time to increment the timer 
     * @returns {boolean} true if the timer was triggered this tick. 
     */
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
    /**
     * Reset the timer
     * @param {number} time - amount of time in ms to set the timer for (negative values leaves current time) 
     * @param {number} initElapsed - initial amount of elapsed time
     */
    reset(time=-1, initElapsed=0) {
        this.triggered = false;
        if(time>=0) this.timer=time;
        if(initElapsed>0) {
            this.tick(initElapsed);
        }
    }
}

/**
 * Indefinite timer is updated discretely with each timer tick. It does not trigger a callback
 * and instead must be checked manually
 */
export class IndefiniteTimer {
    /**
     * Constusct and indefinite timer with an initial amount of elapsed time.
     * The timer counts up.
     * @param {number} elapsed 
     */
    constructor(elapsed = 0) {
        /**@type {number} Time elapsed since timer began */
        this.elapsed = 0;
    }
    /**
     * Advanced the timer manually by adding millis milliseconds to elapsed.
     * @param {*} millis 
     * @returns 
     */
    tick(millis) {
        this.elapsed+=millis;
        return this.elapsed;
    }
    /**
     * Reset the timer.
     * @param {number} elapsed initial value to set the timer to. 
     */
    reset(elapsed=0) {
        this.elapsed = elapsed;
    }
}
