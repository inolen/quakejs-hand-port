/*
 * js-struct.js - Utility to assist in parsing c-style structs from an ArrayBuffer
 */

/*
 * Copyright (c) 2011 Brandon Jones
 *
 * This software is provided 'as-is', without any express or implied
 * warranty. In no event will the authors be held liable for any damages
 * arising from the use of this software.
 *
 * Permission is granted to anyone to use this software for any purpose,
 * including commercial applications, and to alter it and redistribute it
 * freely, subject to the following restrictions:
 *
 *    1. The origin of this software must not be misrepresented; you must not
 *    claim that you wrote the original software. If you use this software
 *    in a product, an acknowledgment in the product documentation would be
 *    appreciated but is not required.
 *
 *    2. Altered source versions must be plainly marked as such, and must not
 *    be misrepresented as being the original software.
 *
 *    3. This notice may not be removed or altered from any source
 *    distribution.
 */

"use strict";

// TODO: Ugh, this is messy. Do it differentely soon, please!
var nextStructId = 0;

function templatizeSetterCode(code, offset, value) {
    code = code.replace(/\$view/g, "v");
    code = code.replace(/\$offset/g, offset);
    code = code.replace(/\$value/g, value);
    return code;
}

var Struct = Object.create(Object, {
    /**
    * Defines a single byte integer value (byte/char).
    * @param name Property name
    */
    int8: {
        value: function(name) {
            return {
                name: name,
                byteLength: 1,
                defaultValue: 0,
                structProperty: true,
                readCode: "$value = $view.getInt8($offset, true);",
                writeCode: "$view.setInt8($offset, $value, true);"
            };
        }
    },

    /**
    * Defines an unsigned single byte integer value (ubyte/uchar).
    * @param name Property name
    */
    uint8: {
        value: function(name) {
            return {
                name: name,
                byteLength: 1,
                defaultValue: 0,
                structProperty: true,
                readCode: "$value = $view.getUint8($offset, true);",
                writeCode: "$view.setUint8($offset, $value, true);"
            };
        }
    },

    /**
    * Defines a two byte integer value (short).
    * @param name Property name
    */
    int16: {
        value: function(name) {
            return {
                name: name,
                byteLength: 2,
                defaultValue: 0,
                structProperty: true,
                readCode: "$value = $view.getInt16($offset, true);",
                writeCode: "$view.setInt16($offset, $value, true);"
            };
        }
    },

    /**
    * Defines an unsigned two byte integer value (ushort).
    * @param name Property name
    */
    uint16: {
        value: function(name) {
            return {
                name: name,
                byteLength: 2,
                defaultValue: 0,
                structProperty: true,
                readCode: "$value = $view.getUint16($offset, true);",
                writeCode: "$view.setUint16($offset, $value, true);"
            };
        }
    },

    /**
    * Defines a four byte integer value (int/long).
    * @param name Property name
    */
    int32: {
        value: function(name) {
            return {
                name: name,
                byteLength: 4,
                defaultValue: 0,
                structProperty: true,
                readCode: "$value = $view.getInt32($offset, true);",
                writeCode: "$view.setInt32($offset, $value, true);"
            };
        }
    },

    /**
    * Defines an unsigned four byte integer value (uint/ulong).
    * @param name Property name
    */
    uint32: {
        value: function(name) {
            return {
                name: name,
                byteLength: 4,
                defaultValue: 0,
                structProperty: true,
                readCode: "$value = $view.getUint32($offset, true);",
                writeCode: "$view.setUint32($offset, $value, true);"
            };
        }
    },

    /**
    * Defines a four byte floating point value (float).
    * @param name Property name
    */
    float32: {
        value: function(name) {
            return {
                name: name,
                byteLength: 4,
                defaultValue: 0,
                structProperty: true,
                readCode: "$value = $view.getFloat32($offset, true);",
                writeCode: "$view.setFloat32($offset, $value, true);"
            };
        }
    },

    /**
    * Defines an eight byte floating point value (double).
    * @param name Property name
    */
    float64: {
        value: function(name) {
            return {
                name: name,
                byteLength: 8,
                defaultValue: 0,
                structProperty: true,
                readCode: "$value = $view.getFloat64($offset, true);",
                writeCode: "$view.setFloat64($offset, $value, true);"
            };
        }
    },

    /**
    * Defines a fixed-length ASCII string.
    * Will always read the number of characters specified, but the returned string will truncate at the first null char.
    * @param name Property name
    * @param length Number of characters to read
    */
    string: {
        value: function(name, length) {
            var readCode = "$value = \"\";\n";
            readCode += "for(var j = 0; j < " + length + "; ++j) {\n";
            readCode += "  var char = $view.getUint8($offset+j, true);\n";
            readCode += "  if (char === 0) { break; }\n";
            readCode += "  $value += String.fromCharCode(char);\n";
            readCode += "}";

            var writeCode = "for(var j = 0; j < " + length + "; ++j) {\n";
            writeCode += "  $view.setUint8($offset+j, $value.charCodeAt(j), true);\n";
            writeCode += "}";

            return {
                name: name,
                readCode: readCode,
                writeCode: writeCode,
                byteLength: length,
                defaultValue: "",
                structProperty: true
            };
        }
    },

    /**
    * Defines a fixed-length array of structs or primitives
    * @param name Property name
    * @param type struct or primitive type to read
    * @param length Number of elements to read. Total bytes read will be type.byteLength * length
    */
    array: {
        value: function(name, type, length) {
            var readCode = "(function (o) {\n";
            readCode += "  $value = new Array(" + length + ");\n";
            readCode += "  for(var j = 0; j < " + length + "; ++j) {\n";
            readCode += templatizeSetterCode(type.readCode, "o", "$value[j]");
            readCode += "o += " + type.byteLength + ";\n";
            readCode += "  }\n";
            readCode += "})($offset);";

            var writeCode = "(function (o) {\n";
            writeCode += "  for(var j = 0; j < " + length + "; ++j) {\n";
            writeCode += templatizeSetterCode(type.writeCode, "o", "$value[j]");
            writeCode += "o += " + type.byteLength + ";\n";
            writeCode += "  }\n";
            writeCode += "})($offset);";

            return {
                name: name,
                readCode: readCode,
                writeCode: writeCode,
                byteLength: type.byteLength * length,
                defaultValue: null,
                array: true,
                structProperty: true
            };
        }
    },

    /**
    * Defines a nested struct
    * @param name Property name
    * @param struct Struct to read
    */
    struct: {
        value: function(name, struct) {
            return {
                name: name,
                readCode: struct.readCode,
                writeCode: struct.writeCode,
                byteLength: struct.byteLength,
                defaultValue: null,
                struct: true,
                structProperty: true
            };
        }
    },

    /**
    * Defines a number of the bytes to be skipped over.
    * @param length Number of bytes to be skipped
    */
    skip: {
        value: function(length) {
            return {
                name: null,
                readCode: "null;\n",
                byteLength: length,
                structProperty: true
            };
        }
    },

    /**
    * Compiles the code to read a struct from the struct's definition
    * @param structDef Object sequentially defining the binary types to read
    * @param prototype Optional, additional prototypes to apply to the returned struct object
    * @returns An object containing a "readStructs" function that can read an array of the defined type from an ArrayBuffer
    */
    create: {
        value: function(/* collected via arguments */) {
            var properties = arguments[arguments.length-1].structProperty ? {} : arguments[arguments.length-1];
            var struct = Object.create(Object.prototype, properties);

            // This new struct will be assigned a unique name so that instances can be easily constructed later.
            // It is not recommended that you use these names for anything outside this class, as they are not
            // intended to be stable from run to run.
            Object.defineProperty(struct, "struct_type_id", { value: "struct_id_" + nextStructId, enumerable: false, configurable: false, writable: false });
            Object.defineProperty(this, struct.struct_type_id, { value: struct, enumerable: false, configurable: false, writable: false });
            nextStructId += 1;

            // Add the types passed in to the new struct object.
            var types = [];
            for (var i = 0; i < arguments.length; i++) {
                var type = arguments[i];
                if (!type.name || !type.structProperty) {
                    continue;
                }
                Object.defineProperty(struct, type.name, { value: type.defaultValue, enumerable: true, configurable: true, writable: true });
                types.push(type);
            }

            // Calculate the total length of this struct.
            var byteLength = 0;
            for(var i = 0; i < types.length; i++) {
                byteLength += types[i].byteLength;
            }

            // Build the code to deserialize a single struct, calculate byte lengths, and define struct properties
            var readCode = "$value = Object.create(Struct." + struct.struct_type_id + ");\n";
            for (var i = 0, oo = 0; i < types.length; i++) {
                var type = types[i];
                readCode += templatizeSetterCode(type.readCode, "$offset + " + oo, "$value." + type.name) + "\n";
                oo += type.byteLength;
            }

            var readFnCode =  "var a = new Array(count);\n";
            readFnCode += "var v = new DataView(buffer, offset);\n"; // TODO: I should be able to specify a length here (count * this.byteLength), but it consistently gives me an INDEX_SIZE_ERR. Wonder why?
            readFnCode += "for(var i = 0, o = 0; i < count; ++i) {\n";
            readFnCode += templatizeSetterCode(readCode, "o", "a[i]") + "\n";
            readFnCode += "if(callback) { callback(a[i], offset+o); }\n";
            readFnCode += "o += " + byteLength + ";\n";
            readFnCode += "}\n";
            readFnCode += "return a;\n";

            // Build the code to serialize a single struct.
            var writeCode = "";
            for(var i = 0, oo = 0; i < types.length; i++) {
                var type = types[i];
                writeCode += templatizeSetterCode(type.writeCode, "$offset + " + oo, "$value." + type.name) + "\n";
                oo += type.byteLength;
            }

            var writeFnCode = "var buffer = new ArrayBuffer(" + byteLength + ");\n";
            writeFnCode += "var v = new DataView(buffer);\n";
            writeFnCode += "var self = this;\n"
            writeFnCode += templatizeSetterCode(writeCode, 0, "self") + "\n";
            writeFnCode += "return buffer;\n";

            Object.defineProperty(struct, "byteLength", { value: byteLength, enumerable: true, configurable: true, writable: true });
            Object.defineProperty(struct, "readCode", { value: readCode, enumerable: true, configurable: true, writable: true });
            Object.defineProperty(struct, "writeCode", { value: writeCode, enumerable: true, configurable: true, writable: true });

            var deserializeFn = new Function("buffer", "offset", "count", "callback", readFnCode);
            Object.defineProperty(struct, "deserialize", { value: deserializeFn, configurable: true, writable: true });

            var serializeFn = new Function(writeFnCode);
            Object.defineProperty(struct, "serialize", { value: serializeFn, configurable: true, writable: true });

            return struct;
        }
    },

    //
    // Utility functions to read simple arrays of data from a buffer
    //

    /**
    * Read an ASCII string from an ArrayBuffer
    * @param buffer Buffer to read from
    * @param offset Offset in bytes to start reading at
    * @param length Optional, number of characters to read. If not given will read until a NULL char is reached
    */
    readString: {
        value: function(buffer, offset, length) {
            var str = "", charBuffer;

            // Hm... any way I can do this?
            //var str = String.fromCharCode.apply(charBuffer);

            if(length) {
                charBuffer = new Uint8Array(buffer, offset, length);

                for(var i = 0; i < length; ++i) {
                    var char = charBuffer[i];
                    if(char === 0) { break; }
                    str += String.fromCharCode(char);
                }
            } else {
                charBuffer = new Uint8Array(buffer, offset);

                var i = 0;
                while(true) {
                    var char = charBuffer[i++];
                    if(char === 0) { break; }
                    str += String.fromCharCode(char);
                }
            }
            return str;
        }
    },

    // I wonder if there's a more efficent way to do these that doesn't run afoul the offset restrictions of TypedArrays

    /**
    * Read an array of 8 bit integers
    * @param buffer Buffer to read from
    * @param offset Offset in bytes to start reading at
    * @param elements Number of integers to read
    */
    readInt8Array: {
        value: function(buffer, offset, elements) {
            var array = new Int8Array(elements);
            var v = new DataView(buffer, offset);
            for(var i = 0; i < elements; ++i) {
                array[i] = v.getInt8(i, true);
            }
            return array;
        }
    },

    /**
    * Read an array of 8 bit unsigned integers
    * @param buffer Buffer to read from
    * @param offset Offset in bytes to start reading at
    * @param elements Number of integers to read
    */
    readUint8Array: {
        value: function(buffer, offset, elements) {
            var array = new Uint8Array(elements);
            var v = new DataView(buffer, offset);
            for(var i = 0; i < elements; ++i) {
                array[i] = v.getUint8(i, true);
            }
            return array;
        }
    },

    /**
    * Read an array of 16 bit integers
    * @param buffer Buffer to read from
    * @param offset Offset in bytes to start reading at
    * @param elements Number of integers to read
    */
    readInt16Array: {
        value: function(buffer, offset, elements) {
            var array = new Int16Array(elements);
            var v = new DataView(buffer, offset);
            for(var i = 0; i < elements; ++i) {
                array[i] = v.getInt16(i*2, true);
            }
            return array;
        }
    },

    /**
    * Read an array of 16 bit unsigned integers
    * @param buffer Buffer to read from
    * @param offset Offset in bytes to start reading at
    * @param elements Number of integers to read
    */
    readUint16Array: {
        value: function(buffer, offset, elements) {
            var array = new Uint16Array(elements);
            var v = new DataView(buffer, offset);
            for(var i = 0; i < elements; ++i) {
                array[i] = v.getUint16(i*2, true);
            }
            return array;
        }
    },

    /**
    * Read an array of 32 bit integers
    * @param buffer Buffer to read from
    * @param offset Offset in bytes to start reading at
    * @param elements Number of integers to read
    */
    readInt32Array: {
        value: function(buffer, offset, elements) {
            var array = new Int32Array(elements);
            var v = new DataView(buffer, offset);
            for(var i = 0; i < elements; ++i) {
                array[i] = v.getInt32(i*4, true);
            }
            return array;
        }
    },

    /**
    * Read an array of 32 bit unsigned integers
    * @param buffer Buffer to read from
    * @param offset Offset in bytes to start reading at
    * @param elements Number of integers to read
    */
    readUint32Array: {
        value: function(buffer, offset, elements) {
            var array = new Uint32Array(elements);
            var v = new DataView(buffer, offset);
            for(var i = 0; i < elements; ++i) {
                array[i] = v.getUint32(i*4, true);
            }
            return array;
        }
    },

    /**
    * Read an array of 32 bit floats
    * @param buffer Buffer to read from
    * @param offset Offset in bytes to start reading at
    * @param elements Number of floats to read
    */
    readFloat32Array: {
        value: function(buffer, offset, elements) {
            var array = new Float32Array(elements);
            var v = new DataView(buffer, offset);
            for(var i = 0; i < elements; ++i) {
                array[i] = v.getFloat32(i*4, true);
            }
            return array;
        }
    },

    /**
    * Read an array of 64 bit floats
    * @param buffer Buffer to read from
    * @param offset Offset in bytes to start reading at
    * @param elements Number of floats to read
    */
    readFloat64Array: {
        value: function(buffer, offset, elements) {
            var array = new Float64Array(elements);
            var v = new DataView(buffer, offset);
            for(var i = 0; i < elements; ++i) {
                array[i] = v.getFloat64(i*8, true);
            }
            return array;
        }
    },
});