var skyVerts = [
	-128, 128, 128, 0, 0,
	128, 128, 128, 1, 0,
	-128, -128, 128, 0, 1,
	128, -128, 128, 1, 1,

	-128, 128, 128, 0, 1,
	128, 128, 128, 1, 1,
	-128, 128, -128, 0, 0,
	128, 128, -128, 1, 0,

	-128, -128, 128, 0, 0,
	128, -128, 128, 1, 0,
	-128, -128, -128, 0, 1,
	128, -128, -128, 1, 1,

	128, 128, 128, 0, 0,
	128, -128, 128, 0, 1,
	128, 128, -128, 1, 0,
	128, -128, -128, 1, 1,

	-128, 128, 128, 1, 0,
	-128, -128, 128, 1, 1,
	-128, 128, -128, 0, 0,
	-128, -128, -128, 0, 1
];

var skyIndices = [
	0, 1, 2,
	1, 2, 3,

	4, 5, 6,
	5, 6, 7,

	8, 9, 10,
	9, 10, 11,

	12, 13, 14,
	13, 14, 15,

	16, 17, 18,
	17, 18, 19
];

/**
 * BuildSkyboxBuffers
 */
function BuildSkyboxBuffers() {
	var buffers  = backend.skyBuffers = {};
	var xyz      = buffers.xyz        = CreateBuffer('float32', 3, 20);
	var texCoord = buffers.texCoord   = CreateBuffer('float32', 2, 20);
	var index    = buffers.index      = CreateBuffer('uint16',  1, skyIndices.length, true);

	for (var i = 0; i < skyVerts.length; i += 5) {
		xyz.data[xyz.offset++] = skyVerts[i+0];
		xyz.data[xyz.offset++] = skyVerts[i+1];
		xyz.data[xyz.offset++] = skyVerts[i+2];

		texCoord.data[texCoord.offset++] = skyVerts[i+3];
		texCoord.data[texCoord.offset++] = skyVerts[i+4];
	}

	for (var i = 0; i < skyIndices.length; i++) {
		index.data[index.offset++] = skyIndices[i];
	}

	xyz.modified = true;
	texCoord.modified = true;
	index.modified = true;
}

/**
 * StageIteratorSky
 */
function StageIteratorSky() {
	var tess = backend.tess;
	var shader = tess.shader;

	var a = backend.or.modelMatrix[12];
	var b = backend.or.modelMatrix[13];
	var c = backend.or.modelMatrix[14];

	backend.or.modelMatrix[12] = 0;
	backend.or.modelMatrix[13] = 0;
	backend.or.modelMatrix[14] = 0;

	SetShader(shader);

	BindBuffer(backend.skyBuffers.index);

	for (var i = 0; i < shader.stages.length; i++) {
		var stage = shader.stages[i];

		SetShaderStage(shader, stage);

		// Bind buffers for shader attributes.
		BindBuffer(backend.skyBuffers.xyz, stage.program.attrib.xyz);
		BindBuffer(backend.skyBuffers.texCoord, stage.program.attrib.texCoord);
		BindBuffer(tess.color, stage.program.attrib.color);

		gl.drawElements(shader.mode, backend.skyBuffers.index.elementCount, gl.UNSIGNED_SHORT, 0);
	}

	backend.or.modelMatrix[12] = a;
	backend.or.modelMatrix[13] = b;
	backend.or.modelMatrix[14] = c;
}