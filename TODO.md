ESKV Todo list
==============

 * ScrollView infinite scroll option/expandable child option (and option to snap to child). [DONE 9/29/23]

 * Slider: support infinite bounds (scroll to a max multiple of current value, then reset the max multiple). [DONE 9/29/23]

 * Bug: TextInput positioning in ScrollView is not synched properly (should show DOM TextInput over the text label). [DONE 9/28/23, could be improved]

 * Implement matrix transforms [DONE 9/28/23]

 * App and Context instances should be passed to draw function. [DONE 9/27/23]

 * App instance should be pass as arg to update function. [DONE 9/27/23]

 * Add a a property to App (realTimeMode or forceRefresh) so that 
   draw/update methods only trigger as needed (on Touch/Wheel/Mouse/KB/
   Timer/Animation events). This will conserve power usage. [DONE 9/29/23]

 * Implement widget styling.

 * Define and implement ESKV markup.

 * Look into use JavaScript's bind for the event handling wiring between widgets 
   (I would imagine it better takes advantage of JIT optimization but could be wrong).

 * Investigate DOM and WebGL as targets.