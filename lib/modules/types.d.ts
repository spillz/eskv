export type CallbackProperty<T> = (...args:any)=>T;

/**
 * Position and size hints are the preferred way to set the bounding rect of widgets usually by expressing 
 * the preferred rect coordindates as a fraction of the parent widget's dimensions. They can be set in the 
 * constructor or later during execution. It is up to the parent widget to decide whether and how to set 
 * the sizing hints. For example, vertical position hint y will be ignored in a vertical BoxLayout.
 * The type of the size hint is either an integer, representing tile units, or a string that can express various
 * ways of scaling the position and size of the rect relative to the parent size, app size or the widget size itself.
 * If you want to modify the size, you should assign a new hint to the widget rather than modify the hint properties
 * of the widget instance directly to ensure the layout is updated correctly. If you do modify the properties directly
 * then you should manually set the widget's _needLayout property to true.
 */
export declare interface WidgetSizeHints {
    /**x coordinate (left) hint for the widget */
    x?:number|string,
    /**y coordinate (top) hint for the widget */
    y?:number|string,
    /**width hint for the widget */
    w?:number|string|null,
    /**height hint for the widget */
    h?:number|string|null,
    /**horizontal center point hint for the widget */
    center_x?:number|string,
    /**vertical center point hint for the widget */
    center_y?:number|string,
    /**bottom-most position hint for the widget */
    bottom?:number|string,
    /**rightmost position hint for the widget */
    right?:number|string,
}

/**Properties passed to the Widget constructor are optional and will be set to a default
 * value if not included. You may also define additional properties other than those 
 * available in the Widget class.
 */
export declare interface WidgetProperties {
    /** User-defined properties can be defined on a widget*/
    [id:string]:any,
    /**x coordinate (left) of widget's bounding rect (usually better to set hints than to set the coordinate directly) */
    x?:number|CallbackProperty<number>,
    /**y coordinate (top) of widget's bounding rect (usually better to set hints than to set the coordinate directly) */
    y?:number|CallbackProperty<number>,
    /**width of widget's bounding rect (usually better to set hints than to set the size directly) */
    w?:number|CallbackProperty<number>,
    /**height of widget's bounding rect (usually better to set hints than to set the size directly) */
    h?:number|CallbackProperty<number>,
    /**Optional unique string identifier of the widget (can be used to `findById` from any parent widget) */
    id?:string,
    /**Fill color of the widget's bounding rect, transparent if null */
    bgColor?:string|null|CallbackProperty<string>,
    /**Color of the outline drawn around widget's bounding rect, no outline if null */
    outlineColor?:string|null|CallbackProperty<string>,
    /**Sizing hints that are used to automataically resize and/or reposition the widget as the parent's size or position changes */
    hints?:WidgetSizeHints,
    /**Array containing child Widgets (or Widget subclasses) of the Widget. You can set this in the constructor to attach children 
      *or use the addChild removeChild methods to add children later. */
    children?:Widget[],
}

export declare interface LabelProperties extends WidgetProperties {
    /**
     * Height of the text of the label in logical units. If null it will be sized to 
     * fit the Label's bounding rect. default = null */
    fontSize?: number|string|null|CallbackProperty<number|string|null>,
    /**
     * Sets the sizeGroup for the label. All labels in the same sizeGroup will have their 
     * fontSize shrunk to the smallest of all Labels that are a member of this group. 
     * default = '' (no group)*/
    sizeGroup?: string,
    /**If clip is true, the text will be clipped to the bounding rect. defaut = false. */
    clip?: boolean,
    /**
     * If ignoreSizeForGroup is true and this Label is part of a group,
     * this Label's fontSize will not be used to set the fontSize for the group (useful
     * in combination with clip to handle text that can be very long). default = false.*/
    ignoreSizeForGroup?: boolean,
    /**The text displayed in the label. */
    text?: string|CallbackProperty<string>,
    /**String name of the font (uses standard fonts available to Canvas)*/
    fontName?: string|CallbackProperty<string>,
    /**true to wrap the text to fit within the available width of the rect*/
    wrap?: boolean|CallbackProperty<string>,
    /**
     * true to wrap text at whole word boundaries otherwise wraps at character (has 
     * no effect if wrap is false)*/
    wrapAtWord?: boolean|CallbackProperty<string>,
    /**horizontal alignment of text */
    align?: 'left'|'center'|'right'|CallbackProperty<'left'|'center'|'right'>,
    /**vertical alignment of text */
    valign?: 'top'|'middle'|'bottom'|CallbackProperty<'top'|'middle'|'bottom'>,
    /**color of the text */
    color?: string|CallbackProperty<string>,
}

