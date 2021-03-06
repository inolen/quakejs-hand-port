define(function (require) {

var QMath = require('common/qmath');
var BSPLoader = require('common/bsp-loader');

var WorkArea = function () {
	this.brushes = [];
	this.verts   = [];
	this.planes  = [];
};

var MetaBrush = function () {
	this.sides = [];
};

var MetaBrushSide = function () {
	this.w        = null;
	this.planeNum = 0;
};

var map;
var bsp;
var work;

/**
 * CompileMap
 */
function CompileMap(inMap) {
	map = inMap;
	work = new WorkArea();
	bsp = new BSPLoader.Bsp();

	CreateMetaBrushes();

	EmitEntities();
	EmitPlanes();
	EmitSurfaces();
	EmitModels();
	EmitNodes();

	return world;
}

/**
 * EmitEntities
 */
function EmitEntities() {
	var entities = bsp.entities = {};

	for (var i = 0; i < map.entities.length; i++) {
		var entity = map.entities[i];

		var classname = entity.properties.classname;
		if (!classname) {
			continue;
		}

		if (!entities[classname]) {
			entities[classname] = [];
		}

		entities[classname].push(entity.properties);
	}
}

/**
 * EmitPlanes
 */
function EmitPlanes() {
	bsp.planes = work.planes;
}

/**
 * EmitModels
 */
function EmitModels() {
	bsp.bmodels = [];

	var worldModel = new BSPLoader.dmodel_t();
	bsp.bmodels.push(worldModel);
}

/**
 * EmitNodes
 */
function EmitNodes() {
	bsp.nodes = [];
	bsp.leafs = [];
	bsp.leafBrushes = [];
	bsp.leafSurfaces = [];

	// Append all surface indexes to leafSurfaces.
	for (var i = 0; i < bsp.surfaces.length; i++) {
		bsp.leafSurfaces.push(i);
	}

	// Create two fake leaf nodes, stack one with all of the surfaces.
	var leafa = new BSPLoader.dleaf_t();
	leafa.firstLeafSurface = 0;
	leafa.numLeafSurfaces = bsp.leafSurfaces.length;

	var leafb = new BSPLoader.dleaf_t();

	bsp.leafs.push(leafa);
	bsp.leafs.push(leafb);

	// Create a root node.
	var root = new BSPLoader.dnode_t();
	root.childrenNum[0] = -1;
	root.childrenNum[1] = -2;

	bsp.nodes.push(root);
}

// 	this.planeNum    = 0;                                  // int32
// 	this.childrenNum = [0, 0];                             // int32 * 2
// 	this.mins        = vec3.create();                      // int32 * 3
// 	this.maxs        = vec3.create();                      // int32 * 3
// };
// dnode_t.size = 36;

// var dleaf_t = function () {
// 	this.cluster          = 0;                             // int32
// 	this.area             = 0;                             // int32
// 	this.mins             = vec3.create();                 // int32 * 3
// 	this.maxs             = vec3.create();                 // int32 * 3
// 	this.firstLeafSurface = 0;                             // int32
// 	this.numLeafSurfaces  = 0;                             // int32
// 	this.firstLeafBrush   = 0;                             // int32
// 	this.numLeafBrushes   = 0;                             // int32

/**
 * EmitSurfaces
 *
 * Convert meta brushes / brush sides into verts, indexes and surfaces.
 */
function EmitSurfaces() {
	bsp.verts    = [];
	bsp.indexes  = [];
	bsp.surfaces = [];

	for (var i = 0; i < work.brushes.length; i++) {
		var mbrush = work.brushes[i];

		EmitSurfacesForMetaBrush(mbrush);
	}
}

/**
 * EmitSurfacesForMetaBrush
 */
function EmitSurfacesForMetaBrush(mbrush) {
	var msides = mbrush.sides;

	// Iterate the sides outputting surfaces.
	for (var i = 0; i < msides.length; i++) {
		var mside = msides[i];

		var surface = new BSPLoader.dsurface_t();

		surface.surfaceType = BSPLoader.MST.PLANAR;

		// Emit verts.
		surface.vertex = bsp.verts.length;
		surface.vertCount = mside.w.p.length;

		for (var j = 0; j < mside.w.p.length; j++) {
			var vert = new BSPLoader.drawVert_t();

			vec3.set(mside.w.p[j], vert.pos);
			vert.texCoord[0] = j / mside.w.p.length;
			vert.texCoord[1] = j / mside.w.p.length;

			bsp.verts.push(vert);
		}

		// Emit indexes.
		surface.meshVert = bsp.indexes.length;
		surface.meshVertCount = ((surface.vertCount-2) * 3);

		for (var j = 2; j < mside.w.p.length; j++) {
			bsp.indexes.push(0);
			bsp.indexes.push(j - 1);
			bsp.indexes.push(j);
		}

		// Emit the surface.
		bsp.surfaces.push(surface);
	}
}

/**
 * CreateMetaBrushes
 */
function CreateMetaBrushes() {
	for (var i = 0; i < map.entities.length; i++) {
		var entity = map.entities[i];

		for (var j = 0; j < entity.brushes.length; j++) {
			var brush = entity.brushes[j];

			// FIXME only handling plain brushes atm.
			if (!brush.sides) {
				continue;
			}

			CreateMetaBrush(brush);

		}
	}
}

/**
 * CreateMetaBrush
 */
function CreateMetaBrush(brush) {
	var mbrush = new MetaBrush();

	for (var i = 0; i < brush.sides.length; i++) {
		var chop = brush.sides[i];
		var mside = new MetaBrushSide();

		// Make huge winding.
		mside.w = QMath.BaseWindingForPlane(chop.plane.normal, chop.plane.dist);
		mside.planeNum = FindPlane(chop.plane);

		// Walk the list of brush sides
		for (var j = 0; j < brush.sides.length; j++) {
			if (i === j) {
				continue;
			}

			var side = brush.sides[j];

			// Ignore backside.
			var result = vec3.add(chop.plane.normal, side.plane.normal, vec3.create());
			if (vec3.length(result) < 0.01) {
				// console.log('ignore backside', side.plane.normal[0], side.plane.normal[1], side.plane.normal[2]);
				continue;
			}
			// if (brush->sides[ j ].planenum == ( brush->sides[ i ].planenum ^ 1 ) ) {
			// 	continue;       /* back side clipaway */
			// }

			if (!QMath.ChopWindingInPlace(mside.w, side.plane.normal, side.plane.dist, 0.1)) {
				console.log('Winding chopped away completely.');
				return;  // winding was completely chopped away
			}
		}

		mbrush.sides.push(mside);
	}

	work.brushes.push(mbrush);
}

/**
 * FindPlane
 */
function FindPlane(plane) {
	for (var i = 0; i < work.planes.length; i++) {
		if (QMath.PlaneEqual(plane, work.planes[i])) {
			return i;
		}
	}

	var idx = work.planes.length;
	work.planes.push(plane);
	return idx;
}

return {
	compile: CompileMap
};

});