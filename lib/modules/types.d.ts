export type CallbackProperty<T> = (...args:any)=>T;

export declare interface WidgetSizeHints {
    /**x coordinate hint for the widget */
    x?:number|string,
    /**y coordinate hint for the widget */
    y?:number|string,
    /**width hint for the widget */
    w?:number|string,
    /**height hint for the widget */
    h?:number|string,
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
    /**x coordinate of widget's bounding rect (usually better to set hints than to set coordinate directly) */
    x?:number|CallbackProperty<number>,
    /**y coordinate of widget's bounding rect (usually better to set hints than to set coordinate directly) */
    y?:number|CallbackProperty<number>,
    /**width of widget's bounding rect (usually better to set hints than to set size directly) */
    w?:number|CallbackProperty<number>,
    /**height of widget's bounding rect (usually better to set hints than to set size directly) */
    h?:number|CallbackProperty<number>,
    /**Optional unique string identifier of the widget (can be used to `findById` from any parent widget) */
    id?:string,
    /**Fill color of the widget's bounding rect, transparent if null */
    bgColor?:string|null|CallbackProperty<string>,
    /**Color of the outline drawn around widget's bounding rect, no outline if null */
    outlineColor?:string|null|CallbackProperty<string>,
    /**Sizing hints that are used to automataically resize and/or reposition the widget as the parent's size or position changes */
    hints?:WidgetSizeHints,
    /**Array containing child Widgets (or Widget subclasses) of the Widget. You can set this in the construct to attach children immediately. */
    children?:Widget[],
    [id:string]:any,
}

export declare interface LabelProperties extends WidgetProperties {
    /**Height of the text of the label in logical units. If null it will be sized to fit the Label's bounding rect. */
    fontSize?: number|string|null,
    /**The text displayed in the label. */
    text?: string|CallbackProperty<string>,
    /**String name of the font (uses standard fonts available to Canvas)*/
    fontName?: string,
    /**true to wrap the text to fit within the available widgth*/
    wrap?: boolean,
    /**true to wrap text at whole word boundaries but has no effect if wrap is false*/
    wrapAtWord?: boolean,
    /**horizontal alignment of text */
    align?: 'left'|'center'|'right',
    /**vertical alignment of text */
    valign?: 'top'|'middle'|'bottom',
    /**color of the text */
    color?: string,
}

export declare interface ButtonProperties extends LabelProperties {
    /** background color when selected, default = colorString([0.7,0.7,0.8]);*/
    selectColor?:string,
    /** = colorString([0.2,0.2,0.2])*/
    disableColor1?:string,
    /** = colorString([0.4,0.4,0.4])*/
    disableColor2?:string,
    /** = false;*/
    disable?:string,
}

export declare interface CheckBoxProperties extends WidgetProperties {
    /** check color, default = colorString([0.6,0.6,0.6])*/
    color?:boolean,
    /** background color when selected, default = colorString([0.7,0.7,0.8]);*/
    selectColor?:string,
    /** = colorString([0.2,0.2,0.2])*/
    disableColor1?:string,
    /** = colorString([0.4,0.4,0.4])*/
    disableColor2?:string,
    /** = false;*/
    disable?:string,
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
    disable?:string,
    /** The position of the slider, default = 0.0;*/
    value?:number|CallbackProperty<number>,
    /** Min value of slider*/
    min?:number|CallbackProperty<number>,
    /** Max value of slider*/
    max?:number|CallbackProperty<number>,
    /**  Step increment of slider, continuous if null, default = null;*/
    step?:number|CallbackProperty<number>,
    /** Orientation of slider, default = 'horizontal';*/
    orientation?:'horizontal'|'vertical',
    /** Diameter of the slider button as a fraction of the length of slider, default = 0.2;*/
    sliderSize?:number|CallbackProperty<number>,
}

export declare interface TextInputProperties extends LabelProperties {
    /** when true, textinput current has the focus, otherwise it does not have focus*/
    focus?:boolean,
    /** when true, textinput cannot be interacted with, default = false*/
    disabled?:boolean,
}

