define('common/Q3Bsp', [], function () {
	var Q3Bsp = function () {
		/*function ParseVisData(buffer, lump) {
			var numClusters = Struct.readUint32Array(buffer, lump.fileofs, 1)[0];
			var clusterBytes = Struct.readUint32Array(buffer, lump.fileofs + 4, 1)[0];

			var elements = Struct.readUint8Array(buffer, lump.fileofs + 8, numClusters * clusterBytes);

			return {
				buffer: elements,
				size: clusterBytes
			};
		}*/

		return {
			Load: function (url, callback) {
				var self = this;
				var request = new XMLHttpRequest();

				request.open('GET', url, true);
				request.responseType = 'arraybuffer';
				request.addEventListener('load', function () {
					var buffer = self.buffer = this.response;
					var header = self.header = Q3Bsp.dheader_t.deserialize(buffer, 0, 1)[0];

					if (header.ident != 'IBSP' && header.version != 46) {
						return;
					}

					callback.apply(this);
				});
				request.send(null);
			},

			GetBuffer: function () {
				return this.buffer;
			},

			GetLump: function (idx) {
				return this.header.lumps[idx];
			},

			ParseLump: function (lumpIdx, struct) {
				var lump = this.GetLump(lumpIdx);
				return struct.deserialize(this.buffer, lump.fileofs, lump.filelen/struct.byteLength);
			}
		};
	};

	Q3Bsp.LUMP_ENTITIES     = 0;
	Q3Bsp.LUMP_SHADERS      = 1;
	Q3Bsp.LUMP_PLANES       = 2;
	Q3Bsp.LUMP_NODES        = 3;
	Q3Bsp.LUMP_LEAFS        = 4;
	Q3Bsp.LUMP_LEAFSURFACES = 5;
	Q3Bsp.LUMP_LEAFBRUSHES  = 6;
	Q3Bsp.LUMP_MODELS       = 7;
	Q3Bsp.LUMP_BRUSHES      = 8;
	Q3Bsp.LUMP_BRUSHSIDES   = 9;
	Q3Bsp.LUMP_DRAWVERTS    = 10;
	Q3Bsp.LUMP_DRAWINDEXES  = 11;
	Q3Bsp.LUMP_FOGS         = 12;
	Q3Bsp.LUMP_SURFACES     = 13;
	Q3Bsp.LUMP_LIGHTMAPS    = 14;
	Q3Bsp.LUMP_LIGHTGRID    = 15;
	Q3Bsp.LUMP_VISIBILITY   = 16;
	Q3Bsp.HEADER_LUMPS      = 17;

	var MAX_QPATH = 64;

	Q3Bsp.lump_t = Struct.create(
		Struct.int32('fileofs'),
		Struct.int32('filelen')
	);

	Q3Bsp.dheader_t = Struct.create(
		Struct.string('ident', 4),
		Struct.int32('version'),
		Struct.array('lumps', Q3Bsp.lump_t, Q3Bsp.HEADER_LUMPS)
	);

	Q3Bsp.dmodel_t = Struct.create(
		Struct.array('mins', Struct.float32(), 3),
		Struct.array('maxs', Struct.float32(), 3),
		Struct.int32('firstSurface'),
		Struct.int32('numSurfaces'),
		Struct.int32('firstBrush'),
		Struct.int32('numBrushes')
	);

	Q3Bsp.dshader_t = Struct.create(
		Struct.string('shaderName', MAX_QPATH),
		Struct.int32('flags'),
		Struct.int32('contents'),
		{
			glShader: { value: null, enumerable: true, configurable: true, writable: true },
			indexOffset: { value: 0, enumerable: true, configurable: true, writable: true },
			elementCount: { value: 0, enumerable: true, configurable: true, writable: true },
			visible: { value: true, enumerable: true, configurable: true, writable: true }
		}
	);

	Q3Bsp.dplane_t = Struct.create(
		Struct.array('normal', Struct.float32(), 3),
		Struct.float32('dist')
	);

	Q3Bsp.dnode_t = Struct.create(
		Struct.int32('plane'),
		Struct.array('children', Struct.int32(), 2),
		Struct.array('min', Struct.int32(), 3),
		Struct.array('max', Struct.int32(), 3)
	);

	Q3Bsp.dleaf_t = Struct.create(
		Struct.int32('cluster'),
		Struct.int32('area'),
		Struct.array('mins', Struct.int32(), 3),
		Struct.array('maxs', Struct.int32(), 3),
		Struct.int32('firstLeafSurface'),
		Struct.int32('numLeafSurfaces'),
		Struct.int32('firstLeafBrush'),
		Struct.int32('numLeafBrushes')
	);

	Q3Bsp.dbrushside_t = Struct.create(
		Struct.int32('planeNum'),
		Struct.int32('shader')
	);

	Q3Bsp.dbrush_t = Struct.create(
		Struct.int32('side'),
		Struct.int32('numsides'),
		Struct.int32('shader')
	);

	Q3Bsp.dfog_t = Struct.create(
		Struct.string('shader', MAX_QPATH),
		Struct.int32('brushNum'),
		Struct.int32('visibleSide')
	);

	Q3Bsp.drawVert_t = Struct.create(
		Struct.array('pos', Struct.float32(), 3),
		Struct.array('texCoord', Struct.float32(), 2),
		Struct.array('lmCoord', Struct.float32(), 2),
		Struct.array('normal', Struct.float32(), 3),
		Struct.array('color', Struct.uint8(), 4)
	);

	Q3Bsp.dsurface_t = Struct.create(
		Struct.int32('shader'),
		Struct.int32('effect'),
		Struct.int32('type'),
		Struct.int32('vertex'),
		Struct.int32('vertCount'),
		Struct.int32('meshVert'),
		Struct.int32('meshVertCount'),
		Struct.int32('lightmap'),
		Struct.array('lmStart', Struct.int32(), 2),
		Struct.array('lmSize', Struct.int32(), 2),
		Struct.array('lmOrigin', Struct.float32(), 3),
		Struct.array('lmVecs', Struct.float32(), 6),
		Struct.array('normal', Struct.float32(), 3),
		Struct.array('size', Struct.int32(), 2),
		{
			indexOffset: { value: -1, enumerable: true, configurable: true, writable: true }
		}
	);

	return Q3Bsp;
});


