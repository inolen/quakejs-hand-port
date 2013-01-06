define('common/map-serializer',
['common/text-tokenizer', 'common/qmath'],
function (TextTokenizer, QMath) {

var Map = function () {
	this.entities = [];
};

var Entity = function () {
	this.properties = {};
	this.brushes = [];
};

var Brush = function () {
	this.sides = null;
	this.patch = null;
};

var BrushSide = function () {
	this.plane        = null;
	this.shaderName   = null;
	this.xShift       = 0;
	this.yShift       = 0;
	this.rotation     = 0;
	this.xScale       = 0;
	this.yScale       = 0;
	this.contentFlags = 0;
	this.surfaceFlags = 0;
	this.unused       = 0;
}

var Patch = function () {
	this.shaderName = null;
	this.width      = 0;
	this.height     = 0;
	this.points     = [];
}

var PatchPoint = function () {
	this.xyz = vec3.create();
	this.st  = [];
}

/**
 * LoadMap
 */
function LoadMap(data) {
	var map = new Map();

	var tokens = new TextTokenizer(data);

	while (!tokens.EOF()) {
		var token = tokens.next();

		switch (token) {
			case '{':
				var entity = ParseEntity(tokens);
				if (!entity) {
					return null;
				}
				map.entities.push(entity);
				break;
		}
	}

	return map;
}

/**
 * ParseEntity
 *
 * {
 *     key1 value1
 *     key2 value2
 *     // brush 0
 *     {
 *         ( -112 -906 528 ) ( -112 -978 528 ) ( 16 -978 528 ) common/weapclip 0 -4 0 0.500000 0.500000 0 0 0
 *         ( 16 -978 552 ) ( -112 -978 552 ) ( -112 -906 552 ) common/weapclip 0 -4 0 0.500000 0.500000 0 0 0
 *         ( 18 -940 408 ) ( 18 -940 552 ) ( -110 -940 552 ) common/weapclip 0 0 0 0.500000 0.500000 0 0 0
 *         ( 2 -978 400 ) ( 2 -978 544 ) ( 2 -906 544 ) common/weapclip 4 0 0 0.500000 0.500000 0 0 0
 *         ( -112 -974 400 ) ( -112 -974 544 ) ( 16 -974 544 ) common/weapclip 0 0 0 0.500000 0.500000 0 0 0
 *         ( -102 -908 400 ) ( -102 -908 544 ) ( -102 -980 544 ) common/weapclip 4 0 0 0.500000 0.500000 0 0 0
 *     }
 * }
 */
function ParseEntity(tokens) {
	var entity = new Entity();

	while (!tokens.EOF()) {
		var token = tokens.next();
		if (token == '}') {
			break;
		} else if (token === '{') {
			var brush = ParseBrush(tokens);

			if (!brush) {
				return null;
			}

			entity.brushes.push(brush);
		} else {
			var key = token;
			var value = tokens.next();
			entity.properties[key] = value;
		}
	}

	return entity;
}

/**
 * ParseBrush
 *
 * ( x y z ) ( x y z ) ( x y z ) shaderName x_shift y_shift rotation x_scale y_scale content_flags surface_flags unused
 * or
 * patchDef2 { <patch> }
 */
function ParseBrush(tokens) {
	var brush = new Brush();

	while (!tokens.EOF()) {
		var token = tokens.next();
		if (token == '}') {
			break;
		}

		// Parse a patch.
		if (token === 'patchDef2') {
			// Skip opening { for consistency.
			tokens.next();

			var patch = ParsePatch(tokens);

			if (patch === null) {
				return null;
			}

			brush.patch = patch;
		}
		// Parse a brush side.
		else if (token === '(') {
			var side = ParseBrushSide(tokens);

			if (side === null) {
				return null;
			}

			if (!brush.sides) {
				brush.sides = [];
			}

			brush.sides.push(side);
		}

	}

	return brush;
}

/**
 * ParseBrushSide
 *
 * ( x y z ) ( x y z ) ( x y z ) shaderName x_shift y_shift rotation x_scale y_scale content_flags surface_flags unused
 */
function ParseBrushSide(tokens) {
	var side = new BrushSide();

	var a = vec3.createFrom(
		parseFloat(tokens.next()),
		parseFloat(tokens.next()),
		parseFloat(tokens.next())
	);
	if (tokens.next() !== ')' || tokens.next() !== '(') {
		console.log('ParseBrushSide invalid token');
		return null;
	}
	var b = vec3.createFrom(
		parseFloat(tokens.next()),
		parseFloat(tokens.next()),
		parseFloat(tokens.next())
	);
	if (tokens.next() !== ')' || tokens.next() !== '(') {
		console.log('ParseBrushSide invalid token');
		return null;
	}
	var c = vec3.createFrom(
		parseFloat(tokens.next()),
		parseFloat(tokens.next()),
		parseFloat(tokens.next())
	);
	if (tokens.next() !== ')') {
		console.log('ParseBrushSide invalid token');
		return null;
	}
	side.plane = QMath.PlaneFromPoints(c, b, a);
	side.shaderName = tokens.next();
	side.xShift = tokens.next();
	side.yShift = tokens.next();
	side.rotation = tokens.next();
	side.xScale = tokens.next();
	side.yScale = tokens.next();
	side.contentFlags = parseInt(tokens.next(), 10);
	side.surfaceFlags = parseInt(tokens.next(), 10);
	side.unused = parseInt(tokens.next(), 10);

	return side;
}

/**
 * ParsePatch
 *
 * <shaderName>
 * ( <patchWidth> <patchHeight> <unused> <unused> <unused> )
 * (
 * ( ( <x> <y> <z> <texcoord_x> <texcoord_y> ) * width )
 * * height
 * )
 */
function ParsePatch(tokens) {
	var patch = new Patch();

	patch.shaderName = tokens.next();

	if (tokens.next() !== '(') {
		console.log('ParsePatch invalid token', tokens.prev());
		return null;
	}

	patch.height = parseInt(tokens.next(), 10);
	patch.width = parseInt(tokens.next(), 10);

	if (tokens.next() !== '0' || tokens.next() !== '0' || tokens.next() !== '0' ||
		tokens.next() !== ')' || tokens.next() !== '(') {
		console.log('ParsePatch invalid token');
		return null;
	}

	for (var i = 0; i < patch.height; i++) {
		if (tokens.next() !== '(') {
			console.log('ParsePatch invalid token');
			return null;
		}

		for (var j = 0; j < patch.width; j++) {
			var pt = new PatchPoint();

			var token;
			if ((token = tokens.next()) !== '(') {
				console.log('ParsePatch invalid token', token, i, j, patch.width);
				return null;
			}

			pt.xyz[0] = parseFloat(tokens.next());
			pt.xyz[1] = parseFloat(tokens.next());
			pt.xyz[2] = parseFloat(tokens.next());

			pt.st[0] = parseFloat(tokens.next());
			pt.st[1] = parseFloat(tokens.next());

			if (tokens.next() !== ')') {
				console.log('ParsePatch invalid token');
				return null;
			}

			patch.points.push(pt);
		}

		if (tokens.next() !== ')') {
			console.log('ParsePatch invalid token');
			return null;
		}
	}

	if (tokens.next() !== ')' || tokens.next() !== '}') {
		console.log('ParsePatch invalid token');
		return null;
	}

	return patch;
}

return {
	deserialize: LoadMap
};

});