var q3render_vertex_stride = 56;
var q3render_sky_vertex_stride = 20;

var vertexBuffer = null;
var indexBuffer = null;
var indexCount = 0;

var skyboxMat = mat4.create();
var skyboxBuffer = null;
var skyboxIndexBuffer = null;
var skyboxIndexCount;
var skyShader = null;

/**
 * Loading
 */
function LoadMap(mapName) {
	var map = new Q3Bsp();

	map.Load('../' + Q3W_BASE_FOLDER + '/maps/' + mapName + '.bsp', function () {
		re.world = new WorldData();

		LoadShaders(map);
		LoadLightmaps(map);
		LoadSurfaces(map);
		LoadPlanes(map);
		LoadNodesAndLeafs(map);
		LoadVisibility(map);

		BuildSkyboxBuffers();
		BuildWorldBuffers();
	});
}

function BrightnessAdjust(color, factor) {
	var scale = 1.0, temp = 0.0;

	color[0] *= factor;
	color[1] *= factor;
	color[2] *= factor;

	if(color[0] > 255 && (temp = 255/color[0]) < scale) { scale = temp; }
	if(color[1] > 255 && (temp = 255/color[1]) < scale) { scale = temp; }
	if(color[2] > 255 && (temp = 255/color[2]) < scale) { scale = temp; }

	color[0] *= scale;
	color[1] *= scale;
	color[2] *= scale;

	return color;
}

function ColorToVec(color) {
	var r, g, b;

	r = color[0] / 255;
	g = color[1] / 255;
	b = color[2] / 255;

	// normalize by color instead of saturating to white
	if (( r | g | b ) > 1) {
		var max = r > g ? r : g;
		max = max > b ? max : b;
		r /= max;
		g /= max;
		b /= max;
	}

	return [r, g, b, color[3] / 255];
}

function ShaderForShaderNum(shaderNum) {
	var shaders = re.world.shaders;
	if (shaderNum < 0 || shaderNum >= shaders.length) {
		throw new Error('ShaderForShaderNum: bad num ' + shaderNum);
	}
	var dsh = shaders[shaderNum];
	var shader = FindShader(dsh.shaderName);

	return shader;
}
function LoadShaders(map) {
	re.world.shaders = map.ParseLump(Q3Bsp.Lumps.LUMP_SHADERS, Q3Bsp.dshader_t);
}

