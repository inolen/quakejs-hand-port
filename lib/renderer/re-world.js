/**
 * LoadWorld
 *
 * Take the canonical world data and convert to optimized
 * renderer specific structures.
 */
function LoadWorld(world, callback) {
	re.world = new RenderWorld();

	re.world.shaders = world.shaders;
	re.world.planes = world.planes;
	re.world.numClusters = world.numClusters;
	re.world.clusterBytes = world.clusterBytes;
	re.world.vis = world.vis;

	// Load certain data into more appropriate structures.
	LoadNodesAndLeafs(world.nodes, world.leafs, world.leafSurfaces);
	LoadBrushModels(world.bmodels);
	LoadLightmaps(world.lightmaps);
	LoadLightGrid(world.lightGridData,
		world.lightGridOrigin,
		world.lightGridSize,
		world.lightGridInverseSize,
		world.lightGridBounds);

	// We need to wait for the surfaces to load (which involves
	// async shader requests).
	LoadSurfaces(world.surfaces, world.verts, world.indexes, function () {
		// Create static render surfaces.
		CreateWorldGeometry();

		for (var i = 0; i < re.world.bmodels.length; i++) {
			CreateBModelGeometry(re.world.bmodels[i]);
		}

		callback();
	});
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
function ShaderForShaderNum(shaderNum, lightmapNum, callback) {
	var shaders = re.world.shaders;
	if (shaderNum < 0 || shaderNum >= shaders.length) {
		com.Error('ShaderForShaderNum: bad num ' + shaderNum);
	}
	var dsh = shaders[shaderNum];

	var flags = 0;
	if (lightmapNum < 0) {
		flags |= SF.LIGHTMAP_VERTEX;
	}

	FindShaderByName(dsh.shaderName, flags, callback);
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
function LoadNodesAndLeafs(nodes, leafs, leafSurfaces) {
	var world = re.world;
	var planes = world.planes;

	world.leafSurfaces = leafSurfaces;

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

		// Set numClusters even if no vis data is available.
		if (leaf.cluster >= world.numClusters ) {
			world.numClusters = leaf.cluster + 1;
		}
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
function LoadSurfaces(surfaces, verts, meshVerts, callback) {
	var world = re.world;

	world.verts = verts;
	world.meshVerts = meshVerts;

	// CM shouldn't care.
	// FIXME - Move to com-bsp?
	verts.forEach(function (vert) {
		ColorShiftLightingBytes(vert.color);
	});

	var wsurfaces = world.surfaces = new Array(surfaces.length);

	//
	// Convert to renderer specific WorldSurface structs.
	//
	var steps = [];

	surfaces.forEach(function (surface, i) {
		var wsurface = wsurfaces[i] = new WorldSurface();

		wsurface.surfaceType = SF.BAD;
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

		steps.push(function (cb) {
			ShaderForShaderNum(surface.shaderNum, surface.lightmapNum, function (shader) {
				wsurface.shader = shader;
				cb(null);
			});
		});
	});

	//
	// Transform surface lm coords to match combined texture.
	//
	var verts = re.world.verts;
	var indexes = re.world.meshVerts;
	var lightmaps = re.world.lightmaps;
	var processed = new Array(verts.length);

	for (var i = 0; i < wsurfaces.length; i++) {
		var wsurface = wsurfaces[i];
		var lightmap = lightmaps[wsurface.lightmapNum];

		if (!lightmap) {
			lightmap = lightmaps[0];
		}

		for (var j = 0; j < wsurface.vertCount; j++) {
			var idx = wsurface.vertex + j;

			if (!processed[idx]) {
				var vert = verts[idx];
				vert.lmCoord[0] = (vert.lmCoord[0] * lightmap.texCoords.xScale) + lightmap.texCoords.x;
				vert.lmCoord[1] = (vert.lmCoord[1] * lightmap.texCoords.yScale) + lightmap.texCoords.y;
				processed[idx] = true;
			}
		}

		for (var j = 0; j < wsurface.meshVertCount; j++) {
			var idx = wsurface.vertex + indexes[wsurface.meshVert + j];

			if (!processed[idx]) {
				var vert = verts[idx];
				vert.lmCoord[0] = (vert.lmCoord[0] * lightmap.texCoords.xScale) + lightmap.texCoords.x;
				vert.lmCoord[1] = (vert.lmCoord[1] * lightmap.texCoords.yScale) + lightmap.texCoords.y;
				processed[idx] = true;
			}
		}
	}

	// Clear off the heap.
	re.world.lightmaps = null;

	async.parallel(steps, function () {
		callback();
	});
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
function ParseTriSurf(wsurface) {
	wsurface.surfaceType = SF.TRIANGLES;
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
	// FIXME maps
	if (!models) {
		re.world.bmodels = [];
		return;
	}

	var world = re.world;

	world.bmodels = models;

	for (var i = 0; i < models.length; i++) {
		// Register the brush model.
		FindModelByName('*' + i, models[i], function () {});
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

	var lightmaps = re.world.lightmaps = [];

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
}

/**
 * LoadLightGrid
 */
function LoadLightGrid(lightGridData, lightGridOrigin, lightGridSize, lightGridInverseSize, lightGridBounds) {
	if (!lightGridData) {
		return;
	}

	var world = re.world;

	world.lightGridData = lightGridData;
	vec3.set(lightGridOrigin, world.lightGridOrigin);
	vec3.set(lightGridSize, world.lightGridSize);
	vec3.set(lightGridInverseSize, world.lightGridInverseSize);
	vec3.set(lightGridBounds, world.lightGridBounds);

	// Convert overbright bits.
	var numGridPoints = world.lightGridBounds[0] * world.lightGridBounds[1] * world.lightGridBounds[2];

	// CM shouldn't care.
	// FIXME - Move to com-bsp?
	for (var i = 0; i < numGridPoints; i++) {
		ColorShiftLightingBytes(world.lightGridData, i*8);
		ColorShiftLightingBytes(world.lightGridData, i*8+3);
	}
}

// /**
//  * BuildCollisionBuffers
//  */
// function BuildCollisionBuffers() {
// 	var buffers = backend.collisionBuffers = {
// 		index: CreateBuffer('uint16',  1, 0xFFFF, true),
// 		xyz:   CreateBuffer('float32', 3, 0xFFFF)
// 	};

// 	var index = buffers.index;
// 	var xyz = buffers.xyz;

// 	var tessFn = function (pts) {
// 		for (var i = 0; i < pts.length; i++) {
// 			var pt = pts[i];
// 			index.data[index.index++] = index.elementCount-1;
// 			xyz.data[xyz.index++] = pt[0];
// 			xyz.data[xyz.index++] = pt[1];
// 			xyz.data[xyz.index++] = pt[2];
// 		}
// 	};

// 	index.modified = true;
// 	xyz.modified = true;

// 	cm.EmitCollisionSurfaces(tessFn);
// }

/**
 * CreateWorldGeometry
 *
 * Group faces by shader into static geometry buffers.
 * We don't group portal shaders, as that makes it inefficient
 * to isolate individual ones to mirror them while rendering.
 */
function CreateWorldGeometry() {
	var world = re.world;
	var nodes = world.nodes;
	var leafSurfaces = world.leafSurfaces;
	var surfaces = world.surfaces;

	var geometry = {};
	var portals = 0;

	// Walk the nodes list lists to determine the faces to add,
	// as the raw face list has bmodel surfaces we don't
	// want to group together in our static geometry.
	var addFacesForNode = function (node) {
		for (var i = 0; i < node.numLeafSurfaces; i++) {
			var surface = surfaces[leafSurfaces[node.firstLeafSurface + i]];
			var shader = surface.shader;

			// Ignore if we've already processed.
			if (surface.geo) {
				continue;
			}

			// Sky surfaces just let us know what shader to render
			// the real sky with.
			if (shader.sky) {
				continue;
			}

			// Add the surface to its batch.
			var shaderName = shader.name;
			if (shader.sort === SS.PORTAL) {
				shaderName += portals++;
			}

			var geo = geometry[shaderName];

			if (!geo) {
				geo = geometry[shaderName] = new WorldGeometry();
				geo.shader = shader;
				geo.numVerts = 0;
				geo.numIndexes = 0;
				geo.faces = [];
			}

			geo.numVerts += surface.vertCount;
			geo.numIndexes += surface.meshVertCount;
			geo.faces.push(surface);

			// Link the actual face to the geo.
			surface.geo = geo;
		}

		if (node.children) {
			addFacesForNode(node.children[0]);
			addFacesForNode(node.children[1]);
		}
	};

	addFacesForNode(nodes[0]);

	// Create vbos for each geometry group.
	for (var key in geometry) {
		if (!geometry.hasOwnProperty(key)) {
			continue;
		}

		UpdateWorldGeometry(geometry[key]);
	}
}

/**
 * CreateBModelGeometry
 *
 * We can't batch together the bmodel surfaces with the
 * rest of the world due to visibility.
 */
function CreateBModelGeometry(bmodel) {
	var surfaces = re.world.surfaces;

	var geometry = {};

	for (var i = 0; i < bmodel.numSurfaces; i++) {
		var surface = surfaces[bmodel.firstSurface + i];
		var shader = surface.shader;

		// Sky surfaces just let us know what shader to render
		// the real sky with.
		// FIXME: Why are their sky surfaces on brush models.
		if (shader.sky) {
			continue;
		}

		var shaderName = shader.name;
		var geo = geometry[shaderName];

		if (!geo) {
			geo = geometry[shaderName] = new WorldGeometry();
			geo.shader = shader;
			geo.numVerts = 0;
			geo.numIndexes = 0;
			geo.faces = [];
		}

		geo.numVerts += surface.vertCount;
		geo.numIndexes += surface.meshVertCount;
		geo.faces.push(surface);

		// Link the actual face to the geo.
		surface.geo = geo;
	}

	// Create vbos for each geometry group.
	for (var key in geometry) {
		if (!geometry.hasOwnProperty(key)) {
			continue;
		}

		UpdateWorldGeometry(geometry[key]);
	}
}