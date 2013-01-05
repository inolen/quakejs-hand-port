/**
 * LoadWorld
 *
 * Take the canonical world data and convert to optimized
 * renderer specific structures.
 */
function LoadWorld(world) {
	re.world = new RenderWorld();

	re.world.shaders = world.shaders;
	re.world.numClusters = world.numClusters;
	re.world.clusterBytes = world.clusterBytes;
	re.world.vis = world.vis;

	// Load certain data into more appropriate structures.
	LoadNodesAndLeafs(world.nodes, world.leafs, world.leafSurfaces, world.planes);
	LoadBrushModels(world.bmodels);
	LoadSurfaces(world.surfaces, world.verts, world.indexes);
	LoadLightmaps(world.lightmaps);
	LoadLightGrid(world.lightGridOrigin,
		world.lightGridSize,
		world.lightGridInverseSize,
		world.lightGridBounds,
		world.lightGridData);

	// Create static render surfaces.
	BatchWorldSurfaces();
	BuildSkyBuffers();
}

/**
 * ColorShiftLightingBytes
 */
function ColorShiftLightingBytes(color, offset) {
	if (typeof(offset) === 'undefined') {
		offset = 0;
	}

	// Shift the color data based on overbright range.
	var shift = r_mapOverBrightBits() - re.overbrightBits;

	var r = color[offset+0] << shift;
	var g = color[offset+1] << shift;
	var b = color[offset+2] << shift;

	// Normalize by color instead of saturating to white.
	if ((r | g | b) > 255) {
		var max = r > g ? r : g;
		max = max > b ? max : b;
		r = r * 255 / max;
		g = g * 255 / max;
		b = b * 255 / max;
	}

	color[offset+0] = r;
	color[offset+1] = g;
	color[offset+2] = b;
	color[offset+3] = color[offset+3];
}

/**
 * ShaderForShaderNum
 */
function ShaderForShaderNum(shaderNum, lightmapNum) {
	var shaders = re.world.shaders;
	if (shaderNum < 0 || shaderNum >= shaders.length) {
		com.Error(ERR.DROP, 'ShaderForShaderNum: bad num ' + shaderNum);
	}
	var dsh = shaders[shaderNum];
	var shader = FindShaderByName(dsh.shaderName, lightmapNum);

	return shader;
}

/**
 * LoadShaders
 */
// function LoadShaders(buffer, shaderLump) {
// 	for (var i = 0; i < shaders.length; i++) {

// 		shader.shaderName = SubstituteShader(bb.readASCIIString(MAX_QPATH));
// 	}
// }

/**
 * SubstituteShader
 *
 * HACK - Will be moved to build process.
 */
// function SubstituteShader(shaderName) {
// 	var cfg = re.world.cfg;

// 	if (cfg.shaders && cfg.shaders[shaderName]) {
// 		return cfg.shaders[shaderName];
// 	}

// 	return shaderName;
// }

/**
 * LoadNodesAndLeafs
 */
function LoadNodesAndLeafs(nodes, leafs, leafSurfaces, planes) {
	var world = re.world;

	world.leafSurfaces = leafSurfaces;
	world.planes = planes;

	// Go ahead and allocate all nodes so child
	// references are available.
	var allNodes = world.nodes = new Array(nodes.length + leafs.length);

	for (var i = 0; i < allNodes.length; i++) {
		allNodes[i] = new WorldNode();
	}

	// Load nodes.
	for (var i = 0; i < nodes.length; i++) {
		var node = nodes[i];
		var wnode = allNodes[i];

		wnode.plane = planes[node.planeNum];
		wnode.children = new Array(2);
		for (var j = 0; j < 2; j++) {
			var p = node.childrenNum[j];

			if (p >= 0) {
				wnode.children[j] = allNodes[p];
			} else {
				wnode.children[j] = allNodes[nodes.length + (-1 - p)];
			}
		}
		vec3.set(node.mins, wnode.mins);
		vec3.set(node.maxs, wnode.maxs);
	}

	// Load leafs.
	for (var i = 0; i < leafs.length; i++) {
		var leaf = leafs[i];
		var wleaf = allNodes[nodes.length + i];

		wleaf.cluster = leaf.cluster;
		wleaf.area = leaf.area;
		vec3.set(leaf.mins, wleaf.mins);
		vec3.set(leaf.maxs, wleaf.maxs);
		wleaf.firstLeafSurface = leaf.firstLeafSurface;
		wleaf.numLeafSurfaces = leaf.numLeafSurfaces;
		wleaf.firstLeafBrush = leaf.firstLeafBrush;
		wleaf.numLeafBrushes = leaf.numLeafBrushes;

		// if (leaf.cluster >= world.numClusters ) {
		// 	world.numClusters = leaf.cluster + 1;
		// }
	}

	// Chain decendants.
	var setParent_r = function (node, parent) {
		node.parent = parent;
		if (!node.children) {
			return;
		}
		setParent_r(node.children[0], node);
		setParent_r(node.children[1], node);
	};

	setParent_r(allNodes[0], null);
}