/*
function CheckVis(visCluster, testCluster) {
	if (visCluster == testCluster || visCluster == -1) { return true; }
	var i = (visCluster * this.data.visData.size) + (testCluster >> 3);
	var visSet = this.data.visData.buffer[i];
	return (visSet & (1 << (testCluster & 7)) !== 0);
},

function GetLeaf(pos) {
	var index = 0;

	var node = null;
	var plane = null;
	var distance = 0;

	while (index >= 0) {
		node = this.data.nodes[index];
		plane = this.data.planes[node.plane];
		distance = vec3.dot(plane.normal, pos) - plane.distance;

		if (distance >= 0) {
			index = node.children[0];
		} else {
			index = node.children[1];
		}
	}

	return -(index+1);
},

function BuildVisibleList(leafIndex) {
	// Determine visible faces
	if (this.lastLeaf && leafIndex === this.lastLeaf) {
		return;
	}
	this.lastLeaf = leafIndex;

	var curLeaf = this.bspTree.leaves[leafIndex];

	var visibleShaders = new Array(shaders.length);

	for (var i = 0; i < this.data.leaves.length; ++i) {
		var leaf = this.data.leaves[i];
		if (this.checkVis(curLeaf.cluster, leaf.cluster)) {
			for(var j = 0; j < leaf.leafFaceCount; ++j) {
				var face = faces[this.data.leafFaces[[j + leaf.leafFace]]];
				if(face) {
					visibleShaders[face.shader] = true;
				}
			}
		}
	}

	return visibleShaders;
}
*/