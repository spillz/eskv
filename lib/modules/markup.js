//@ts-check

import {Widget, Label, Button, ToggleButton, BasicButton,
    TextInput, CheckBox, Slider, ImageWidget, 
    BoxLayout, GridLayout, ScrollView, ModalView} from './widgets.js';
import {App} from './app.js';

/** @typedef {Object<String, [*, String]>} WidgetClassInfo */


/**
 * For the property named in `key` returns an event callback for an on_ property, 
 * a callback with named widget ID's as arguments for a `valueStr` that accesses
 * properties of those widgets, or otherwise the evaluated value of `valueStr`.
 * @param {string} key 
 * @param {string} valueStr 
 * @param {Widget} context 
 * @param {Widget} root 
 * @returns 
 */
function evaluatedProperty(key, valueStr, context, root) {
    if (key.startsWith('on_')) { //event callback
        return new Function("parent", "root", `return function(event, object, value) {${valueStr}}`).bind(context)(context.parent, root);
    }
    if (valueStr.trim().startsWith('(') && valueStr.indexOf('=>')<valueStr.indexOf('\n')) { //function/method definition
        const func = new Function("parent", "root", `return ${valueStr}`).bind(context)(context.parent, root);
        func['markupMethod'] = true;
        return func; 
    }
    const objs = new Set();
    let objCount = 0;
    for(let m of valueStr.matchAll(/(?!\.)\b([a-z]\w*)\.([a-z_]\w*)\b/ig)) {
        const c = m[1];
        if(c!=='this' && c!=='parent' && c!=='root') objs.add(c);
        objCount++;
    }
    if(objCount===0) { //literal definition
        return new Function(`return ${valueStr};`)();
    }
    //dynamic property definition
    const objStr = [...objs].join(', ');
    const functionBody = `return function (${objStr}) { return ${valueStr} }`;
    const dynamicFunc = new Function("parent", "root", functionBody)(context.parent, root).bind(context);
    dynamicFunc['text'] = `(${objStr}) => ${valueStr}`;
    return dynamicFunc;
}
var a = function (c,d) {return c*d;}
/**
 * Appends a value to an array property (creating the array first if the value has not been initialized)
 * @param {Object} object 
 * @param {string} property 
 * @param {any} value 
 */
function appendToArrayProperty(object, property, value) {
    if(property in object) object[property].push(value);
    else object[property] = [value]
}

/**
 * Splits `str` into a string pair before and after the first matching `separator`
 * @param {string} str 
 * @param {string} separator 
 * @returns {[string, string]}
 */
    function splitFirst(str, separator) {
    const index = str.indexOf(separator);

    if (index === -1) {
        // Separator not found, return the whole string and an empty string
        return [str, ''];
    }

    const leftPart = str.substring(0, index);
    const rightPart = str.substring(index + 1);

    return [leftPart, rightPart];
}

/**
 * Retrieves a block of code nested under a property that has no right hand side definition after the ":"
 * @param {string[]} markup 
 * @param {number} lineNum 
 * @param {number} indentLevel 
 * @returns {[string, number, number]}
 */
function getCodeBlock(markup, lineNum, indentLevel) {
    const startingIndentLevel = indentLevel;
    let line = markup[lineNum];
    for(indentLevel=0;line[indentLevel]===' '&&indentLevel<line.length;indentLevel++);
    if(indentLevel<=startingIndentLevel) {
        throw Error(`Syntax error: invalid declaration on ${lineNum}\n${markup[lineNum-1]}\nDeclared object is neither a known class nor a valid property declaration`)
    }
    let code = line;
    lineNum++;
    while(indentLevel>startingIndentLevel && lineNum<markup.length) {
        line = markup[lineNum];
        for(indentLevel=0; line[indentLevel]===' ' && indentLevel<line.length; indentLevel++);    
        if(indentLevel>startingIndentLevel) {
            code += '\n' + line;
            lineNum++;
        }
    }
    return [code, lineNum, indentLevel];
}

/**
 * Parses the markup for properties and child widgets of the current object or class. 
 * Nothing gets instantiated as widgets here, just the instructions to do the instantiation. 
 * This function is called recursively on any nested child widgets found in the markup.
 * @param {string[]} markup the markup string array
 * @param {string} className the name of the new widget class
 * @param {number} lineNum the current line number
 * @param {number} indentLevel indent level of the object. All properties and children must
 * be one indent level higher.
 * @param {Object} currentObject the object being parsed
 * @return {[number, number]}
 */