/**
 * LoadSurfaces
 */
function LoadSurfaces(surfaces, verts, meshVerts) {
	var world = re.world;

	world.verts = verts;
	world.meshVerts = meshVerts;
	// CM shouldn't care.
	// FIXME - Move to com-bsp?
	for (var i = 0; i < verts.length; i++) {
		var vert = verts[i];
		ColorShiftLightingBytes(vert.color);
	}

	world.surfaces = new Array(surfaces.length);

	for (var i = 0; i < world.surfaces.length; i++) {
		var surface = surfaces[i];
		var wsurface = world.surfaces[i] = new WorldSurface();

		wsurface.surfaceType = SF.BAD;
		wsurface.shader = ShaderForShaderNum(surface.shaderNum, surface.lightmapNum);
		wsurface.fogIndex = surface.fogNum + 1;
		wsurface.vertex = surface.vertex;
		wsurface.vertCount = surface.vertCount;
		wsurface.meshVert = surface.meshVert;
		wsurface.meshVertCount = surface.meshVertCount;
		wsurface.lightmapNum = surface.lightmapNum;
		wsurface.patchWidth = surface.patchWidth;
		wsurface.patchHeight = surface.patchHeight;

		if (surface.surfaceType === MST.PLANAR) {
			ParseFace(wsurface, surface);
		} else if (surface.surfaceType === MST.TRIANGLE_SOUP) {
			ParseTriSurf(wsurface);
		} else if (surface.surfaceType === MST.PATCH) {
			ParseMesh(wsurface, r_subdivisions());
		}
	}
}

/**
 * ParseFace
 */
function ParseFace(wsurface, surface) {
	var verts = re.world.verts;

	wsurface.surfaceType = SF.FACE;

	// Take the plane information from the lightmap vector.
	wsurface.plane.normal = vec3.create(surface.lightmapVecs[2]);
	wsurface.plane.dist = vec3.dot(verts[wsurface.vertex].pos, wsurface.plane.normal);
	wsurface.plane.signbits = QMath.GetPlaneSignbits(wsurface.plane.normal);
	wsurface.plane.type = QMath.PlaneTypeForNormal(wsurface.plane.normal);
}

/**
 * ParseTriSurf
 */
function ParseTriSurf(surface) {
	surface.surfaceType = SF.TRIANGLES;
}

/**
 * ParseMesh
 */
function ParseMesh(surface, level) {
	var verts = re.world.verts;
	var meshVerts = re.world.meshVerts;
	var points = verts.slice(surface.vertex, surface.vertex + surface.vertCount);
	var grid = SubdividePatchToGrid(points, surface.patchWidth, surface.patchHeight, level);

	// TODO Stop merging meshes into the main vert buffer,
	// that way we can LOD them.
	// surface.surfaceType = SF.GRID;
	surface.surfaceType = SF.FACE;

	// Start at the end of the current vert array.
	surface.vertex = verts.length;
	surface.vertCount = grid.verts.length;

	surface.meshVert = meshVerts.length;
	surface.meshVertCount = (grid.width-1) * (grid.height-1) * 6;

	// Append the grid's verts to the world.
	verts.push.apply(verts, grid.verts);

	// Triangulate the indexes and append to the world.
	for (var j = 0; j < grid.height-1; j++) {
		for (var i = 0; i < grid.width-1; i++) {
			var v1 = j*grid.width + i+1;
			var v2 = v1 - 1;
			var v3 = v2 + grid.width;
			var v4 = v3 + 1;

			meshVerts.push(v2);
			meshVerts.push(v3);
			meshVerts.push(v1);

			meshVerts.push(v1);
			meshVerts.push(v3);
			meshVerts.push(v4);
		}
	}
}

