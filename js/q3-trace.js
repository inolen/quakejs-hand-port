/*
 * q3bsp.js - Parses Quake 3 Maps (.bsp) for use in WebGL
 */

/*
 * Copyright (c) 2009 Brandon Jones
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


//
// BSP Tree Collision Detection
//
var q3bsptree_trace_offset = 0.03125;

var Q3Trace = {};

Q3Trace._traceNode = function(bsp, nodeIdx, startFraction, endFraction, start, end, radius, output) {
    var brushes = bsp.data.brushes,
        leaves = bsp.data.leaves,
        leafBrushes = bsp.data.leafBrushes,
        nodes = bsp.data.nodes,
        planes = bsp.data.planes,
        shaders = bsp.data.shaders;

    if (nodeIdx < 0) { // Leaf node?
        var leaf = leaves[-(nodeIdx + 1)];
        for (var i = 0; i < leaf.leafBrushCount; i++) {
            var brush = brushes[leafBrushes[leaf.leafBrush + i]];
            var shader = shaders[brush.shader];
            if (brush.brushSideCount > 0 && shader.contents & 1) {
                Q3Trace._traceBrush(bsp, brush, start, end, radius, output);
            }
        }
        return;
    }

    // Tree node
    var node = nodes[nodeIdx];
    var plane = planes[node.plane];

    var startDist = vec3.dot(plane.normal, start) - plane.distance;
    var endDist = vec3.dot(plane.normal, end) - plane.distance;

    if (startDist >= radius && endDist >= radius) {
        Q3Trace._traceNode(bsp, node.children[0], startFraction, endFraction, start, end, radius, output );
    } else if (startDist < -radius && endDist < -radius) {
        Q3Trace._traceNode(bsp, node.children[1], startFraction, endFraction, start, end, radius, output );
    } else {
        var side;
        var fraction1, fraction2, middleFraction;
        var middle = [0, 0, 0];

        if (startDist < endDist) {
            side = 1; // back
            var iDist = 1 / (startDist - endDist);
            fraction1 = (startDist - radius + q3bsptree_trace_offset) * iDist;
            fraction2 = (startDist + radius + q3bsptree_trace_offset) * iDist;
        } else if (startDist > endDist) {
            side = 0; // front
            var iDist = 1 / (startDist - endDist);
            fraction1 = (startDist + radius + q3bsptree_trace_offset) * iDist;
            fraction2 = (startDist - radius - q3bsptree_trace_offset) * iDist;
        } else {
            side = 0; // front
            fraction1 = 1;
            fraction2 = 0;
        }

        if (fraction1 < 0) fraction1 = 0;
        else if (fraction1 > 1) fraction1 = 1;
        if (fraction2 < 0) fraction2 = 0;
        else if (fraction2 > 1) fraction2 = 1;

        middleFraction = startFraction + (endFraction - startFraction) * fraction1;

        for (var i = 0; i < 3; i++) {
            middle[i] = start[i] + fraction1 * (end[i] - start[i]);
        }

        Q3Trace._traceNode(bsp, node.children[side], startFraction, middleFraction, start, middle, radius, output );

        middleFraction = startFraction + (endFraction - startFraction) * fraction2;

        for (var i = 0; i < 3; i++) {
            middle[i] = start[i] + fraction2 * (end[i] - start[i]);
        }

        Q3Trace._traceNode(bsp, node.children[side===0?1:0], middleFraction, endFraction, middle, end, radius, output );
    }
};

Q3Trace._traceBrush = function(bsp, brush, start, end, radius, output) {
    var startFraction = -1;
    var endFraction = 1;
    var startsOut = false;
    var endsOut = false;
    var collisionPlane = null;
    var brushSides = bsp.data.brushSides,
        planes = bsp.data.planes;

    for (var i = 0; i < brush.brushSideCount; i++) {
        var brushSide = brushSides[brush.brushSide + i];
        var plane = planes[brushSide.plane];

        var startDist = vec3.dot( start, plane.normal ) - (plane.distance + radius);
        var endDist = vec3.dot( end, plane.normal ) - (plane.distance + radius);

        if (startDist > 0) startsOut = true;
        if (endDist > 0) endsOut = true;

        // make sure the trace isn't completely on one side of the brush
        if (startDist > 0 && endDist > 0) { return; }
        if (startDist <= 0 && endDist <= 0) { continue; }

        if (startDist > endDist) { // line is entering into the brush
            var fraction = (startDist - q3bsptree_trace_offset) / (startDist - endDist);
            if (fraction > startFraction) {
                startFraction = fraction;
                collisionPlane = plane;
            }
        } else { // line is leaving the brush
            var fraction = (startDist + q3bsptree_trace_offset) / (startDist - endDist);
            if (fraction < endFraction)
                endFraction = fraction;
        }
    }

    if (startsOut === false) {
        output.startSolid = true;
        if (endsOut === false)
            output.allSolid = true;
        return;
    }

    if (startFraction < endFraction) {
        if (startFraction > -1 && startFraction < output.fraction) {
            output.plane = collisionPlane;
            if (startFraction < 0)
                startFraction = 0;
            output.fraction = startFraction;
        }
    }

    return;
};

Q3Trace.trace = function(bsp, start, end, radius) {
    var output = {
        allSolid: false,
        startSolid: false,
        fraction: 1.0,
        endPos: end,
        plane: null
    };

    if(!radius) { radius = 0; }

    Q3Trace._traceNode(bsp, 0, 0, 1, start, end, radius, output);

    if(output.fraction != 1.0) { // collided with something
        for (var i = 0; i < 3; i++) {
            output.endPos[i] = start[i] + output.fraction * (end[i] - start[i]);
        }
    }

    return output;
};