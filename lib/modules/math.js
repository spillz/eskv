//@ts-check

import {Vec2} from './geometry.js'
import * as rand from './random.js'

/**@type {(num:number, min:number, max:number)=>number} */
export const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

/**
 * 
 * @template T
 * @param {Array<T>} array1 
 * @param {Array<T>} array2 
 * @returns 
 */
export function arrEq(array1, array2) {
    return array1.length == array2.length && array1.every((value, index) => value === array2[index])
}

/**
 * Convert degrees to radians
 * @param {number} degrees 
 * @returns 
 */
export function rads(degrees) {
    return degrees*Math.PI/180
}

/**
 * 
 * @param {[number, number]} pos1 
 * @param {[number, number]} pos2 
 * @returns 
 */
export function dist(pos1, pos2) {
    return new Vec2(pos1).dist(pos2);
}

/**
 * 
 * @param {[number, number]} pos1 
 * @param {[number, number]} pos2 
 * @returns 
 */
export function adist(pos1, pos2) { 
	var dx = Math.abs(pos1 [0] - pos2 [0]);
	var dy = Math.abs(pos1 [1] - pos2 [1]);
	return Math.max(dx, dy) + 0.5 * Math.min(dx, dy);
}

/**
 * 
 * @param {number[]} vec 
 * @returns 
 */
export function colorString(vec) {
	let r,g,b;
	[r,g,b] = new MathArray(vec).scale(255).map(x=>Math.floor(x));
	return '#'+r.toString(16).padStart(2,'0')+g.toString(16).padStart(2,'0')+b.toString(16).padStart(2,'0');
}

/** 
 * Provides a standard set of mathematical operations on JavaScript arrays.
 * @extends Array<number>
*/
export class MathArray extends Array {
    constructor(...arr) {
        if(arr.length==1 && arr[0] instanceof Array) {
            super(...arr[0]);
        } else {
            super(...arr);
        }
    }
    static asRandomFloats(size,low=0,high=1) {
        let a = new MathArray(size);
        for(let i=0;i<a.length;i++) a[i] = rand.randomFloat(low, high)
        return a;
    }
    sum() {
        let s=0;
        this.forEach(el => s+=el);
        return s;
    }
    mean() {
        return this.sum()/this.length;
    }
    max() {
        return Math.max.apply(null, this);
    }
    min() {
        return Math.min.apply(null, this);
    }
    vars() { //sample variance
        let s=0;
        this.forEach(el => s+=el*el);
        return(s - this.length*this.mean()^2)/(this.length-1);
    }
    var() { //population variance
        let s=0;
        this.forEach(el => s+=el*el);
        return s/this.length - this.mean()^2;
    }
    std() { //population standard deviation
        return Math.sqrt(this.var());
    }
    /**
     * 
     * @param {number[]} arr2 
     * @returns 
     */
    add(arr2) {
        let a = new MathArray(this);
        if(arr2 instanceof Array) {
            for(let i=0;i<this.length;i++) {
                a[i] += arr2[i];
            }
        } else {
            for(let i=0;i<this.length;i++) {
                a[i]+=arr2;
            }
        }
        return a;
    }
    /**
     * Element-wise multiplication
     * @param {number[]} arr2 
     * @returns 
     */
    mul(arr2) {
        let a = new MathArray(this);
        if(arr2 instanceof Array) {
            for(let i=0;i<this.length;i++) {
                a[i] *= arr2[i];
            }
        } else {
            for(let i=0;i<this.length;i++) {
                a[i]*=arr2;
            }
        }
        return a;
    }
    /**
     * 
     * @param {number} scalar 
     */
    scale(scalar) {
        const arr = Array();
        for(let val of this) {
            arr.push(val*scalar);
        }
        return arr;
    }
    /**
     * 
     * @param {number[]} arr2 
     * @returns 
     */
    dot(arr2) {
        return this.mul(arr2).sum();
    }
    abs() {
        return Math.abs.apply(null, this);
    }
    /**
     * 
     * @param {number} k 
     * @returns 
     */
    lag(k) { //lag operator
        let a = new MathArray();
        for(let i=-k;i<this.length-k;i++) {
            if(i<0 || i>=this.length) {
                a.push(NaN);
            } else {
                a.push(this[i]);
            }
        }
        return a;
    }
    filter(func) {
        return new MathArray(super.filter(func));
    }
    dropNaN() {
        return this.filter(el => !Number.isNaN(el));
    }
}

const top = 0;
const parent = i => ((i + 1) >>> 1) - 1;
const left = i => (i << 1) + 1;
const right = i => (i + 1) << 1;

