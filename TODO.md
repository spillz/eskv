ESKV Todo list
==============

 * Implement widget styling [mostly done, just verify it can be used effectively]

 * Look into use JavaScript's bind and event system for the event handling wiring between widgets 
   (I would imagine it better takes advantage of JIT optimization but could be wrong).

 * Investigate DOM and WebGL as targets. See https://stackoverflow.com/questions/40923507/is-there-a-way-to-get-webgl-to-render-offscreen-without-the-webgl-canvas-attach

    ```js
    var gl = document.createElement("canvas").getContext("webgl");
    gl.clearColor(1,0,1,1); // purple;
    gl.clear(gl.COLOR_BUFFER_BIT);

    // draw in 2d canvas
    var ctx = document.querySelector("#c2d").getContext("2d");
    ctx.drawImage(gl.canvas, 10, 20, 30, 40);
    ```

    ```html
    <canvas id="c2d"></canvas>
    ```

 * ScrollView: two finger scrolling

 * Keyboard: keyPress/keyRelease as alternative to keyDown

 * Focus bugs on itch

 * Migrate remaining snake_case to camelCase except for on_ event handlers

 * Layout bugs with some combos of ScrollView/BoxLayout/GridLayout/Layout/Button/SpriteWidget

 * Sprite-based Widgets need more layout options to fill assigned canvas space

 * Use something more intuitive with child-determined size hint than "null"

 * Integrate efficient pathfinding and line of sight algos into TileMap

    - Priority queue for Dijkstra -- do this as a class extending Array

      ```js
        /* MinHeap:
        * A collection of functions that operate on an array 
        * of [key,...data] elements (nodes).
        */
        const MinHeap = { 
            /* siftDown:
            * The node at the given index of the given heap is sifted down in  
            * its subtree until it does not have a child with a lesser value. 
            */
            siftDown(arr, i=0, value=arr[i]) {
                if (i < arr.length) {
                    let key = value[0]; // Grab the value to compare with
                    while (true) {
                        // Choose the child with the least value
                        let j = i*2+1;
                        if (j+1 < arr.length && arr[j][0] > arr[j+1][0]) j++;
                        // If no child has lesser value, then we've found the spot!
                        if (j >= arr.length || key <= arr[j][0]) break;
                        // Copy the selected child node one level up...
                        arr[i] = arr[j];
                        // ...and consider the child slot for putting our sifted node
                        i = j;
                    }
                    arr[i] = value; // Place the sifted node at the found spot
                }
            },
            /* heapify:
            * The given array is reordered in-place so that it becomes a valid heap.
            * Elements in the given array must have a [0] property (e.g. arrays). 
            * That [0] value serves as the key to establish the heap order. The rest 
            * of such an element is just payload. It also returns the heap.
            */
            heapify(arr) {
                // Establish heap with an incremental, bottom-up process
                for (let i = arr.length>>1; i--; ) this.siftDown(arr, i);
                return arr;
            },
            /* pop:
            * Extracts the root of the given heap, and returns it (the subarray).
            * Returns undefined if the heap is empty
            */
            pop(arr) {
                // Pop the last leaf from the given heap, and exchange it with its root
                return this.exchange(arr, arr.pop()); // Returns the old root
            },
            /* exchange:
            * Replaces the root node of the given heap with the given node, and 
            * returns the previous root. Returns the given node if the heap is empty.
            * This is similar to a call of pop and push, but is more efficient.
            */
            exchange(arr, value) {
                if (!arr.length) return value;
                // Get the root node, so to return it later
                let oldValue = arr[0];
                // Inject the replacing node using the sift-down process
                this.siftDown(arr, 0, value);
                return oldValue;
            },
            /* push:
            * Inserts the given node into the given heap. It returns the heap.
            */
            push(arr, value) {
                // First assume the insertion spot is at the very end (as a leaf)
                let key = value[0],
                    i = arr.length,
                    j;
                // Then follow the path to the root, moving values down for as long 
                // as they are greater than the value to be inserted
                while ((j = (i-1)>>1) >= 0 && key < arr[j][0]) {
                    arr[i] = arr[j];
                    i = j;
                }
                // Found the insertion spot
                arr[i] = value;
                return arr;
            }
        };

        // Simple Demo:

        let heap = [];
        MinHeap.push(heap, [26, "Helen"]);
        MinHeap.push(heap, [15, "Mike"]);
        MinHeap.push(heap, [20, "Samantha"]);
        MinHeap.push(heap, [21, "Timothy"]);
        MinHeap.push(heap, [19, "Patricia"]);

        let [age, name] = MinHeap.pop(heap);
        console.log(`${name} is the youngest with ${age} years`);
        ([age, name] = MinHeap.pop(heap));
        console.log(`Next is ${name} with ${age} years`);
      ```

Completed
=========

 * TileMap and SpriteWiget: [DONE 3/15/24]

 * Define and implement ESKV markup. [DONE 12/31/23 ish]

  * ScrollView infinite scroll option/expandable child option (and option to snap to child). [DONE 9/29/23]

 * Slider: support infinite bounds (scroll to a max multiple of current value, then reset the max multiple). [DONE 9/29/23]

 * Bug: TextInput positioning in ScrollView is not synched properly (should show DOM TextInput over the text label). [DONE 9/28/23, could be improved]

 * Implement matrix transforms [DONE 9/28/23]

 * App and Context instances should be passed to draw function. [DONE 9/27/23]

 * App instance should be pass as arg to update function. [DONE 9/27/23]

 * Add a a property to App (realTimeMode or forceRefresh) so that 
   draw/update methods only trigger as needed (on Touch/Wheel/Mouse/KB/
   Timer/Animation events). This will conserve power usage. [DONE 9/29/23]