export declare interface ButtonProperties extends LabelProperties {
    /** background color when selected, default = colorString([0.7,0.7,0.8]);*/
    selectColor?:string,
    /** background color when disabled, default = colorString([0.2,0.2,0.2])*/
    disableColor1?:string,
    /** text color when disabled, = colorString([0.4,0.4,0.4])*/
    disableColor2?:string,
    /** disabled if true and cannot be interacted with, otherwise enabled, default = false;*/
    disable?:boolean|CallbackProperty<boolean>,
}

export declare interface CheckBoxProperties extends WidgetProperties {
    /** check color, default = colorString([0.6,0.6,0.6])*/
    color?:boolean,
    /** background color when selected, default = colorString([0.7,0.7,0.8]);*/
    selectColor?:string,
    /** background color when disabled, default = colorString([0.2,0.2,0.2])*/
    disableColor1?:string,
    /** check color when disabled, default  = colorString([0.4,0.4,0.4])*/
    disableColor2?:string,
    /**widget is disabled and cannot be interact with if true,  default = false;*/
    disable?:boolean|CallbackProperty<boolean>,
}

export declare interface ToggleButtonProperties extends WidgetProperties {
    /** check color, default = colorString([0.6,0.6,0.6])*/
    color?:boolean,
    /** background color when selected, default = colorString([0.7,0.7,0.8]);*/
    selectColor?:string,
    /** background color when disabled, default = colorString([0.2,0.2,0.2])*/
    disableColor1?:string,
    /** check color when disabled, default  = colorString([0.4,0.4,0.4])*/
    disableColor2?:string,
    /**widget is disabled and cannot be interact with if true,  default = false*/
    disable?:boolean|CallbackProperty<boolean>,
    /**press state of the button,  default = false*/
    press?:boolean|CallbackProperty<boolean>,
    /**press state of the button,  default = false*/
    group?:null|string|CallbackProperty<null|string>,
    /**if true, press state of only one widget in the group can be true, default = true*/
    singleSelect?:boolean|CallbackProperty<boolean>,
}

export declare interface SliderProperties extends WidgetProperties {
    /** Color of groove*/
    bgColor?:string,
    /** Color of slider*/
    color?:string,
    /** Color of slider when pressed/clicked*/
    selectColor?:string,
    /** Color of groove when slider disabled*/
    disableColor1?:string,
    /** Color of groove when slider enabled*/
    disableColor2?:string,
    /** Set to true to disable interaction*/
    disable?:boolean|CallbackProperty<boolean>,
    /** The position of the slider, default = 0.0;*/
    value?:number|CallbackProperty<number>,
    /** Min value of slider, default = 0.0*/
    min?:number|CallbackProperty<number>,
    /** Max value of slider, default = 1.0*/
    max?:number|null|CallbackProperty<number|null>,
    /** Max value of slider, default = 1.0*/
    curMax?:number|CallbackProperty<number>,
    /**for unbounded slider sets `curMax` equal to this multiple of the current value after each slider release*/
    unboundedStopMultiple?:number;
    /**if true, the slider operates on an exponential scale -- NOT IMPLEMENTED YET */
    exponentialSlider?:boolean;
    /**  Step increment of slider, continuous if null, default = null;*/
    step?:number|CallbackProperty<number>,
    /** Orientation of slider, default = 'horizontal';*/
    orientation?:'horizontal'|'vertical',
    /** Diameter of the slider button as a fraction of the length of slider, default = 0.2;*/
    sliderSize?:number|CallbackProperty<number>,
}

export declare interface TextInputProperties extends LabelProperties {
    /** textinput currently has the focus if true, otherwise it does not have focus*/
    focus?:boolean,
    /** when true, textinput cannot be interacted with, default = false*/
    disabled?:boolean,
}