export class PriorityQueue {
    /**
     * 
     * @param {(a:number, b:number)=>boolean} comparator 
     */
  constructor(comparator = (a, b) => a > b) {
    this._heap = [];
    this._comparator = comparator;
  }
  size() {
    return this._heap.length;
  }
  isEmpty() {
    return this.size() == 0;
  }
  peek() {
    return this._heap[top];
  }
  /**
   * 
   * @param  {...number} values 
   * @returns 
   */
  push(...values) {
    values.forEach(value => {
      this._heap.push(value);
      this._siftUp();
    });
    return this.size();
  }
  pop() {
    const poppedValue = this.peek();
    const bottom = this.size() - 1;
    if (bottom > top) {
      this._swap(top, bottom);
    }
    this._heap.pop();
    this._siftDown();
    return poppedValue;
  }
  /**
   * 
   * @param {number} value 
   * @returns 
   */
  replace(value) {
    const replacedValue = this.peek();
    this._heap[top] = value;
    this._siftDown();
    return replacedValue;
  }
  _greater(i, j) {
    return this._comparator(this._heap[i], this._heap[j]);
  }
  _swap(i, j) {
    [this._heap[i], this._heap[j]] = [this._heap[j], this._heap[i]];
  }
  _siftUp() {
    let node = this.size() - 1;
    while (node > top && this._greater(node, parent(node))) {
      this._swap(node, parent(node));
      node = parent(node);
    }
  }
  _siftDown() {
    let node = top;
    while (
      (left(node) < this.size() && this._greater(left(node), node)) ||
      (right(node) < this.size() && this._greater(right(node), node))
    ) {
      let maxChild = (right(node) < this.size() && this._greater(right(node), left(node))) ? right(node) : left(node);
      this._swap(node, maxChild);
      node = maxChild;
    }
  }
}


//Dijkstra algorithm is used to find the shortest distance between two nodes inside a valid weighted graph. Often used in Google Maps, Network Router etc.

//helper class for PriorityQueue
class Node {
    constructor(val, priority) {
      this.val = val;
      this.priority = priority;
    }
  }
  
  class PriorityQueue2 {
    constructor() {
      this.values = [];
    }
    enqueue(val, priority) {
      let newNode = new Node(val, priority);
      this.values.push(newNode);
      this.bubbleUp();
    }
    bubbleUp() {
      let idx = this.values.length - 1;
      const element = this.values[idx];
      while (idx > 0) {
        let parentIdx = Math.floor((idx - 1) / 2);
        let parent = this.values[parentIdx];
        if (element.priority >= parent.priority) break;
        this.values[parentIdx] = element;
        this.values[idx] = parent;
        idx = parentIdx;
      }
    }
    dequeue() {
      const min = this.values[0];
      const end = this.values.pop();
      if (this.values.length > 0) {
        this.values[0] = end;
        this.sinkDown();
      }
      return min;
    }
    sinkDown() {
      let idx = 0;
      const length = this.values.length;
      const element = this.values[0];
      while (true) {
        let leftChildIdx = 2 * idx + 1;
        let rightChildIdx = 2 * idx + 2;
        let leftChild, rightChild;
        let swap = null;
  
        if (leftChildIdx < length) {
          leftChild = this.values[leftChildIdx];
          if (leftChild.priority < element.priority) {
            swap = leftChildIdx;
          }
        }
        if (rightChildIdx < length) {
          rightChild = this.values[rightChildIdx];
          if (
            (swap === null && rightChild.priority < element.priority) ||
            (swap !== null && rightChild.priority < leftChild.priority)
          ) {
            swap = rightChildIdx;
          }
        }
        if (swap === null) break;
        this.values[idx] = this.values[swap];
        this.values[swap] = element;
        idx = swap;
      }
    }
  }
  
  //Dijkstra's algorithm only works on a weighted graph.
  
  class WeightedGraph {
    constructor() {
      this.adjacencyList = {};
    }
    addVertex(vertex) {
      if (!this.adjacencyList[vertex]) this.adjacencyList[vertex] = [];
    }
    addEdge(vertex1, vertex2, weight) {
      this.adjacencyList[vertex1].push({ node: vertex2, weight });
      this.adjacencyList[vertex2].push({ node: vertex1, weight });
    }
    Dijkstra(start, finish) {
      const nodes = new PriorityQueue2();
      const distances = {};
      const previous = {};
      let path = []; //to return at end
      let smallest;
      //build up initial state
      for (let vertex in this.adjacencyList) {
        if (vertex === start) {
          distances[vertex] = 0;
          nodes.enqueue(vertex, 0);
        } else {
          distances[vertex] = Infinity;
          nodes.enqueue(vertex, Infinity);
        }
        previous[vertex] = null;
      }
      // as long as there is something to visit
      while (nodes.values.length) {
        smallest = nodes.dequeue().val;
        if (smallest === finish) {
          //WE ARE DONE
          //BUILD UP PATH TO RETURN AT END
          while (previous[smallest]) {
            path.push(smallest);
            smallest = previous[smallest];
          }
          break;
        }
        if (smallest || distances[smallest] !== Infinity) {
          for (let neighbor in this.adjacencyList[smallest]) {
            //find neighboring node
            let nextNode = this.adjacencyList[smallest][neighbor];
            //calculate new distance to neighboring node
            let candidate = distances[smallest] + nextNode.weight;
            let nextNeighbor = nextNode.node;
            if (candidate < distances[nextNeighbor]) {
              //updating new smallest distance to neighbor
              distances[nextNeighbor] = candidate;
              //updating previous - How we got to neighbor
              previous[nextNeighbor] = smallest;
              //enqueue in priority queue with new priority
              nodes.enqueue(nextNeighbor, candidate);
            }
          }
        }
      }
      return path.concat(smallest).reverse();
    }
  }
  