/**
 * LoadBrushModels
 */
function LoadBrushModels(models) {
	var world = re.world;

	world.bmodels = models;

	for (var i = 0; i < models.length; i++) {
		// Register the brush model.
		FindModelByName('*' + i, models[i]);
	}
}

/**
 * LoadLightmaps
 */
function LoadLightmaps(buffer) {
	var world = re.world;

	var LIGHTMAP_WIDTH  = 128;
	var LIGHTMAP_HEIGHT = 128;
	var lightmapSize = LIGHTMAP_WIDTH * LIGHTMAP_HEIGHT;
	var count = buffer.length / (lightmapSize*3);

	var gridSize = 2;
	while(gridSize * gridSize < count) gridSize *= 2;
	var textureSize = gridSize * LIGHTMAP_WIDTH;

	var byteOffset = 0;
	var xOffset = 0;
	var yOffset = 0;

	var lightmaps = [];

	for(var i = 0; i < count; ++i) {
		var elements = new Array(lightmapSize*4);

		for(var j = 0; j < lightmapSize*4; j+=4) {
			var rgb = [
				buffer[byteOffset++],
				buffer[byteOffset++],
				buffer[byteOffset++]
			];

			ColorShiftLightingBytes(rgb);

			elements[j] = rgb[0];
			elements[j+1] = rgb[1];
			elements[j+2] = rgb[2];
			elements[j+3] = 255;
		}

		lightmaps.push({
			x: xOffset,
			y: yOffset,
			width: LIGHTMAP_WIDTH,
			height: LIGHTMAP_HEIGHT,
			buffer: new Uint8Array(elements),
			texCoords: {
				x: xOffset / textureSize,
				y: yOffset /textureSize,
				xScale: LIGHTMAP_WIDTH / textureSize,
				yScale: LIGHTMAP_HEIGHT / textureSize
			}
		});

		xOffset += LIGHTMAP_WIDTH;

		if (xOffset >= textureSize) {
			yOffset += LIGHTMAP_HEIGHT;
			xOffset = 0;
		}
	}

	//
	// Create the combined texture.
	//
	re.lightmapTexture = CreateTexture('*lightmap', lightmaps, textureSize, textureSize);

	//
	// Transform surface lm coords to match combined texture.
	//
	var surfaces = re.world.surfaces;
	var verts = re.world.verts;
	var indexes = re.world.meshVerts;
	var processed = new Array(verts.length);

	for (var i = 0; i < surfaces.length; i++) {
		var surface = surfaces[i];
		var lightmap = lightmaps[surface.lightmapNum];

		if (!lightmap) {
			lightmap = lightmaps[0];
		}

		for (var j = 0; j < surface.vertCount; j++) {
			var idx = surface.vertex + j;

			if (!processed[idx]) {
				var vert = verts[idx];
				vert.lmCoord[0] = (vert.lmCoord[0] * lightmap.texCoords.xScale) + lightmap.texCoords.x;
				vert.lmCoord[1] = (vert.lmCoord[1] * lightmap.texCoords.yScale) + lightmap.texCoords.y;
				processed[idx] = true;
			}
		}

		for (var j = 0; j < surface.meshVertCount; j++) {
			var idx = surface.vertex + indexes[surface.meshVert + j];

			if (!processed[idx]) {
				var vert = verts[idx];
				vert.lmCoord[0] = (vert.lmCoord[0] * lightmap.texCoords.xScale) + lightmap.texCoords.x;
				vert.lmCoord[1] = (vert.lmCoord[1] * lightmap.texCoords.yScale) + lightmap.texCoords.y;
				processed[idx] = true;
			}
		}
	}
}

/**
 * LoadLightGrid
 */
function LoadLightGrid(lightGridOrigin, lightGridSize, lightGridInverseSize, lightGridBounds, lightGridData) {
	var world = re.world;

	vec3.set(lightGridOrigin, world.lightGridOrigin);
	vec3.set(lightGridSize, world.lightGridSize);
	vec3.set(lightGridInverseSize, world.lightGridInverseSize);
	vec3.set(lightGridBounds, world.lightGridBounds);
	world.lightGridData = lightGridData;

	// Convert overbright bits.
	var numGridPoints = world.lightGridBounds[0] * world.lightGridBounds[1] * world.lightGridBounds[2];

	// CM shouldn't care.
	// FIXME - Move to com-bsp?
	for (var i = 0; i < numGridPoints; i++) {
		ColorShiftLightingBytes(world.lightGridData, i*8);
		ColorShiftLightingBytes(world.lightGridData, i*8+3);
	}
}

