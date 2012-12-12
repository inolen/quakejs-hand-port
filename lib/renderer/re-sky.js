var SKY_SUBDIVISIONS      = 8;
var HALF_SKY_SUBDIVISIONS = (SKY_SUBDIVISIONS/2);

/**
 * CompileSkySurfaces
 *
 * Quake3 supports both skydomes and skyboxes for environmental
 * effects.
 *
 * Skydomes are used for the majority of maps. They are a 5 sided
 * cube with no bottom, who's texture coordinates are generated
 * by projecting the vertex positions onto a hemisphere.
 *
 * Skyboxes are a simple 6 sided cube centered around the player
 * that render a series of 6 images on all sides. These are only
 * rendered if a background image is specified in the skyParams
 * property of the sky shader.
 */
var radiusWorld = 4096;
var heightCloud = 512;

function BuildSkyBuffers() {
	var buffers  = backend.skyBuffers = {};
	var xyz      = buffers.xyz        = CreateBuffer('float32', 3, 6 * (SKY_SUBDIVISIONS+1) * (SKY_SUBDIVISIONS+1));
	var texCoord = buffers.texCoord   = CreateBuffer('float32', 2, 6 * (SKY_SUBDIVISIONS+1) * (SKY_SUBDIVISIONS+1));
	var index    = buffers.index      = CreateBuffer('uint16',  1, 6 * SKY_SUBDIVISIONS * SKY_SUBDIVISIONS * 6, true);

	var skyVec = [0, 0, 0];

	for (var i = 0; i < 6; i++) {
		var offset = xyz.elementCount;

		for (var t = 0; t <= SKY_SUBDIVISIONS; t++) {
			for (var s = 0; s <= SKY_SUBDIVISIONS; s++) {
				// Compute vector for sky side.
				MakeSkyVec((s - HALF_SKY_SUBDIVISIONS) / HALF_SKY_SUBDIVISIONS, 
						   (t - HALF_SKY_SUBDIVISIONS) / HALF_SKY_SUBDIVISIONS, 
						   i,
						   skyVec);

				// Compute parametric value 'p' that intersects with cloud layer.
				var p = (1.0 / (2 * vec3.dot(skyVec, skyVec))) *
					(-2 * skyVec[2] * radiusWorld + 
					  2 * Math.sqrt(Math.pow(skyVec[2], 2) * Math.pow(radiusWorld, 2) + 
					    2 * Math.pow(skyVec[0], 2) * radiusWorld * heightCloud +
					    Math.pow(skyVec[0], 2) * Math.pow(heightCloud, 2) + 
					    2 * Math.pow(skyVec[1], 2) * radiusWorld * heightCloud +
					    Math.pow(skyVec[1], 2) * Math.pow(heightCloud, 2) + 
					    2 * Math.pow(2, skyVec[2]) * radiusWorld * heightCloud +
					    Math.pow(skyVec[2], 2) * Math.pow(heightCloud, 2)));

				// Compute intersection point based on p.
				var v = vec3.scale(skyVec, p, [0, 0, 0]);
				v[2] += radiusWorld;

				// Compute vector from world origin to intersection point 'v'.
				vec3.normalize(v);

				// Convert the projected normal into the final s/t coordinates.
				var s1 = Math.acos(v[0]);
				var t1 = Math.acos(v[1]);

				xyz.data[xyz.offset++] = skyVec[0];
				xyz.data[xyz.offset++] = skyVec[1];
				xyz.data[xyz.offset++] = skyVec[2];

				texCoord.data[texCoord.offset++] = s1;
				texCoord.data[texCoord.offset++] = t1;
			}
		}

		// Tesselate our new surfaces.
		for (var t = 0, height = SKY_SUBDIVISIONS+1; t < height-1; t++) {
			for (var s = 0, width = SKY_SUBDIVISIONS+1; s < width-1; s++) {
				index.data[index.offset++] = offset + s + t * width;
				index.data[index.offset++] = offset + s + ( t + 1 ) * width;
				index.data[index.offset++] = offset + s + 1 + t * width;
				index.data[index.offset++] = offset + s + ( t + 1 ) * width;
				index.data[index.offset++] = offset + s + 1 + ( t + 1 ) * width;
				index.data[index.offset++] = offset + s + 1 + t * width;
			}
		}
	}

	xyz.modified = true;
	texCoord.modified = true;
	index.modified = true;
}

/**
 * MakeSkyVec
 *
 * Take in an axis from 0-5 and and s, t from -1 to 1 and output
 * XYZ coordinates for a cube of boxSize.
 */
// 1 = s, 2 = t, 3 = boxSize
var stToVec = [
	[3,-1,2],
	[-3,1,2],

	[1,3,2],
	[-1,-3,2],

	[-2,-1,3],
	[2,-1,-3]
];
var boxSize = 256;

function MakeSkyVec(s, t, axis, outXYZ) {
	var b = [
		s * boxSize,
		t * boxSize,
		boxSize
	];

	for (var i = 0; i < 3; i++) {
		var j = stToVec[axis][i];
		if (j < 0) {
			outXYZ[i] = -b[-j - 1];
		} else {
			outXYZ[i] = b[j - 1];
		}
	}
}

/**
 * StageIteratorSky
 */
function StageIteratorSky() {
	// if (backend.viewParms.isPortal) {
		return;
	// }

	var tess = backend.tess;
	var shader = tess.shader;

	// Save off the translation part of the model view matrix.
	var x = backend.or.modelMatrix[12];
	var y = backend.or.modelMatrix[13];
	var z = backend.or.modelMatrix[14];

	backend.or.modelMatrix[12] = 0;
	backend.or.modelMatrix[13] = 0;
	backend.or.modelMatrix[14] = 0;

	// Render the sky box.

	// Render the sky dome.
	tess.xyz = backend.skyBuffers.xyz;
	tess.texCoord = backend.skyBuffers.texCoord;
	tess.index = backend.skyBuffers.index;
	tess.elementCount = 0;
	tess.indexOffset = 0;

	StageIteratorGeneric();

	// Restore translation.
	backend.or.modelMatrix[12] = x;
	backend.or.modelMatrix[13] = y;
	backend.or.modelMatrix[14] = z;
}