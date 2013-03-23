define(function (require) {

var Script = require('renderer/script');
var Program = require('renderer/program');
var ProgramBuilder = require('renderer/program-builder');

var Shader = function () {
	this.name           = null;
	this.sort           = 0;

	this.surfaceFlags   = 0;
	this.contentFlags   = 0;

	this.cull           = 0;
	this.polygonOffset  = false;
	this.sky            = false;
	this.fog            = false;
	this.entityMergable = false;                           // merge entites (smoke, blood) during tesselation

	this.stages         = [];

	this.sortedIndex    = 0;                               // assigned internally
};

var ShaderStage = function () {
	this.blendSrc   = 0;
	this.blendDest  = 0;
	this.depthWrite = false;
	this.depthFunc  = 0;

	this.programs   = [];

	this.maps       = [];
	this.textures   = [];
	this.animFreq   = [];
};

function from(gl, script, MAX_DLIGHTS) {
	var shader = new Shader();

	shader.name = script.name;
	shader.sort = script.sort;

	shader.surfaceFlags = script.surfaceFlags;
	shader.contentFlags = script.contentFlags;

	shader.cull = translateCull(gl, script.cull);
	shader.polygonOffset = script.polygonOffset;
	shader.sky = script.sky;
	shader.fog = script.fog;
	shader.entityMergable = script.entityMergable;

	// if (script.fog) {
	// 	shader.hasBlendFunc = true;
	// 	shader.blendSrc = gl.SRC_ALPHA;
	// 	shader.blendDest = gl.ONE_MINUS_SRC_ALPHA;
	// }

	// Group together stages that we can blend safely in the fp,
	// saving us a pass.
	var groups = groupOptimizableBlendStages(script);

	for (var i = 0; i < groups.length; i++) {
		var group = groups[i];
		var stage = new ShaderStage();

		// Since these values were merged, it's safe to use the first
		// values blend / depth funcs.
		stage.blendSrc = translateBlend(gl, group[0].blendSrc);
		stage.blendDest = translateBlend(gl, group[0].blendDest);

		stage.depthWrite = group[0].depthWrite;
		stage.depthFunc = translateDepthFunc(gl, group[0].depthFunc);

		for (var j = 0; j < group.length; j++) {
			var scriptStage = group[j];

			stage.animFreq[j] = scriptStage.animFreq;

			stage.maps[j] = [];

			for (var k = 0; k < scriptStage.maps.length; k++) {
				stage.maps[j].push({ name: scriptStage.maps[k], clamp: scriptStage.clamp });
			}
		}

		// We can't conditionally branch inside loops in GLSL v1 shaders
		// across all hardware, so generate a custom shader for each possible
		// amount of dlights, and bind the correct one at runtime.
		// Also, only add dlights to the final group.
		var maxDlights = (i === groups.length - 1) && shader.sort === Script.SORT.OPAQUE ?
			MAX_DLIGHTS :
			0;

		var program;
		var builder = buildProgram(script, group);

		for (var numLights = 0; numLights <= maxDlights; numLights++) {
			builder.addDefine('MAX_DLIGHTS', numLights);

			program = Program.compile(gl, builder.getVertexSource(), builder.getFragmentSource())

			stage.programs.push(program);
		}

		shader.stages.push(stage);
	}

	return shader;
}

function translateCull(gl, cull) {
	if (!cull) { return gl.FRONT; }

	cull = cull.toLowerCase();

	if (cull === 'none' || cull === 'twosided' || cull === 'disable') {
		return null;
	} else if (cull === 'back' || cull === 'backside' || cull === 'backsided') {
		return gl.BACK;
	} else {
		return gl.FRONT;
	}
}

function translateDepthFunc(gl, depth) {
	if (!depth) { return gl.LEQUAL; }

	switch (depth.toLowerCase()) {
		case 'gequal':  return gl.GEQUAL;
		case 'lequal':  return gl.LEQUAL;
		case 'equal':   return gl.EQUAL;
		case 'greater': return gl.GREATER;
		case 'less':    return gl.LESS;
		default:        return gl.LEQUAL;
	}
}

function translateBlend(gl, blend) {
	if (!blend) { return gl.ONE; }

	switch (blend.toUpperCase()) {
		case 'GL_ONE':                 return gl.ONE;
		case 'GL_ZERO':                return gl.ZERO;
		case 'GL_DST_COLOR':           return gl.DST_COLOR;
		case 'GL_ONE_MINUS_DST_COLOR': return gl.ONE_MINUS_DST_COLOR;
		case 'GL_SRC_ALPHA':           return gl.SRC_ALPHA;
		case 'GL_ONE_MINUS_SRC_ALPHA': return gl.ONE_MINUS_SRC_ALPHA;
		case 'GL_SRC_COLOR':           return gl.SRC_COLOR;
		case 'GL_ONE_MINUS_SRC_COLOR': return gl.ONE_MINUS_SRC_COLOR;
		default:                       return gl.ONE;
	}
}

/**
 * Groups script stages into groups that can be blended
 * at the fragment program level.
 */
function groupOptimizableBlendStages(script) {
	var groups = [];

	var ignoreBlend = false;

	for (var i = 0, group = 0; i < script.stages.length; i++) {
		var last = script.stages[i > 0 ? i - 1 : 0];
		var current = script.stages[i];

		// Once we hit a stage that doesn't care about the
		// framebuffer's color, ignore blend changes.
		if (current.blendSrc !== 'GL_DST_COLOR' &&
			current.blendSrc !== 'GL_ONE_MINUS_DST_COLOR' &&
			current.blendDest === 'GL_ZERO') {
			ignoreBlend = true;
		}

		// If the blend / depth info has changed, move to a new group.
		if ((!ignoreBlend && (last.blendSrc !== current.blendSrc || last.blendDest !== current.blendDest)) ||
			last.depthWrite !== current.depthWrite || last.depthFunc !== current.depthFunc) {
			group++;
		}

		// Add to the current group.
		if (!groups[group]) {
			groups[group] = [];
		}
		groups[group].push(current);
	}

	return groups;
};

function buildProgram(script, stages) {
	var builder = new ProgramBuilder();

	builder.addAttrib('position', 'vec3');
	builder.addAttrib('normal', 'vec3');

	builder.addVarying('vPosition', 'vec3');
	builder.addVarying('vNormal', 'vec3');

	builder.addUniform('modelViewMatrix', 'mat4');
	builder.addUniform('projectionMatrix', 'mat4');
	builder.addUniform('viewPosition', 'vec3');
	builder.addUniform('time', 'float');

	builder.addUniform('dlightCount', 'int',                   '#if MAX_DLIGHTS > 0', '#endif');
	builder.addUniform('dlightPositions[MAX_DLIGHTS]', 'vec3', '#if MAX_DLIGHTS > 0', '#endif');
	builder.addUniform('dlightInfo[MAX_DLIGHTS]', 'vec4',      '#if MAX_DLIGHTS > 0', '#endif');

	// Add textures.

	//
	// Vertex Shader.
	//
	if (script.positionLerp) {
		builder.addAttrib('position2', 'vec3');
		builder.addAttrib('normal2', 'vec3');

		builder.addUniform('backlerp', 'float');

		builder.addVertexLines([
			'vec3 defPosition = position + backlerp * (position2 - position);',
			'vec3 defNormal = normal + backlerp * (normal2 - normal);'
		]);
	} else {
		builder.addVertexLines([
			'vec3 defPosition = position;',
			'vec3 defNormal = normal;'
		]);
	}

	builder.addVertexLines([
		'vPosition = defPosition;',
		'vNormal = defNormal;'
	]);

	// Add special varyings based on rgbGen / alphaGen states.
	var vColor = false;
	var vEntityColor = false;
	var vDiffuseColor = false;

	for (var i = 0; i < stages.length; i++) {
		var stage = stages[i];

		switch (stage.rgbGen) {
			case 'vertex':
			case 'exactvertex':
				vColor = true;
				break;
			case 'entity':
				vEntityColor = true;
				break;
			case 'lightingdiffuse':
				vDiffuseColor = true;
				break;
		}

		switch (stage.alphaGen) {
			case 'vertex':
			case 'lightingspecular':
				vColor = true;
				break;
			case 'entity':
				vEntityColor = true;
				break;
		}
	}

	if (vColor) {
		builder.addAttrib('color', 'vec4');
		builder.addVarying('vColor', 'vec4');
		builder.addVertexLines([ 'vColor = color;']);
	}

	if (vEntityColor) {
		builder.addUniform('entityColor', 'vec4');
	}

	if (vDiffuseColor) {
		builder.addUniform('lightDir', 'vec3');
		builder.addUniform('ambientLight', 'vec3');
		builder.addUniform('directedLight', 'vec3');

		builder.addVarying('vDiffuseScale', 'float');

		builder.addVertexLines([
			'vDiffuseScale = max(0.0, dot(defNormal, lightDir));'
		]);
	}

	for (var i = 0; i < script.vertexDeforms.length; i++) {
		var deform = script.vertexDeforms[i];

		switch (deform.type) {
			case 'wave':
				var name = 'deform' + i;
				var offName = 'deformOff' + i;

				builder.addVertexLines([
					'float ' + offName + ' = (position.x + position.y + position.z) * ' + deform.spread.toFixed(4) + ';'
				]);

				var phase = deform.wave.phase;
				deform.wave.phase = phase.toFixed(4) + ' + ' + offName;
				builder.addVertexLines([
					builder.createWaveform(name, deform.wave, true)
				]);
				deform.wave.phase = phase;

				builder.addVertexLines([
					'defPosition += defNormal * ' + name + ';'
				]);
				break;

			default:
				break;
		}
	}

	// Project sky onto far plane.
	var w = script.sky ? '0.0' : '1.0';
	builder.addVertexLines(['vec4 worldPosition = modelViewMatrix * vec4(defPosition, ' + w + ');']);

	for (var i = 0; i < stages.length; i++) {
		buildVertexPass(builder, script, stages[i], i);
	}

	builder.addVertexLines(['gl_Position = projectionMatrix * worldPosition;']);
	if (script.sky) {
		// Nudge it just in front of the far plane.
		builder.addVertexLines(['gl_Position.w = gl_Position.z + 0.001;']);
	}

	//
	// Fragment shader.
	//
	builder.addFragmentLines([
		'vec4 passColor;'
	]);

	// // Add fog pass first.
	// if (script.fog) {
	// 	builder.addFragmentLines([
	// 		'vec4 fragColor = vec4(1.0, 1.0, 1.0, 1.0);',
	// 		'float z = (gl_FragCoord.z / gl_FragCoord.w) / 4000.0;',
	// 		'fragColor.a = z;'
	// 	]);
	// }

	// Apply fragment passes from shader stages.
	for (var i = 0; i < stages.length; i++) {
		buildFragmentPass(builder, script, stages[i], i);
	}

	// Add dlights if enabled.
	buildDlightPass(builder, script);

	// Apply gamma correction to final fragment color.
	builder.addFragmentLines([
		'gl_FragColor = fragColor;'
	]);

	return builder;
};

function buildVertexPass(builder, script, stage, stageId) {
	var passName = 'vertPass' + stageId;
	var texCoordVar = 'vTexCoord' + stageId;
	builder.addVarying(texCoordVar, 'vec2');

	if (stage.isLightmap) {
		builder.addAttrib('lightCoord', 'vec2');
	} else {
		builder.addAttrib('texCoord', 'vec2');
	}

	var passFunc = 'vec2 ' + passName + '(vec4 worldPosition, vec3 normal) {\n';
	passFunc += '	vec2 vTexCoord;\n';

	if (stage.tcGen === 'environment') {
		passFunc += [
			'	vec3 viewer = normalize(viewPosition - position);\n',
			'float d = dot(normal, viewer);\n',
			'vec3 reflected = normal * 2.0 * d - viewer;\n',
			'vTexCoord = vec2(0.5 + reflected.y * 0.5, 0.5 - reflected.z * 0.5);\n'
		].join('\n\t');
	} else {
		// Standard texturing
		if (stage.isLightmap) {
			passFunc += '	vTexCoord = lightCoord;\n';
		} else {
			passFunc += '	vTexCoord = texCoord;\n';
		}
	}

	switch (stage.alphaGen) {
		case 'lightingspecular':
			builder.addVertexFunction('specular',
				'float specular() {\n' +
				'	vec3 lightOrigin = vec3(-960.0, 1980.0, 96.0);\n' +
				'	vec3 lightDir = normalize(lightOrigin - position);\n' +
				'	float d = dot(normal, lightDir);\n' +
				'	vec3 reflected = normal * 2.0 * d - lightDir;\n' +
				'	vec3 viewer = viewPosition - position;\n' +
				'	float ilength = inversesqrt(dot(viewer, viewer));\n' +
				'	float l = dot(reflected, viewer) * ilength;\n' +
				'	if (l > 0.0) {\n' +
				'		l = l*l*l;\n' +
				'	} else {\n' +
				'		l = 0.0;\n' +
				'	}\n' +
				'	return l;' +
				'}');
			builder.addVertexLines([
				'vColor.a = min(specular(), 1.0);'
			]);
			break;
		default:
			break;
	}

	// tcMods
	for (var i = 0; i < stage.tcMods.length; i++) {
		var tcMod = stage.tcMods[i];
		switch (tcMod.type) {
			case 'rotate':
				passFunc += [
					'	float r = ' + tcMod.angle.toFixed(4) + ' * time;',
					'vTexCoord -= vec2(0.5, 0.5);',
					'vTexCoord = vec2(vTexCoord.s * cos(r) - vTexCoord.t * sin(r), vTexCoord.t * cos(r) + vTexCoord.s * sin(r));',
					'vTexCoord += vec2(0.5, 0.5);\n'
				].join('\n\t');
				break;
			case 'scroll':
				passFunc += '	vTexCoord += vec2(' + tcMod.sSpeed.toFixed(4) + ' * time, ' + tcMod.tSpeed.toFixed(4) + ' * time);\n';
				break;
			case 'scale':
				passFunc += '	vTexCoord *= vec2(' + tcMod.scaleX.toFixed(4) + ', ' + tcMod.scaleY.toFixed(4) + ');\n';
				break;
			case 'stretch':
				passFunc += [
					'	' + builder.createWaveform('stretchWave', tcMod.wave, true),
					'stretchWave = 1.0 / stretchWave;',
					'vTexCoord *= stretchWave;',
					'vTexCoord += vec2(0.5 - (0.5 * stretchWave), 0.5 - (0.5 * stretchWave));\n'
				].join('\n\t');
				break;
			case 'turb':
				var tName = 'turbTime' + i;
				passFunc += [
					'	float ' + tName + ' = ' + tcMod.turbulance.phase.toFixed(4) + ' + time * ' + tcMod.turbulance.freq.toFixed(4) + ';',
					'vTexCoord.s += sin( ( ( position.x + position.z )* 1.0/128.0 * 0.125 + ' + tName + ' ) * 6.283) * ' + tcMod.turbulance.amp.toFixed(4) + ';',
					'vTexCoord.t += sin( ( position.y * 1.0/128.0 * 0.125 + ' + tName + ' ) * 6.283) * ' + tcMod.turbulance.amp.toFixed(4) + ';\n'
				].join('\n\t');
				break;
			default:
				break;
		}
	}

	passFunc += '	return vTexCoord;\n';
	passFunc += '}';

	builder.addVertexFunction(passName, passFunc);
	builder.addVertexLines([texCoordVar + ' = ' + passName + '(worldPosition, defNormal);']);
};

function buildFragmentPass(builder, script, stage, stageId) {
	var passName = 'fragPass' + stageId;
	var samplerVar = 'texSampler' + stageId;
	var texCoordVar = 'vTexCoord' + stageId;

	builder.addUniform(samplerVar, 'sampler2D');

	var passFunc = 'vec4 ' + passName + '(sampler2D texture, vec2 vTexCoord) {\n';
		passFunc += '	vec4 texColor = texture2D(texture, vTexCoord);\n';

	switch (stage.rgbGen) {
		case 'vertex':  // TODO vertex lighting should multiply by the identityLight constant
		case 'exactvertex':
			passFunc += '	vec3 rgb = texColor.rgb * vColor.rgb;\n';
			break;
		case 'entity':
			passFunc += '	vec3 rgb = texColor.rgb * entityColor.rgb;\n';
			break;
		case 'lightingdiffuse':
			passFunc += '	vec3 diffuse = ambientLight + vDiffuseScale * directedLight;\n';
			passFunc += '	vec3 rgb = texColor.rgb * diffuse;\n';
			break;
		case 'wave':
			passFunc += '	' + builder.createWaveform('rgbWave', stage.rgbWave, false) + '\n';
			passFunc += '	vec3 rgb = texColor.rgb * rgbWave;\n';
			break;
		default:
			passFunc += '	vec3 rgb = texColor.rgb;\n';
			break;
	}

	switch (stage.alphaGen) {
		case 'vertex':
		case 'lightingspecular':
			passFunc += '	float alpha = texColor.a * vColor.a;\n';
			break;
		case 'entity':
			passFunc += '	float alpha = texColor.a * entityColor.a;\n';
			break;
		case 'wave':
			passFunc += '	' + builder.createWaveform('alphaWave', stage.alphaWave, false);
			passFunc += '	float alpha = texColor.a * alphaWave;\n';
			break;
		case 'portal':
			passFunc += '	float alpha = clamp(length(vPosition - viewPosition) / ' + script.portalRange.toFixed(1) + ', 0.0, 1.0);\n';
			break;
		default:
			passFunc += '	float alpha = texColor.a;\n';
			break;
	}

	if (stage.alphaFunc) {
		switch (stage.alphaFunc) {
			case 'GT0':
				passFunc += '	if (alpha == 0.0) { discard; }\n';
				break;
			case 'LT128':
				passFunc += '	if (alpha >= 0.5) { discard; }\n';
				break;
			case 'GE128':
				passFunc += '	if (alpha < 0.5) { discard; }\n';
				break;
			default:
				break;
		}
	}

	passFunc += '	return vec4(rgb, alpha);\n';
	passFunc += '}';

	builder.addFragmentFunction(passName, passFunc);

	if (stageId === 0/* && !script.fog*/) {
		builder.addFragmentLines([
			'vec4 fragColor = ' + passName + '(' + samplerVar + ', ' + texCoordVar + ');'
		]);
	} else {
		builder.addFragmentLines([
			'passColor = ' + passName + '(' + samplerVar + ', ' + texCoordVar + ');',
			builder.createBlend('passColor', 'fragColor', stage.blendSrc, stage.blendDest)
		]);
	}
};

function buildDlightPass(builder, script) {
	var dlightFunc = '#if MAX_DLIGHTS > 0\n' +
					 '	vec4 dlightPass() {\n' +
					 '		vec4 fragColor = vec4(0.0, 0.0, 0.0, 1.0);\n' +
					 '		for (int i = 0; i < MAX_DLIGHTS; i++) {\n' +
					 '			vec3 dir;\n' +
					 '			float distance;\n' +

					 '			if (dlightInfo[i].w > 0.0) {\n' +
					 '				dir = vPosition.xyz - dlightPositions[i].xyz;\n' +
					 '				distance = 1.0 - min((length(dir) / dlightInfo[i].w), 1.0);\n' +
					 '				fragColor.rgb += dlightInfo[i].rgb * distance;\n' +
					 '			}\n' +
					 '		}\n' +
					 '		return fragColor;\n' +
					 '	}\n' +
					 '#endif\n';

	builder.addFragmentFunction('dlightPass', dlightFunc);

	builder.addFragmentLines([
		'#if MAX_DLIGHTS > 0',
		'	passColor = dlightPass();',
		'	' + builder.createBlend('passColor', 'fragColor', 'GL_DST_COLOR', 'GL_ONE'),
		'#endif'
	]);
}

return {
	from: from
};

});