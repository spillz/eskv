//@ts-check


export class PRNG {
    _seed = 0;
    /**
     * Generate pseudo random number between in the interval [0,1)
     * @returns {number}
     */
    random() {
        return Math.random();
    }
    /**
     * Seed the random number generator
     * @param {number} seed 
     */
    seed(seed) {
    }
    getRandomInt(m1, m2=0) {
        if(m2!=0)
            return m1 + Math.floor(this.random() * (m2-m1));
        else
            return Math.floor(this.random() * m1);
      }
    
    getRandomPos(max1, max2) {
        return [this.getRandomInt(max1), this.getRandomInt(max2)];
    }
    
    randomRange(min, max){
        return Math.floor(this.random()*(max-min+1))+min;
    }
    
    randomFloat(min=0, max=1){
        return this.random()*(max-min)+min;
    }
    
    shuffle(arr){
        let temp, r;
        for(let i = 1; i < arr.length; i++) {
            r = this.randomRange(0,i);
            temp = arr[i];
            arr[i] = arr[r];
            arr[r] = temp;
        }
        return arr;
    }
    
    choose(array) {
        return array[Math.floor(this.random() * array.length)];    
    }
    
    /**
     * Randomly choose n elements from an array without replacement
     * @template T
     * @param {Array<T>} arr 
     * @param {number} n 
     * @returns {Array<T>}
     */
    chooseN(arr, n) {
        let result = new Array(n),
            len = arr.length,
            taken = new Array(len);
        if (n > len)
            throw new RangeError("chooeN: more elements requested than available");
    
        while (n--) {
            let x = Math.floor(this.random() * len);
            result[n] = arr[x in taken ? taken[x] : x];
            taken[x] = --len in taken ? taken[len] : len;
        }
        return result;
    }
}

function sfc32(a, b, c, d) {
    return function() {
      a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0; 
      var t = (a + b) | 0;
      a = b ^ b >>> 9;
      b = c + (c << 3) | 0;
      c = (c << 21 | c >>> 11);
      d = d + 1 | 0;
      t = t + d | 0;
      c = c + t | 0;
      return (t >>> 0) / 4294967296;
    }
}