export declare interface ImageWidgetProperties extends WidgetProperties {
    /**Path or URL of the image source file*/
    src?:string|null,
    /** Color drawn behind the image or tranparent if null*/
    bgColor?:string|null,
    /** Color of outline drawn around the image or no outline if null*/
    outlineColor?:string|null,
    /** If true, scales the image up or down to fit the available space*/
    scaleToFit?:boolean,
    /** if true, aspect ratio of the image is locked to the original aspect ratio even if the image is scaled to fit*/
    lockAspect?:boolean,
    /** If true, antialias is applied during any scaling that occurs (set the to false for blocky pixel art rendering)*/
    antiAlias?:boolean,
    /** Angle in degrees to rotate the image counter-clockwise*/
    angle?:number,
    /** Center of rotation, either the center or x-y coordinates*/
    anchor?:'center'|[number,number],
    /** Flip the image on the vertical axis if true*/
    mirror?:boolean,
}

export declare interface BoxLayoutProperties extends WidgetProperties {
    /** Horizontal spacing between widgets in a horizontal orientation default = 0*/
    spacingX?:string|number,
    /** Vertical spacing between widgets in a vertical orientation default = 0*/
    spacingY?:string|number,
    /** Padding at left and right sides of BoxLayout default = 0*/
    paddingX?:string|number,
    /** Padding at top and bottom sides of BoxLayout default = 0*/
    paddingY?:string|number,
    /** Direction that child widgets are arranged in the BoxLayout, default = 'vertical'*/
    orientation?:'vertical'|'horizontal',
}

export declare interface GridLayoutProperties extends WidgetProperties {
    /** Horizontal spacing between widgets in a horizontal orientation default = 0*/
    spacingX?:string|number,
    /** Vertical spacing between widgets in a vertical orientation default = 0*/
    spacingY?:string|number,
    /** Padding at left and right sides of BoxLayout default = 0*/
    paddingX?:string|number,
    /** Padding at top and bottom sides of BoxLayout default = 0*/
    paddingY?:string|number,
    /** Direction that child widgets are arranged in the BoxLayout, default = 'vertical'*/
    orientation?:'vertical'|'horizontal',
    /** number of columns per row in horizontal orientation*/
    numX?:number,
    /** number of rows per column in vertical orientation*/
    numY?:number,
}

export declare interface ScrollViewProperties extends WidgetProperties {
    /** = 0  desired x-axis scrolling position measured from left of client area in client area units */
    scrollX?:number,
    /** = 0  desired y-axis scrolling position measured from top of client area in client area units */
    scrollY?:number,
    /** = true  true if horizontal scrolling allowed */
    scrollW?:boolean,
    /** = true  true if vertical scrolling allowed */
    scrollH?:boolean,
    /** = 'center'  how to align content horizontally if horizontal scrolling disallowed  //left, center, right*/
    wAlign?:'left'|'center'|'right',
    /*how to align content vertically if vertical scrolling disallowed*/ 
    hAlign:'top'|'middle'|'bottom', 
    /** = true  zooming allowing via user input if true (pinch to zoom) */
    uiZoom?:boolean,
    /** = 1  zoom ratio (1=no zoom, <1 zoomed out, >1 zoomed in) */
    zoom?:number,
    /** = null  tracks velocity of kinetic scrolling action */
    vel?:Vec2|null,
    /** = 1e-5  vel is set to zero on an axis if the absolute velocity falls below this cutoff */
    velCutoff?:number,
    /** = 0.95  velocity of kinetic motion, `vel`, declines by this decay ratio every 30ms */
    velDecay?:number,
}

export declare interface ModalViewProperties extends WidgetProperties {
    /** If true, click or touch outside the modal rect will close the modal */
    closeOnTouchOutside:boolean,
    /** If true, darken the entire canvas behind the modal*/
    dim:boolean,
    /**Amount of canvas dimming applied (0=none => 1=opaque black)*/
    dimScale:number,
}
