define('shared/Q3Bsp',
['jsstruct'],
function (Struct) {
	var Q3Bsp = function () {
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

	Q3Bsp.SurfaceTypes = {
		MST_BAD          : 0,
		MST_PLANAR       : 1,
		MST_PATCH        : 2,
		MST_TRIANGLE_SOUP: 3,
		MST_FLARE        : 4
	};

	Q3Bsp.Lumps = {
		LUMP_ENTITIES     : 0,
		LUMP_SHADERS      : 1,
		LUMP_PLANES       : 2,
		LUMP_NODES        : 3,
		LUMP_LEAFS        : 4,
		LUMP_LEAFSURFACES : 5,
		LUMP_LEAFBRUSHES  : 6,
		LUMP_MODELS       : 7,
		LUMP_BRUSHES      : 8,
		LUMP_BRUSHSIDES   : 9,
		LUMP_DRAWVERTS    : 10,
		LUMP_DRAWINDEXES  : 11,
		LUMP_FOGS         : 12,
		LUMP_SURFACES     : 13,
		LUMP_LIGHTMAPS    : 14,
		LUMP_LIGHTGRID    : 15,
		LUMP_VISIBILITY   : 16,
		HEADER_LUMPS      : 17
	};

	var MAX_QPATH = 64;

	Q3Bsp.Lumps.LUMP_t = Struct.create(
		Struct.int32('fileofs'),
		Struct.int32('filelen')
	);

	Q3Bsp.dheader_t = Struct.create(
		Struct.string('ident', 4),
		Struct.int32('version'),
		Struct.array('lumps', Q3Bsp.Lumps.LUMP_t, Q3Bsp.Lumps.HEADER_LUMPS)
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
			sortedIndex: { value: 0, enumerable: true, configurable: true, writable: true }
		}
	);

	Q3Bsp.dplane_t = Struct.create(
		Struct.array('normal', Struct.float32(), 3),
		Struct.float32('dist')
	);

	Q3Bsp.dnode_t = Struct.create(
		Struct.int32('planeNum'),
		Struct.array('childrenNum', Struct.int32(), 2),
		Struct.array('mins', Struct.int32(), 3),
		Struct.array('maxs', Struct.int32(), 3)
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
		Struct.int32('patchWidth'),
		Struct.int32('patchHeight')
	);

	return Q3Bsp;
});