function LoadLightmaps(map) {
	var LIGHTMAP_WIDTH  = 128,
		LIGHTMAP_HEIGHT = 128;

	var lump = map.GetLump(Q3Bsp.Lumps.LUMP_LIGHTMAPS);
	var lightmapSize = LIGHTMAP_WIDTH * LIGHTMAP_HEIGHT;
	var count = lump.filelen / (lightmapSize*3);
	var data = Struct.readUint8Array(map.GetBuffer(), lump.fileofs, lump.filelen);

	var gridSize = 2;
	while(gridSize * gridSize < count) gridSize *= 2;
	var textureSize = gridSize * LIGHTMAP_WIDTH;

	var xOffset = 0;
	var yOffset = 0;

	re.world.lightmaps = [];

	for(var i = 0, rgbIdx = 0; i < count; ++i) {
		var elements = new Array(lightmapSize*4);

		for(var j = 0; j < lightmapSize*4; j+=4) {
			var rgb = [ data[rgbIdx++], data[rgbIdx++], data[rgbIdx++] ];

			BrightnessAdjust(rgb, 4.0);

			elements[j] = rgb[0];
			elements[j+1] = rgb[1];
			elements[j+2] = rgb[2];
			elements[j+3] = 255;
		}

		re.world.lightmaps.push({
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

	CreateImage('*lightmap', re.world.lightmaps, textureSize, textureSize);
}

// (1–t)^2*P0 + 2*(1–t)*t*P1 + t^2*P2
function GetCurvePoint(c0, c1, c2, t) {
	var result = [];
	var dims = c0.length;

	for (var i = 0; i < dims; i++) {
		result[i] = (Math.pow(1-t, 2)*c0[i]) + (2*(1-t)*t*c1[i]) + (Math.pow(t, 2)*c2[i]);
	}

	return result;
}

function ParseMesh(face, verts, meshVerts, level) {
	var width = face.patchWidth;
	var height = face.patchHeight;
	var firstControlPoint = face.vertex;

	// Build 3x3 biquadtratic bezier patches.
	// http://www.gamedev.net/page/resources/_/technical/math-and-physics/bezier-patches-r1584
	var cp = function (x, y) {
		return verts[firstControlPoint+y*width+x];
	};
	var build3x3 = function (x, y) {
		// Create the new verts.
		for (var j = 0; j <= level; j++) {
			var v = j / level;

			var c = [
				{
					pos:      GetCurvePoint(cp(x,  y).pos,      cp(x,  y+1).pos,      cp(x,  y+2).pos,      v),
					lmCoord:  GetCurvePoint(cp(x,  y).lmCoord,  cp(x,  y+1).lmCoord,  cp(x,  y+2).lmCoord,  v),
					texCoord: GetCurvePoint(cp(x,  y).texCoord, cp(x,  y+1).texCoord, cp(x,  y+2).texCoord, v),
					color:    GetCurvePoint(cp(x,  y).color,    cp(x,  y+1).color,    cp(x,  y+2).color,    v)
				},
				{
					pos:      GetCurvePoint(cp(x+1,y).pos,      cp(x+1,y+1).pos,      cp(x+1,y+2).pos,      v),
					lmCoord:  GetCurvePoint(cp(x+1,y).lmCoord,  cp(x+1,y+1).lmCoord,  cp(x+1,y+2).lmCoord,  v),
					texCoord: GetCurvePoint(cp(x+1,y).texCoord, cp(x+1,y+1).texCoord, cp(x+1,y+2).texCoord, v),
					color:    GetCurvePoint(cp(x+1,y).color,    cp(x+1,y+1).color,    cp(x+1,y+2).color,    v)
				},				
				{
					pos:      GetCurvePoint(cp(x+2,y).pos,      cp(x+2,y+1).pos,      cp(x+2,y+2).pos,      v),
					lmCoord:  GetCurvePoint(cp(x+2,y).lmCoord,  cp(x+2,y+1).lmCoord,  cp(x+2,y+2).lmCoord,  v),
					texCoord: GetCurvePoint(cp(x+2,y).texCoord, cp(x+2,y+1).texCoord, cp(x+2,y+2).texCoord, v),
					color:    GetCurvePoint(cp(x+2,y).color,    cp(x+2,y+1).color,    cp(x+2,y+2).color,    v)
				}
			];

			for (var i = 0; i <= level; i++) {
				var u = i / level;

				var vert = {
					pos:      GetCurvePoint(c[0].pos,      c[1].pos,      c[2].pos,      u),
					lmCoord:  GetCurvePoint(c[0].lmCoord,  c[1].lmCoord,  c[2].lmCoord,  u),
					texCoord: GetCurvePoint(c[0].texCoord, c[1].texCoord, c[2].texCoord, u),
					color:    GetCurvePoint(c[0].color,    c[1].color,    c[2].color,    u),
					normal:   [0, 0, 1]
				};

				verts.push(vert);
			}
		}

		var faceOffset = face.vertCount;
		face.vertCount += (level+1) * (level + 1);
		
		// Add vert indexes.
		for (var j = 0; j < level; j++) {
			for (var i = 0; i < level; i++) {
				// vertex order to be reckognized as tristrips
				var v1 = faceOffset + j*(level+1) + i+1;
				var v2 = v1 - 1;
				var v3 = v2 + (level+1);
				var v4 = v3 + 1;

				meshVerts.push(v2);
				meshVerts.push(v3);
				meshVerts.push(v1);
				
				meshVerts.push(v1);
				meshVerts.push(v3);
				meshVerts.push(v4);
			}
		}

		face.meshVertCount += level * level * 6;
	};

	face.vertex = verts.length;
	face.vertCount = 0;
	face.meshVert = meshVerts.length;
	face.meshVertCount = 0;

	for (var j = 0; j + 2 < height; j += 2) {
		for (var i = 0; i + 2 < width; i += 2) {
			build3x3(i, j);
		}
	}
}

function LoadSurfaces(map) {
	var lightmaps = re.world.lightmaps;
	var shaders = re.world.shaders;
	var faces = re.world.faces = map.ParseLump(Q3Bsp.Lumps.LUMP_SURFACES, Q3Bsp.dsurface_t);

	// Load verts.
	var verts = re.world.verts = map.ParseLump(Q3Bsp.Lumps.LUMP_DRAWVERTS, Q3Bsp.drawVert_t);
	for (var i = 0, length = verts.length; i < length; i++) {
		verts[i].color = ColorToVec(BrightnessAdjust(verts[i].color, 4.0));
	}

	// Load vert indexes.
	var meshVertLump = map.GetLump(Q3Bsp.Lumps.LUMP_DRAWINDEXES);
	var meshVerts = re.world.meshVerts = [];
	var idxs = Struct.readUint32Array(map.GetBuffer(), meshVertLump.fileofs, meshVertLump.filelen/4);
	for (var i = 0, length = idxs.length; i < length; i++) {
		meshVerts.push(idxs[i]);
	}

	var processed = new Array(verts.length);

	for (var i = 0; i < faces.length; ++i) {
		var face = faces[i];

		// Tesselate patches.
		if (face.type === Q3Bsp.SurfaceTypes.MST_PATCH) {
			ParseMesh(face, verts, meshVerts, 5);
		}

		face.shader = ShaderForShaderNum(face.shader);
		face.shader.geomType = face.type;

		// Transform lightmap coords to match position in combined texture.
		var lightmap = lightmaps[face.lightmap];

		if (!lightmap) {
			lightmap = lightmaps[0];
		}

		for (var j = 0; j < face.vertCount; j++) {
			var idx = face.vertex + j;

			if (!processed[idx]) {
				var vert = verts[idx];
				vert.lmCoord[0] = (vert.lmCoord[0] * lightmap.texCoords.xScale) + lightmap.texCoords.x;
				vert.lmCoord[1] = (vert.lmCoord[1] * lightmap.texCoords.yScale) + lightmap.texCoords.y;
				processed[idx] = true;
			}
		}

		for (var j = 0; j < face.meshVertCount; j++) {
			var idx = face.vertex + meshVerts[face.meshVert + j];

			if (!processed[idx]) {
				var vert = verts[idx];
				vert.lmCoord[0] = (vert.lmCoord[0] * lightmap.texCoords.xScale) + lightmap.texCoords.x;
				vert.lmCoord[1] = (vert.lmCoord[1] * lightmap.texCoords.yScale) + lightmap.texCoords.y;
				processed[idx] = true;
			}
		}
	}
}

function LoadPlanes(map) {
	var planes = re.world.planes = map.ParseLump(Q3Bsp.Lumps.LUMP_PLANES, Q3Bsp.dplane_t);

	for (var i = 0; i < planes.length; i++) {
		var plane = planes[i];
		var bits = 0;

		for (var j = 0; j < 3; j++) {
			if (plane.normal[j] < 0) {
				bits |= 1 << j;
			}
		}

		plane.type = PlaneTypeForNormal(plane.normal);
		plane.signbits = bits;
	}
}

function LoadNodesAndLeafs(map) {
	var world = re.world;
	var planes = world.planes;

	var setParent_r = function (node, parent) {
		node.parent = parent;
		if (!node.children) {
			return;
		}
		setParent_r(node.children[0], node);
		setParent_r(node.children[1], node);
	};

	// load leaf surfaces
	var leafSurfacesLump = map.GetLump(Q3Bsp.Lumps.LUMP_LEAFSURFACES);
	var leafSurfaces = world.leafSurfaces = Struct.readUint32Array(map.GetBuffer(), leafSurfacesLump.fileofs, leafSurfacesLump.filelen/4);

	// TODO Factor out this concat.
	var nodes = map.ParseLump(Q3Bsp.Lumps.LUMP_NODES, Q3Bsp.dnode_t);
	var leafs = map.ParseLump(Q3Bsp.Lumps.LUMP_LEAFS, Q3Bsp.dleaf_t);
	var allNodes = world.nodes = nodes.concat(leafs);

	// load nodes
	for (var i = 0, numNodes = nodes.length; i < numNodes; i++) {
		var node = allNodes[i];
	
		node.plane = planes[node.planeNum];

		node.children = new Array(2);
		for (var j = 0; j < 2; j++) {
			var p = node.childrenNum[j];

			if (p >= 0) {
				node.children[j] = allNodes[p];
			} else {
				node.children[j] =  allNodes[numNodes + (-1 - p)];
			}
		}
	}

	// load leafs
	for (var i = numNodes, numLeafs = leafs.length; i < numNodes + numLeafs; i++) {
		var leaf = allNodes[i];

		if (leaf.cluster >= world.numClusters ) {
			world.numClusters = leaf.cluster + 1;
		}
	}

	// chain decendants
	setParent_r(allNodes[0], null);
}

function LoadVisibility(map) {
	var world = re.world;
	var lump = map.GetLump(Q3Bsp.Lumps.LUMP_VISIBILITY);
	world.numClusters = Struct.readUint32Array(map.GetBuffer(), lump.fileofs, 1)[0];
	world.clusterBytes = Struct.readUint32Array(map.GetBuffer(), lump.fileofs + 4, 1)[0];
	world.vis = Struct.readUint8Array(map.GetBuffer(), lump.fileofs + 8, world.numClusters * world.clusterBytes);
}

function BuildSkyboxBuffers() {
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

	skyboxBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, skyboxBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(skyVerts), gl.STATIC_DRAW);

	skyboxIndexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, skyboxIndexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(skyIndices), gl.STATIC_DRAW);

	skyboxIndexCount = skyIndices.length;
}

function BuildWorldBuffers() {
	var faces = re.world.faces,
		verts = re.world.verts,
		meshVerts = re.world.meshVerts,
		shaders = re.world.shaders,
		facesForShader = new Array(shaders.length);

	// Compile vert list
	var vertices = new Array(verts.length*14);
	var offset = 0;
	for (var i = 0; i < verts.length; ++i) {
		var vert = verts[i];

		vertices[offset++] = vert.pos[0];
		vertices[offset++] = vert.pos[1];
		vertices[offset++] = vert.pos[2];

		vertices[offset++] = vert.texCoord[0];
		vertices[offset++] = vert.texCoord[1];

		vertices[offset++] = vert.lmCoord[0];
		vertices[offset++] = vert.lmCoord[1];

		vertices[offset++] = vert.normal[0];
		vertices[offset++] = vert.normal[1];
		vertices[offset++] = vert.normal[2];

		vertices[offset++] = vert.color[0];
		vertices[offset++] = vert.color[1];
		vertices[offset++] = vert.color[2];
		vertices[offset++] = vert.color[3];
	}

	// Compile index list
	var indices = new Array();

	for (var i = 0; i < faces.length; i++) {
		var face = faces[i];

		face.indexOffset = indices.length * 2; // Offset is in bytes

		for(var j = 0; j < face.meshVertCount; j++) {
			indices.push(face.vertex + meshVerts[face.meshVert + j]);
		}
	}

	vertexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

	indexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
}

/**
 * Helper functions to bind attributes to vertex arrays.
 */
function BindShaderAttribs(shader, modelViewMat, projectionMat) {
	// Set uniforms
	gl.uniformMatrix4fv(shader.uniform.modelViewMat, false, modelViewMat);
	gl.uniformMatrix4fv(shader.uniform.projectionMat, false, projectionMat);

	// Setup vertex attributes
	gl.enableVertexAttribArray(shader.attrib.position);
	gl.vertexAttribPointer(shader.attrib.position, 3, gl.FLOAT, false, q3render_vertex_stride, 0);

	if(shader.attrib.texCoord !== undefined) {
		gl.enableVertexAttribArray(shader.attrib.texCoord);
		gl.vertexAttribPointer(shader.attrib.texCoord, 2, gl.FLOAT, false, q3render_vertex_stride, 3*4);
	}

	if(shader.attrib.lightCoord !== undefined) {
		gl.enableVertexAttribArray(shader.attrib.lightCoord);
		gl.vertexAttribPointer(shader.attrib.lightCoord, 2, gl.FLOAT, false, q3render_vertex_stride, 5*4);
	}

	if(shader.attrib.normal !== undefined) {
		gl.enableVertexAttribArray(shader.attrib.normal);
		gl.vertexAttribPointer(shader.attrib.normal, 3, gl.FLOAT, false, q3render_vertex_stride, 7*4);
	}

	if(shader.attrib.color !== undefined) {
		gl.enableVertexAttribArray(shader.attrib.color);
		gl.vertexAttribPointer(shader.attrib.color, 4, gl.FLOAT, false, q3render_vertex_stride, 10*4);
	}
}

function BindSkyAttribs(shader, modelViewMat, projectionMat) {
	mat4.set(modelViewMat, skyboxMat);

	// Clear out the translation components
	skyboxMat[12] = 0;
	skyboxMat[13] = 0;
	skyboxMat[14] = 0;

	// Set uniforms
	gl.uniformMatrix4fv(shader.uniform.modelViewMat, false, skyboxMat);
	gl.uniformMatrix4fv(shader.uniform.projectionMat, false, projectionMat);

	// Setup vertex attributes
	gl.enableVertexAttribArray(shader.attrib.position);
	gl.vertexAttribPointer(shader.attrib.position, 3, gl.FLOAT, false, q3render_sky_vertex_stride, 0);

	if(shader.attrib.texCoord !== undefined) {
		gl.enableVertexAttribArray(shader.attrib.texCoord);
		gl.vertexAttribPointer(shader.attrib.texCoord, 2, gl.FLOAT, false, q3render_sky_vertex_stride, 3*4);
	}
}

/**
 *
 */
function PointInLeaf(p) {
	if (!re.world) {
		throw new Error('PointInLeaf: bad model');
	}

	var node = re.world.nodes[0];

	while (1) {		
		if (!node.children) {
			break;
		}
		var plane = node.plane;
		var d = vec3.dot(p, plane.normal) - plane.dist;

		if (d > 0) {
			node = node.children[0];
		} else {
			node = node.children[1];
		}
	}
	
	return node;
}

function ClusterVisible(current, test) {
	var world = re.world;

	if (!world || !world.vis || current === test || current == -1) {
		return true;
	}

	var offset = current * world.clusterBytes;
	return (world.vis[offset + (test >> 3)] & (1 << (test & 7))) !== 0;
}

function MarkLeaves() {
	var world = re.world;
	var nodes = world.nodes;

	// current viewcluster
	var leaf = PointInLeaf(re.viewParms.pvsOrigin);
	var cluster = leaf.cluster;

	// if the cluster is the same and the area visibility matrix
	// hasn't changed, we don't need to mark everything again
	if (re.viewCluster === cluster) {
		return;
	}

	re.viewCluster = cluster;
	re.visCount++;

	/*if (re.viewCluster == -1 ) {
		for (var i = 0, numNodes = nodes.length; i < numNodes; i++) {
			if (nodes[i].contents != CONTENTS_SOLID) {
				nodes[i].visframe = re.visCount;
			}
		}
		return;
	}*/

	for (var i = 0, numNodes = nodes.length; i < numNodes; i++) {
		var node = nodes[i];
		var cluster = node.cluster;

		if (cluster < 0 || cluster >= world.numClusters) {
			continue;
		}

		// check general pvs
		if (!ClusterVisible(re.viewCluster, cluster)) {
			continue;
		}

		// check for door connection
		/*if ( (tr.refdef.areamask[node->area>>3] & (1<<(node->area&7)) ) ) {
			continue;		// not visible
		}*/

		var parent = node;
		while (parent) {
			if (parent.visframe === re.visCount) {
				break;
			}
			parent.visframe = re.visCount;
			parent = parent.parent;
		}
	}
}

function AddWorldSurface(surf/*, dlightBits*/) {
	if (surf.viewCount === re.viewCount) {
		return; // already in this view
	}

	surf.viewCount = re.viewCount;

	// try to cull before dlighting or adding
	/*if (CullSurface(surf.data, surf.shader)) {
		return;
	}*/

	// check for dlighting
	/*if (dlightBits ) {
		dlightBits = DlightSurface(surf, dlightBits);
		dlightBits = (dlightBits !== 0);
	}*/

	AddDrawSurf(surf/*.data*/, surf.shader/*, surf.fogIndex, dlightBits*/);
}

function RecursiveWorldNode(node, planeBits/*, dlightBits*/) {
	while (1) {
		// if the node wasn't marked as potentially visible, exit
		if (node.visframe != re.visCount) {
			return;
		}

		// if the bounding volume is outside the frustum, nothing
		// inside can be visible OPTIMIZE: don't do this all the way to leafs?
		if (true/*!r_nocull->integer*/) {
			var r;

			if (planeBits & 1) {
				r = BoxOnPlaneSide(node.mins, node.maxs, re.viewParms.frustum[0]);
				if (r === 2) {
					return;                      // culled
				} else if (r === 1) {
					planeBits &= ~1;             // all descendants will also be in front
				}
			}

			if (planeBits & 2) {
				r = BoxOnPlaneSide(node.mins, node.maxs, re.viewParms.frustum[1]);
				if (r === 2) {
					return;                      // culled
				} else if (r === 1) {
					planeBits &= ~2;             // all descendants will also be in front
				}
			}

			if (planeBits & 4) {
				r = BoxOnPlaneSide(node.mins, node.maxs, re.viewParms.frustum[2]);
				if (r === 2) {
					return;                      // culled
				} else if (r == 1) {
					planeBits &= ~4;             // all descendants will also be in front
				}
			}

			if (planeBits & 8) {
				r = BoxOnPlaneSide(node.mins, node.maxs, re.viewParms.frustum[3]);
				if (r === 2) {
					return;                      // culled
				} else if (r === 1 ) {
					planeBits &= ~8;             // all descendants will also be in front
				}
			}
		}

		if (!node.children) {
			break;
		}

		// node is just a decision point, so go down both sides
		// since we don't care about sort orders, just go positive to negative

		// determine which dlights are needed
		/*var newDlights = [0, 0];

		if (dlightBits) {
			int	i;

			for ( i = 0 ; i < tr.refdef.num_dlights ; i++ ) {
				dlight_t	*dl;
				float		dist;

				if ( dlightBits & ( 1 << i ) ) {
					dl = &tr.refdef.dlights[i];
					dist = DotProduct( dl->origin, node->plane->normal ) - node->plane->dist;
					
					if ( dist > -dl->radius ) {
						newDlights[0] |= ( 1 << i );
					}
					if ( dist < dl->radius ) {
						newDlights[1] |= ( 1 << i );
					}
				}
			}
		}*/

		// recurse down the children, front side first
		RecursiveWorldNode(node.children[0], planeBits/*, newDlights[0]*/);

		// tail recurse
		node = node.children[1];
		/*dlightBits = newDlights[1];*/
	}

	// add to z buffer bounds
	var parms = re.viewParms;

	if (node.mins[0] < parms.visBounds[0][0]) {
		parms.visBounds[0][0] = node.mins[0];
	}
	if (node.mins[1] < parms.visBounds[0][1]) {
		parms.visBounds[0][1] = node.mins[1];
	}
	if (node.mins[2] < parms.visBounds[0][2]) {
		parms.visBounds[0][2] = node.mins[2];
	}

	if (node.maxs[0] > parms.visBounds[1][0]) {
		parms.visBounds[1][0] = node.maxs[0];
	}
	if (node.maxs[1] > parms.visBounds[1][1]) {
		parms.visBounds[1][1] = node.maxs[1];
	}
	if (node.maxs[2] > parms.visBounds[1][2]) {
		parms.visBounds[1][2] = node.maxs[2];
	}

	// add the individual surfaces
	var faces = re.world.faces;
	var leafSurfaces = re.world.leafSurfaces;

	for (var i = 0; i < node.numLeafSurfaces; i++) {
		var face = faces[leafSurfaces[node.firstLeafSurface + i]];
		// The surface may have already been added if it spans multiple leafs.
		AddWorldSurface(face/*, dlightBits*/);
	}

	re.pc.leafs++;
}

function AddWorldSurfaces(map) {
	MarkLeaves();
	RecursiveWorldNode(re.world.nodes[0], 15);
}

var startTime = sys.GetMilliseconds();
function RenderWorld(modelViewMat, projectionMat) {
	var world = re.world;

	if (vertexBuffer === null || indexBuffer === null) { return; } // Not ready to draw yet

	// Seconds passed since map was initialized
	var time = (sys.GetMilliseconds() - startTime)/1000.0;
	var i = 0;

	// If we have a skybox, render it first
	if (skyShader) {
		// SkyBox Buffers
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, skyboxIndexBuffer);
		gl.bindBuffer(gl.ARRAY_BUFFER, skyboxBuffer);

		// Render Skybox
		SetShader(skyShader);
		for(var j = 0; j < skyShader.stages.length; j++) {
			var stage = skyShader.stages[j];

			SetShaderStage(skyShader, stage, time);
			BindSkyAttribs(stage.program, modelViewMat, projectionMat);

			// Draw all geometry that uses this textures
			gl.drawElements(gl.TRIANGLES, skyboxIndexCount, gl.UNSIGNED_SHORT, 0);
		}
	}

	// Map Geometry buffers
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

	var refdef = re.refdef;
	var drawSurfs = refdef.drawSurfs;
	var shaders = world.shaders;

	for (var i = 0; i < refdef.numDrawSurfs; i++) {
		var face = drawSurfs[i].surface;
		var shader = face.shader;
		var glshader = shader.glshader;

		// Bind the surface shader
		SetShader(glshader);
		
		for (var j = 0; j < glshader.stages.length; j++) {
			var stage = glshader.stages[j];

			SetShaderStage(glshader, stage, time);
			BindShaderAttribs(stage.program, modelViewMat, projectionMat);

			gl.drawElements(gl.TRIANGLES, face.meshVertCount, gl.UNSIGNED_SHORT, face.indexOffset);

			re.pc.verts += face.meshVertCount;
		}
	}

	/*if (!window.foobar || sys.GetMilliseconds() - window.foobar > 1000) {
		console.log(re.pc.surfs + ' surfs, ' + re.pc.leafs + ' leafs, ', + re.pc.verts + ' verts');
		window.foobar = sys.GetMilliseconds();
	}*/
}