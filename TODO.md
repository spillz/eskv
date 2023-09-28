ESKV Todo list
==============

 * ScrollView infinite scroll option/expandable child option (and option to snap to child).

 * Slider: support infinite bounds (scroll to a max multiple of current value, then reset the max multiple).

 * Bug: TextInput positioning in ScrollView is not synched properly (should show DOM TextInput over the text label).

 * App and Context instances should be passed to draw function. [DONE 9/27]

 * App instance should be pass as arg to update function. [DONE 9/27]

 * Add a a property to App (realTimeMode or forceRefresh) so that 
   draw/update methods only trigger as needed (on Touch/Wheel/Mouse/KB/
   Timer/Animation events). This will conserve power usage.

 * Implement widget styling.

 * Define and implement ESKV markup.

 * Look into use JavaScript's bind for the event handling wiring between widgets 
   (I would imagine it better takes advantage of JIT optimization but could be wrong).

 * Investigate DOM and WebGL as targets.