/**
 * BatchWorldSurfaces
 *
 * We go ahead and group world faces by shader (just as the render loop
 * would) and pre-compile the render buffers since this geometry is
 * going to stay static.
 */
function BatchWorldSurfaces() {
	var world = re.world;
	var nodes = world.nodes;
	var leafSurfaces = world.leafSurfaces;
	var faces = world.surfaces;
	var verts = world.verts;
	var meshVerts = world.meshVerts;

	// Group faces by shader.
	var groups = {};

	// Walk the nodes list lists to determine the faces to add,
	// as the raw face list has bmodel surfaces we don't
	// want to group together in our static render.
	var addFacesForNode = function (node) {
		for (var i = 0; i < node.numLeafSurfaces; i++) {
			var face = faces[leafSurfaces[node.firstLeafSurface + i]];
			var shader = face.shader;

			if (face.batch) {
				continue;  // we've already processed this face
			}

			// Add the surface to its batch.
			var group = groups[shader.name];

			if (!group) {
				group = groups[shader.name] = {
					numVerts: 0,
					numIndexes: 0,
					faces: []
				};

				group.batch = new BatchSurface();
				group.batch.shader = shader;
			}

			group.numVerts += face.vertCount;
			group.numIndexes += face.meshVertCount;
			group.faces.push(face);

			// Link the actual face to the batch.
			face.batch = group.batch;
		}

		if (node.children) {
			addFacesForNode(node.children[0]);
			addFacesForNode(node.children[1]);
		}
	};

	addFacesForNode(nodes[0]);

	// For each group of faces, create render buffers for the
	// composite compiled surface.
	var originalCmd = backend.tess;

	for (var key in groups) {
		if (!groups.hasOwnProperty(key)) {
			continue;
		}

		var group = groups[key];
		var batch = group.batch;

		var xyz        = batch.cmd.xyz        = CreateBuffer('float32', 3, group.numVerts);
		var normal     = batch.cmd.normal     = CreateBuffer('float32', 3, group.numVerts);
		var texCoord   = batch.cmd.texCoord   = CreateBuffer('float32', 2, group.numVerts);
		var lightCoord = batch.cmd.lightCoord = CreateBuffer('float32', 2, group.numVerts);
		var color      = batch.cmd.color      = CreateBuffer('uint8',   4, group.numVerts);
		var index      = batch.cmd.index      = CreateBuffer('uint16',  1, group.numIndexes, true);

		// Overwrite the current backend cmd so TesselateFace
		// writes to us.
		backend.tess = batch.cmd;

		var offset = index.elementCount;
		for (var j = 0; j < group.faces.length; j++) {
			TesselateFace(group.faces[j]);
		}
		batch.cmd.indexOffset = offset;
		batch.cmd.indexCount = index.elementCount - offset;

		xyz.modified = true;
		normal.modified = true;
		texCoord.modified = true;
		lightCoord.modified = true;
		color.modified = true;
		index.modified = true;
	}

	// Restore the original command.
	backend.tess = originalCmd;

	// We no longer need the vert info, let's free up the memory.
	// world.verts = null;
	// world.meshVerts = null;
}

/**
 * BuildCollisionBuffers
 */
function BuildCollisionBuffers() {
	var buffers = backend.collisionBuffers = {
		index: CreateBuffer('uint16',  1, 0xFFFF, true),
		xyz:   CreateBuffer('float32', 3, 0xFFFF)
	};

	var index = buffers.index;
	var xyz = buffers.xyz;

	var tessFn = function (pts) {
		for (var i = 0; i < pts.length; i++) {
			var pt = pts[i];
			index.data[index.offset++] = index.elementCount-1;
			xyz.data[xyz.offset++] = pt[0];
			xyz.data[xyz.offset++] = pt[1];
			xyz.data[xyz.offset++] = pt[2];
		}
	};

	index.modified = true;
	xyz.modified = true;

	cm.EmitCollisionSurfaces(tessFn);
}