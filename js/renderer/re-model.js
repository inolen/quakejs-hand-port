/*var Model = function () {
	this.name     = null;
	this.type     = ModelType.BAD;
	this.index    = 0;                                    // model = tr.models[model->index]
	this.dataSize = 0;                                    // just for listing purposes
	this.bmodel   = null;
	this.md3      = new Array(MD3_MAX_LOADS);
	this.numLods  = 0;
};*/

function LoadMD3 (/*model_t *mod, int lod, void *buffer, const char *mod_name*/) {
	var lod = 0;
	var mod = new Model();
	var mod_name = 'foobar';

	cl.ReadFile('models/powerups/armor/shard.md3', 'binary', function (data) {
		var bb = new ByteBuffer(data, ByteBuffer.LITTLE_ENDIAN);

		var header = new MD3Header();

		header.ident       = bb.readInt();
		header.version     = bb.readInt();

		if (header.version != MD3_VERSION) {
			console.warn('LoadMD3: ' + mod_name + ' has wrong version (' + version + ' should be ' + MD3_VERSION + ')');
			return false;
		}

		// Finish reading header.
		header.name = bb.readString(MAX_QPATH);
		header.flags = bb.readInt();
		header.numFrames = bb.readInt();
		header.numTags = bb.readInt();
		header.numSurfaces = bb.readInt();
		header.numSkins = bb.readInt();
		header.ofsFrames = bb.readInt();
		header.ofsTags = bb.readInt();
		header.ofsSurfaces = bb.readInt();
		header.ofsEnd = bb.readInt();

		if (header.numFrames < 1) {
			console.warn('LoadMD3: ' + mod_name + ' has no frames');
			return qfalse;
		}

		// 
		mod.type = ModelType.MD3;
		mod.dataSize += header.ofsEnd;

		var md3 = mod.md3[lod] = new MD3();
		md3.name = header.name;
		md3.frames = new Array(header.numFrames);
		md3.tags = new Array(header.numTags);
		md3.surfaces = new Array(header.numSurfaces);
		md3.skins = new Array(header.numSkins);

		// Read all of the frames.
		bb.index = header.ofsFrames;

		for (var i = 0; i < header.numFrames; i++) {
			var frame = md3.frames[i] = new MD3Frame();
			for (var j = 0; j < 6; j++) {
				frame.bounds[Math.floor(j/3)][j % 3] = bb.readFloat();
			}
			for (var j = 0; j < 3; j++) {
				frame.localOrigin[j] = bb.readFloat();
			}
			frame.radius = bb.readFloat();
			frame.name = bb.readString(16);
		}

		// Read all of the tags.
		bb.index = header.ofsTags;

		for (var i = 0; i < header.numTags; i++) {
			var tag = md3.tags[i] = new MD3Tag();
			tag.name = bb.readString(MAX_QPATH);
			for (var j = 0; j < 3; j++) {
				tag.origin[j] = bb.readFloat();
			}
			for (var j = 0; j < 9; j++) {
				tag.axis[Math.floor(j/3)][j % 3] = bb.readFloat();
			}
		}

		// Read all of the meshes.
		var sheader = new MD3SurfaceHeader();
		var meshOffset = bb.index = header.ofsSurfaces;

		for (var i = 0; i < header.numSurfaces; i++) {
			sheader.ident = bb.readInt();
			sheader.name = bb.readString(MAX_QPATH);
			sheader.flags = bb.readInt();
			sheader.numFrames = bb.readInt();
			sheader.numShaders = bb.readInt();
			sheader.numVerts = bb.readInt();
			sheader.numTriangles = bb.readInt();
			sheader.ofsTriangles = bb.readInt();
			sheader.ofsShaders = bb.readInt();
			sheader.ofsSt = bb.readInt();
			sheader.ofsXyzNormals = bb.readInt();
			sheader.ofsEnd = bb.readInt();

			if (sheader.numVerts > SHADER_MAX_VERTEXES) {
				console.warn('LoadMD3: ' + mod_name + ' has more than ' + SHADER_MAX_VERTEXES + ' verts on a surface (' + sheader.numVerts + ')');
				return false;
			}

			if (sheader.numTriangles * 3 > SHADER_MAX_INDEXES) {
				console.warn('LoadMD3: ' + mod_name + ' has more than ' + (SHADER_MAX_INDEXES / 3) + ' triangles on a surface (' + shead.numTriangles + ')');
				return false;
			}

			var surf = md3.surfaces[i] = new MD3Surface();
			surf.name = sheader.name.toLowerCase();

			/*// strip off a trailing _1 or _2
			// this is a crutch for q3data being a mess
			j = strlen( surf->name );
			if ( j > 2 && surf->name[j-2] == '_' ) {
				surf->name[j-2] = 0;
			}*/

			surf.shaders = new Array(sheader.numShaders);
			surf.triangles = new Array(sheader.numTriangles);
			surf.st = new Array(sheader.numVerts);
			surf.xyzNormals = new Array(sheader.numFrames * sheader.numVerts);

			// Register all the shaders.
			bb.index = meshOffset + sheader.ofsShaders;

			for (var j = 0; j < sheader.numShaders; j++) {
				var shader = surf.shaders[j] = new MD3Shader();
				shader.name = bb.readString(MAX_QPATH);
				shader.shader = FindShader(shader.name, LightmapType.NONE);
			}

			// Read all of the triangles.
			bb.index = meshOffset + shader.ofsTriangles;

			for (var j = 0; j < sheader.numTriangles; j++) {
				var tri = surf.triangles[j] = new MD3Triangle();

				for (var k = 0; k < 3; k++) {
					tri.indexes[k] = bb.readInt();
				}
			}

			// Read all of the ST coordinates.
			bb.index = meshOffset + shader.ofsSt;

			for (var j = 0; j < sheader.numVerts; j++) {
				var st = surf.st[j] = new MD3St();

				for (var k = 0; k < 2; k++) {
					st.st[k] == bb.readFloat();
				}
			}

			// Read all of the xyz normals.
			bb.index = meshOffset + sheader.ofsXyzNormals;

			for (var j = 0; j < sheader.numFrames * sheader.numVerts; j++) {
				var xyz = surf.xyzNormals[j] = new MD3XyzNormal();

				for (var k = 0; k < 3; k++) {
					xyz.xyz[k] = bb.readShort();
				}

				xyz.normal = bb.readShort();
			}

			meshOffset += sheader.ofsEnd;
		}
	});

	return true;
}