export declare interface ImageWidgetProperties extends WidgetProperties {
    /**Relative path or full URL of the image source file. Will be loaded as an HTML Image.*/
    src?:string|null,
    /** Color drawn behind the image, transparent if null*/
    bgColor?:string|null,
    /** Color of outline drawn around the image, no outline if null*/
    outlineColor?:string|null,
    /** If true, scales the image up or down to fit the available space*/
    scaleToFit?:boolean,
    /** if true, aspect ratio of the image is locked to the original aspect ratio even if the image is scaled to fit*/
    lockAspect?:boolean,
    /** If true, antialias is applied during any scaling that occurs (set to false for blocky pixel-art style rendering)*/
    antiAlias?:boolean,
    /** Angle in degrees to rotate the image counter-clockwise, default 0*/
    angle?:number,
    /** Center of rotation, either 'center' or [x,y] coordinates, default 'center'*/
    anchor?:'center'|[number,number],
    /** Flips the image on the vertical axis if true, default false*/
    mirror?:boolean,
}

export declare interface BoxLayoutProperties extends WidgetProperties {
    /** Horizontal spacing between widgets in a horizontal orientation, default = 0*/
    spacingX?:string|number,
    /** Vertical spacing between widgets in a vertical orientation, default = 0*/
    spacingY?:string|number,
    /** Padding at left and right sides of BoxLayout, default = 0*/
    paddingX?:string|number,
    /** Padding at top and bottom sides of BoxLayout, default = 0*/
    paddingY?:string|number,
    /** Direction that child widgets are arranged in the BoxLayout, default = 'vertical'*/
    orientation?:'vertical'|'horizontal',
    /** Order that child widgets are arranged in the BoxLayout, default = 'forward'*/
    order?:'forward'|'reverse',
}

export declare interface GridLayoutProperties extends WidgetProperties {
    /** Horizontal spacing between widgets in a horizontal orientation, default = 0*/
    spacingX?:string|number,
    /** Vertical spacing between widgets in a vertical orientation, default = 0*/
    spacingY?:string|number,
    /** Padding at left and right sides of BoxLayout, default = 0*/
    paddingX?:string|number,
    /** Padding at top and bottom sides of BoxLayout, default = 0*/
    paddingY?:string|number,
    /** Direction that child widgets are arranged in the BoxLayout, default = 'vertical'*/
    orientation?:'vertical'|'horizontal',
    /** number of columns per row in horizontal orientation*/
    numX?:number,
    /** number of rows per column in vertical orientation*/
    numY?:number,
}

export declare interface ScrollViewProperties extends WidgetProperties {
    /** desired x-axis scrolling position measured from left of client area in client area units, default = 0 */
    scrollX?:number|CallbackProperty<number>,
    /** desired y-axis scrolling position measured from top of client area in client area units, default = 0 */
    scrollY?:number|CallbackProperty<number>,
    /** true if horizontal scrolling allowed, default = true */
    scrollW?:boolean|CallbackProperty<boolean>,
    /** true if vertical scrolling allowed, default = true */
    scrollH?:boolean|CallbackProperty<boolean>,
    /** how to align content horizontally if horizontal scrolling disallowed, default = 'center'*/
    wAlign?:'left'|'center'|'right',
    /*how to align content vertically if vertical scrolling disallowed, default = 'middle'*/ 
    hAlign?:'top'|'middle'|'bottom', 
    /** zooming is allowed via user input if true, default = true  */
    uiZoom?:boolean|CallbackProperty<boolean>,
    /** zoom ratio (1=no zoom, <1 zoomed out, >1 zoomed in), default = 1 */
    zoom?:number|CallbackProperty<number>,
    /** tracks velocity of kinetic scrolling action, default = null */
    vel?:Vec2|null,
    /** vel is set to zero on an axis if the absolute velocity falls below this cutoff, default = 1e-5 */
    velCutoff?:number,
    /** velocity of kinetic motion, `vel`, declines by this decay ratio every 30ms, default = 0.95 */
    velDecay?:number,
    /** if false, constrains the horizontal scrolling position to the confines of 
     * the scrollable area (size of child), default false */
    unboundedW?:boolean|CallbackProperty<boolean>;
    /** if false, constrains the vertical scrolling position to the confines of 
     * the scrollable area (size of child), default false */
    unboundedH?:boolean|CallbackProperty<boolean>;
}

export declare interface ModalViewProperties extends WidgetProperties {
    /** If true, click or touch outside the modal rect will close the modal */
    closeOnTouchOutside?:boolean,
    /** If true, darken the entire canvas behind the modal*/
    dim?:boolean,
    /**Amount of canvas dimming applied (0 = none => 1 = opaque, i.e., blacks out background), default = 0.8*/
    dimScale?:number,
}