function mulberry32(a) {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

function xoshiro128ss(a, b, c, d) {
    return function() {
        var t = b << 9, r = b * 5; r = (r << 7 | r >>> 25) * 9;
        c ^= a; d ^= b;
        b ^= c; a ^= d; c ^= t;
        d = d << 11 | d >>> 21;
        return (r >>> 0) / 4294967296;
    }
}

function jsf32(a, b, c, d) {
    return function() {
        a |= 0; b |= 0; c |= 0; d |= 0;
        var t = a - (b << 27 | b >>> 5) | 0;
        a = b ^ (c << 17 | c >>> 15);
        b = c + d | 0;
        c = d + t | 0;
        d = a + t | 0;
        return (d >>> 0) / 4294967296;
    }
}

export class PRNG_sfc32 extends PRNG {
    _seed = 1;
    d = 0xDEADBEEF;
    xorSeed = Math.floor(Date.now()) ^ this.d;
    random = sfc32(0x9E3779B9, 0x243F6A88, 0xB7E15162, this.xorSeed);
    seed(seed) {
        this._seed = seed;
        this.xorSeed = seed ^ this.d; // 32-bit seed with optional XOR value
        this.random = sfc32(0x9E3779B9, 0x243F6A88, 0xB7E15162, this.xorSeed);
    }
}

export class PRNG_mulberry32 extends PRNG {
    _seed = 1;
    d = 0xDEADBEEF;
    xorSeed = Math.floor(Date.now()) ^ this.d;
    random = mulberry32(this.xorSeed);
    seed(seed) {
        this._seed = seed;
        this.xorSeed = seed ^ this.d; // 32-bit seed with optional XOR value
        this.random = mulberry32(this.xorSeed);
    }
}

export class PRNG_xoshiro128ss extends PRNG {
    _seed = 1;
    d = 0xDEADBEEF;
    xorSeed = Math.floor(Date.now()) ^ this.d;
    random = xoshiro128ss(0x9E3779B9, 0x243F6A88, 0xB7E15162, this.xorSeed);
    seed(seed) {
        this._seed = seed;
        this.xorSeed = seed ^ this.d; // 32-bit seed with optional XOR value
        this.random = xoshiro128ss(0x9E3779B9, 0x243F6A88, 0xB7E15162, this.xorSeed);
    }
}

export class PRNG_jsf32 extends PRNG {
    _seed = 1;
    d = 0xDEADBEEF;
    xorSeed = Math.floor(Date.now()) ^ this.d;
    random = jsf32(0x9E3779B9, 0x243F6A88, 0xB7E15162, this.xorSeed);
    seed(seed) {
        this._seed = seed;
        this.xorSeed = seed ^ this.d; // 32-bit seed with optional XOR value
        this.random = jsf32(0x9E3779B9, 0x243F6A88, 0xB7E15162, this.xorSeed);
    }
}

/**@type {PRNG} */
var defaultPRNG = new PRNG_sfc32();

export function getPRNGObject() {return defaultPRNG};

/**@typedef {'Math.random'|'sfc32'|'mulberry32'|'xoshiro128ss'|'jsf32'} PRNGTypes*/

/**
 * 
 * @param {PRNGTypes} name 
 */
export function setPRNG(name) {
    switch(name) {
        case 'Math.random': defaultPRNG = new PRNG(); return;
        case 'sfc32': defaultPRNG = new PRNG(); return;
        case 'mulberry32': defaultPRNG = new PRNG(); return;
        case 'xoshiro128ss': defaultPRNG = new PRNG(); return;
        case 'jsf32': defaultPRNG = new PRNG(); return;
        default: throw Error(`Unknown PRNG ${name}`);
    }
}

/**
 * Generates a pseudo-random number between zero and one using the default or active generator
 * @returns 
 */
export function random() {
    return defaultPRNG.random();
}

/**
 * Generates an integer random number between in the right open interval [m1, m2) or [0, m1) if m2 is zero.
 * @param {number} m1 
 * @param {number} m2 
 * @returns 
 */
export function getRandomInt(m1, m2=0) {
    return defaultPRNG.getRandomInt(m1, m2);
}

/**
 * Return a 2-D vector position on the right open interval [0,max1), [0,max2)
 * @param {*} max1 
 * @param {*} max2 
 * @returns 
 */
export function getRandomPos(max1, max2) {
    return defaultPRNG.getRandomPos(max1, max2);
}

/**
 * Returns an integer value betweeen on the closed interval [min, max]. 
 * @param {number} min 
 * @param {number} max 
 * @returns 
 */
export function randomRange(min, max){
    return defaultPRNG.randomRange(min, max);
}

/**
 * Returns a floating point value on the right open interval [min, max)
 * @param {*} min 
 * @param {*} max 
 * @returns 
 */
export function randomFloat(min=0, max=1){
    return defaultPRNG.randomFloat(min, max);
}

/**
 * Shuffles the array arr in place and returns a reference to it.
 * @param {Array<*>} arr 
 * @returns 
 */
export function shuffle(arr){
    return defaultPRNG.shuffle(arr);
}

/**
 * Randomly returns one item from `array`
 * @template T
 * @param {Array<T>} array 
 * @returns {T}
 */
export function choose(array) {
    return defaultPRNG.choose(array);
}

/**
 * Randomly returns `n` items without replacement from `array`
 * @template T
 * @param {Array<T>} array 
 * @returns {Array<T>}
 */
export function chooseN(array, n) {
    return defaultPRNG.chooseN(array, n);
}

export function setSeed(seed) {
    return defaultPRNG.seed(seed);
}

export function getSeed() {
    return defaultPRNG._seed;
}
