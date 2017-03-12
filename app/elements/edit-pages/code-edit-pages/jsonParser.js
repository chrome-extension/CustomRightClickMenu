"use strict";
(function () {
    function parseString(state, strChar) {
        var ch;
        var escaping = false;
        state.index++;
        var word = [];
        for (; state.index < state.str.length && (ch = state.str[state.index]); state.index++) {
            if (ch === '\n' || ch === '\t') {
                continue;
            }
            if (state.pos === state.index) {
                state.cursor = {
                    type: 'unknown',
                    value: "" + strChar + word.join(''),
                    key: false,
                    scope: state.scope.slice(0)
                };
            }
            if (ch === '\\') {
                if (escaping) {
                    word.push(ch);
                    escaping = false;
                }
                else {
                    escaping = true;
                }
            }
            else if (ch === strChar) {
                break;
            }
            else {
                word.push(ch);
            }
        }
        return "" + strChar + word.join('') + strChar;
    }
    function throwUnexpectedValueError(state) {
        state.errs.push({
            err: new Error("Unexpected " + state.str[state.index]),
            index: state.index
        });
        var firstComma = state.str.slice(state.index)
            .indexOf(',');
        if (firstComma === -1) {
            var brace = findMatchingBrace(state.str, state.index);
            state.errs.push({
                err: new Error('Missing \',\''),
                index: brace - 1
            });
            state.index = brace - 1;
        }
        else {
            state.index += firstComma + state.index - 1;
        }
    }
    function parseValue(state, key) {
        var ch;
        var type = 'none';
        var inArray = false;
        var values = [];
        var arrIndex = 0;
        state.index++;
        var unknownValue = [];
        for (; state.index < state.str.length && (ch = state.str[state.index]); state.index++) {
            if (ch === '\n' || ch === '\t') {
                continue;
            }
            if (ch === '{') {
                if (type !== 'none') {
                    throwUnexpectedValueError(state);
                    continue;
                }
                type = 'object';
                state.scope.push(key);
                var _a = parseRawObject(state.str, state.pos, state.index + 1, state.scope), options = _a.options, cursor = _a.cursor, newIndex = _a.newIndex;
                state.scope.pop();
                state.cursor = state.cursor || cursor;
                state.index = newIndex;
                if (values.length === arrIndex) {
                    values[arrIndex] = options;
                }
                else {
                    state.errs.push({
                        err: new Error('Missing \',\''),
                        index: state.index
                    });
                }
            }
            else if (ch === '[') {
                if (type !== 'none') {
                    throwUnexpectedValueError(state);
                    continue;
                }
                type = 'array';
                inArray = true;
            }
            else if (ch === ']') {
                inArray = false;
                if (type !== 'array') {
                    state.errs.push({
                        err: new Error('Unexpected ]'),
                        index: state.index
                    });
                }
            }
            else if (ch === '"' || ch === "'") {
                if (type !== 'none') {
                    throwUnexpectedValueError(state);
                    continue;
                }
                type = 'string';
                var value = parseString(state, ch);
                if (values.length === arrIndex) {
                    values[arrIndex] = value;
                }
                else {
                    state.errs.push({
                        err: new Error('Missing \',\''),
                        index: state.index
                    });
                }
            }
            else if (ch === '-') {
                if (type !== 'none') {
                    throwUnexpectedValueError(state);
                    continue;
                }
                type = 'number';
                values[arrIndex] = '-';
            }
            else if (/\d/.test(ch) || ch === '.') {
                if (type !== 'none' && type !== 'number') {
                    throwUnexpectedValueError(state);
                    continue;
                }
                type = 'number';
                values[arrIndex] = (values[arrIndex] || '') + ch;
            }
            else if (state.str.slice(state.index, 4) === 'true') {
                if (type !== 'none') {
                    throwUnexpectedValueError(state);
                    continue;
                }
                type = 'atom';
                state.index += 3;
                if (values.length === arrIndex) {
                    values[arrIndex] = true;
                }
                else {
                    state.errs.push({
                        err: new Error('Missing \',\''),
                        index: state.index
                    });
                }
            }
            else if (state.str.slice(state.index, 5) === 'false') {
                if (type !== 'none') {
                    throwUnexpectedValueError(state);
                    continue;
                }
                type = 'atom';
                state.index += 4;
                if (values.length === arrIndex) {
                    values[arrIndex] = false;
                }
                else {
                    state.errs.push({
                        err: new Error('Missing \',\''),
                        index: state.index
                    });
                }
            }
            else if (ch === '}') {
                state.index -= 1;
                break;
            }
            else if (ch === ',') {
                if (!inArray) {
                    state.index += 1;
                    break;
                }
                else {
                    arrIndex += 1;
                }
            }
            else {
                type = 'unknown';
                unknownValue.push(ch);
                if (state.errs.length > 0 &&
                    state.errs[state.errs.length - 1].err.message !== 'unknown value') {
                    state.errs.push({
                        err: new Error('unknown value'),
                        index: state.index
                    });
                }
                state.cursor = {
                    type: 'value',
                    key: key,
                    value: unknownValue.join(''),
                    scope: state.scope.slice(0)
                };
            }
        }
        if (state.cursor && state.cursor.type === 'unknown') {
            state.cursor.type = 'value';
        }
        switch (type) {
            case 'string':
            case 'atom':
                return values[0];
            case 'number':
                return parseFloat(values[0]);
            case 'array':
                return values;
            case 'object':
                return values[0];
            case 'unknown':
                return undefined;
        }
    }
    function parseLine(state) {
        var ch;
        var foundStr = null;
        var foundColon = false;
        var propValue = null;
        var partialStr = [];
        for (; state.index < state.str.length && (ch = state.str[state.index]); state.index++) {
            if (ch === '\n' || ch === '\t' || ch == ' ') {
                continue;
            }
            if (state.pos === state.index) {
                if (foundStr) {
                    if (foundColon) {
                        state.cursor = {
                            type: 'value',
                            key: foundStr,
                            value: '',
                            scope: state.scope.slice(0)
                        };
                    }
                }
                else {
                    state.cursor = {
                        type: 'key',
                        key: '',
                        scope: state.scope.slice(0)
                    };
                }
            }
            if (!foundStr && (ch === '"' || ch === "'")) {
                var value = parseString(state, ch);
                foundStr = value;
            }
            else if (ch === ':') {
                if (foundColon) {
                    state.errs.push({
                        err: new Error('Unexpected :'),
                        index: state.index
                    });
                }
                else {
                    foundColon = true;
                }
            }
            else if (foundStr && foundColon) {
                state.index -= 1;
                var value = parseValue(state, foundStr);
                propValue = value;
                break;
            }
            else if (!foundColon && /\w|\d/.test(ch)) {
                if (state.index === state.pos) {
                    state.cursor = {
                        type: 'key',
                        value: partialStr.join(''),
                        scope: state.scope.slice(0)
                    };
                }
                partialStr.push(ch);
            }
            else {
                state.errs.push({
                    err: new Error("Unexpected " + ch),
                    index: state.index
                });
            }
        }
        if (state.cursor && state.cursor.type === 'value' && state.cursor.key === false) {
            state.cursor.key = foundStr;
        }
        return {
            key: foundStr || '',
            value: propValue
        };
    }
    function findMatchingBrace(str, start) {
        var isStr = false;
        var strChar = null;
        var escape = false;
        var amount = 0;
        for (var i = start; i < str.length; i++) {
            if (str[i] === '"' || str[i] === "'") {
                if (!escape) {
                    strChar = str[i];
                    isStr = true;
                }
            }
            else if (isStr && str[i] === strChar) {
                isStr = false;
                strChar = null;
            }
            else if (str[i] === '\\') {
                escape = !escape;
            }
            else if (str[i] === '{' && !isStr) {
                amount++;
            }
            else if (str[i] === '}' && !isStr) {
                amount--;
                if (amount === -1) {
                    return i;
                }
            }
        }
        return str.length - 1;
    }
    function parseRawObject(str, pos, index, scope) {
        if (index === void 0) { index = 1; }
        if (scope === void 0) { scope = []; }
        if (pos < index || pos > str.length) {
            try {
                var section = str.slice(index - 1, findMatchingBrace(str, index));
                return {
                    options: JSON.parse(section),
                    cursor: null,
                    newIndex: index + section.length,
                    errs: []
                };
            }
            catch (e) { }
        }
        var ch;
        var obj = {};
        var state = {
            cursor: null,
            errs: [],
            index: index,
            str: str,
            pos: pos,
            scope: scope
        };
        for (; state.index < str.length && (ch = str[state.index]); state.index++) {
            if (ch === '\n' || ch === '\t') {
                continue;
            }
            if (ch === '}') {
                break;
            }
            var _a = parseLine(state), key = _a.key, value = _a.value;
            obj[key] = value;
        }
        return {
            options: obj,
            cursor: state.cursor,
            newIndex: state.index,
            errs: state.errs
        };
    }
    window.parseCodeOptions = function (file, query, fns, full) {
        var pos = fns.resolvePos(file, query.end);
        return parseRawObject(file.text, pos);
    };
    window.completionsOptions = function (query, file, fns) {
        var _a = window.parseCodeOptions(file, query, fns, false), options = _a.options, cursor = _a.cursor;
        console.log(options, cursor);
        return {
            completions: [],
            start: query.start,
            end: query.end,
            isObjectKey: cursor && cursor.type === 'key',
            isProperty: cursor && cursor.type === 'value'
        };
    };
})();
