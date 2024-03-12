//@ts-check

import {Vec2, vec2, v2, Rect, Grid2D} from './modules/geometry.js';
import {EventSink, Widget, WidgetAnimation, Resource, App, 
        Label, Button, BasicButton, ToggleButton,
        CheckBox, Slider, TextInput, ImageWidget, 
        GridLayout, BoxLayout, ScrollView, ModalView, 
        Notebook, TabbedNotebook} from './modules/widgets.js';
import * as math from './modules/math.js';
import * as rand from './modules/random.js';
import * as sprites from './modules/sprites.js';
import * as text from './modules/text.js';
import * as input from './modules/input.js';
import * as color from './modules/colors.js';
import * as markup from './modules/markup.js';
import * as timer from './modules/timer.js'

        
App.registerClass('Widget', Widget, '');
App.registerClass('App',  App, '');
App.registerClass('Label', Label, '');
App.registerClass('Button', Button, '');
App.registerClass('ToggleButton', ToggleButton, '');
App.registerClass('BasicButton', BasicButton, '');
App.registerClass('TextInput', TextInput, '');
App.registerClass('CheckBox', CheckBox, '');
App.registerClass('Slider', Slider, '');
App.registerClass('ImageWidget', ImageWidget, '');
App.registerClass('BoxLayout', BoxLayout, '');
App.registerClass('GridLayout', GridLayout, '');
App.registerClass('ScrollView', ScrollView, '');
App.registerClass('ModalView', ModalView, '');
App.registerClass('Notebook', Notebook, '');
App.registerClass('TabbedNotebook', TabbedNotebook, '');
    
App.registerClass('SpriteWidget', sprites.SpriteWidget, '');
App.registerClass('TileMap', sprites.TileMap, '');
App.registerClass('LayeredTileMap', sprites.LayeredTileMap, '');


export {Vec2, vec2, v2, Rect, Grid2D, 
        App, Resource, EventSink, WidgetAnimation, 
        Widget, Label, Button, BasicButton, ToggleButton, 
        CheckBox, Slider, TextInput, ImageWidget,
        GridLayout, BoxLayout, ScrollView, ModalView,
        Notebook, TabbedNotebook,
        math, rand, markup, sprites, text, input, color, timer};