function parseClassData(markup, className, lineNum, indentLevel, currentObject) {
    const startingIndentLevel = indentLevel;
    let line = markup[lineNum];
    for(indentLevel=0;line[indentLevel]===' '&&indentLevel<line.length;indentLevel++);
    if(indentLevel<=startingIndentLevel) return [lineNum, indentLevel];
    const requiredIndentLevel = indentLevel;
    while(true) {
        if (line.trim()==='' || line.trim().startsWith('#')) {
            lineNum++;
        } else if (line.includes(':')) {
            line = line.trim();
            if(line.endsWith(':')) {
                const prop = line.slice(0,line.length-1);
                if(prop in App.classes) {
                    const childObject = {cls: prop};
                    [lineNum, indentLevel] = parseClassData(markup, className, lineNum+1, indentLevel, childObject)
                    appendToArrayProperty(currentObject, 'children', childObject);    
                } else {
                    let codeBlock;
                    [codeBlock, lineNum, indentLevel] = getCodeBlock(markup, lineNum+1, indentLevel);
                    currentObject[prop] = codeBlock;
                }
            } else {
                const [key, valueStr] = splitFirst(line,':').map(item => item.trim());
                currentObject[key] = valueStr;
                lineNum++;
            }
        } else {
            throw Error(`Syntax error on line ${lineNum+1}\n${line}`)
        }
        if(lineNum>=markup.length) return [lineNum, indentLevel];
        line = markup[lineNum];
        for(indentLevel=0;line[indentLevel]===' '&&indentLevel<line.length;indentLevel++);
        if(indentLevel>requiredIndentLevel) throw Error(`Syntax error on line ${lineNum+1}\n${line}`);
        if(indentLevel<requiredIndentLevel) return [lineNum, indentLevel];
    }
}

/**
 * Returns the property data associated with the inheritance chain for object
 * @param {WidgetClassInfo} classes 
 * @param {string} clsName 
 * @param {Set<String>} usedCls 
 * @returns 
 */
function inheritanceDataChain(classes, clsName, usedCls=new Set()) {
    let chain;
    const [cls, parentCls] = classes[clsName];
    const clsData = App.rules.get(clsName);
    if(parentCls!=='' && !usedCls.has(parentCls)) {
        chain = inheritanceDataChain(classes, parentCls, usedCls);
    } else {
        chain = [];
    }
    usedCls.add(clsName);
    if(Object.keys(clsData).length>0) {
        chain.push(clsData);
    }
    return chain;
}


/**
 * Instances the properties and child objects for widget using from the class objectData
 * @param {Widget} widget 
 * @param {Object} objectData 
 * @param {Widget} rootWidget 
 */
export function instanceClassData(widget, objectData, rootWidget) {
    const props = {};
    const clsName = widget.constructor.name;
    const clsData = App.rules.get(clsName);//inheritanceDataChain(App.classes, clsName); -- TODO: Can delete commented part if we decide we really don't need inherited class props
    const merged = {...clsData, ...objectData};
    for(let p in merged) {
        const val = merged[p];
        if('children'===p && val instanceof Array) {
            const ch = [];
            for(let c of val) {
                if(c instanceof Object && 'cls' in c) {
                    const [cls, clsExtends] = App.classes[c['cls']];
                    const childWidget = new cls();
                    instanceClassData(childWidget, c, rootWidget); //Instance the object-defined properties
                    ch.push(childWidget);
                } else {
                    throw Error(`Unknown child class ${c}`);
                }
            }
            if(widget instanceof App) widget.baseWidget.children = ch;
            else widget.children = ch;
        } else if('cls'!==p) {
            props[p] = evaluatedProperty(p, val, widget, rootWidget);
        }
    }        
    widget.updateProperties(props, false);
}

/**
 * Parses a multiline string containing kvlang-style markup and returns an array of instantiated 
 * widgets objects. As a side effect the `classes` object will have any new widget 
 * classes registered and any class styling applied (affects subsequently instantiated
 * widgets).
 * TODO: Add markup syntax
 * @param {string} markup 
 */
export function parse(markup) {
    const lines = markup.split('\n');
    /** @type {Widget[]} */
    const stack = [];
    let requiredIndentLevel = 0;
    let indentLevel = 0;
    let lineNum = 0;
    while(lineNum<lines.length) {
        let line = lines[lineNum];
        if(line.trim()==='' || line.trim().startsWith('#')) {
            lineNum++;
            continue; //skip comments and blank lines
        }
        for(indentLevel=0;indentLevel<line.length && line[indentLevel]===' ';++indentLevel);
        if(indentLevel!==requiredIndentLevel) {
            throw Error(`Indentation error -- level ${indentLevel} used when ${requiredIndentLevel} expected on line # ${lineNum+1}.\n`+
                line
            );
        }
        line = line.trim();
        if (line.endsWith(':')) {
            const classType = line.replace(':', '');
            if (line.startsWith('<') && line.includes('@')) {
                const [customClass, baseClass] = classType.slice(1, -1).split('@');
                const cls = class extends App.classes[baseClass][0] {};
                const clsData = {};
                [lineNum, indentLevel] = parseClassData(lines, customClass, lineNum+1, indentLevel, clsData);
                App.classes[customClass] = [cls, baseClass];
                App.rules.add(customClass, clsData);
            } else if(line.startsWith('<')) {
                const ruledClasses = classType.slice(1, -1).split(',').map((s)=>s.trim());
                for(let rc of ruledClasses) {
                    const [cls, base] = App.classes[rc];
                    const ruleset = App.rules.get(rc);
                    [lineNum, indentLevel] = parseClassData(lines, cls, lineNum+1, indentLevel, ruleset);
                    App.rules.add(rc, ruleset);
                }
            } else {
                /**@type {Widget} */
                const widget = new App.classes[classType][0]();
                const clsData = {};
                [lineNum, indentLevel] = parseClassData(lines, classType, lineNum+1, indentLevel, clsData);
                instanceClassData(widget, clsData, widget);
                stack.push(widget);
            }
        } else {
            throw Error(`Syntax error: Invalid declation on ${lineNum}\n${line}`)
        }
    }
    return stack;
}

