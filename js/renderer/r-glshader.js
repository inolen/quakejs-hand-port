/*
 * Q3RGLShader.js - Transforms a parsed Q3 shader definition into a set of WebGL compatible states
 */

/*
 * Copyright (c) 2009 Brandon Jones
 *
 * This software is provided 'as-is', without any express or implied
 * warranty. In no event will the authors be held liable for any damages
 * arising from the use of this software.
 *
 * Permission is granted to anyone to use this software for any purpose,
 * including commercial applications, and to alter it and redistribute it
 * freely, subject to the following restrictions:
 *
 *    1. The origin of this software must not be misrepresented; you must not
 *    claim that you wrote the original software. If you use this software
 *    in a product, an acknowledgment in the product documentation would be
 *    appreciated but is not required.
 *
 *    2. Altered source versions must be plainly marked as such, and must not
 *    be misrepresented as being the original software.
 *
 *    3. This notice may not be removed or altered from any source
 *    distribution.
 */


//
// Default Shaders
//
q3bsp_default_vertex = '\
  #ifdef GL_ES \n\
  precision highp float; \n\
  #endif \n\
  attribute vec3 position; \n\
  attribute vec3 normal; \n\
  attribute vec2 texCoord; \n\
  attribute vec2 lightCoord; \n\
  attribute vec4 color; \n\
\n\
  varying vec2 vTexCoord; \n\
  varying vec2 vLightmapCoord; \n\
  varying vec4 vColor; \n\
\n\
  uniform mat4 modelViewMat; \n\
  uniform mat4 projectionMat; \n\
\n\
  void main(void) { \n\
    vec4 worldPosition = modelViewMat * vec4(position, 1.0); \n\
    vTexCoord = texCoord; \n\
    vColor = color; \n\
    vLightmapCoord = lightCoord; \n\
    gl_Position = projectionMat * worldPosition; \n\
  } \n\
';

q3bsp_default_fragment = '\
  #ifdef GL_ES \n\
  precision highp float; \n\
  #endif \n\
  varying vec2 vTexCoord; \n\
  varying vec2 vLightmapCoord; \n\
  uniform sampler2D texture; \n\
  uniform sampler2D lightmap; \n\
\n\
  void main(void) { \n\
    vec4 diffuseColor = texture2D(texture, vTexCoord); \n\
    vec4 lightColor = texture2D(lightmap, vLightmapCoord); \n\
    gl_FragColor = vec4(diffuseColor.rgb * lightColor.rgb, diffuseColor.a); \n\
  } \n\
';

q3bsp_model_fragment = '\
  #ifdef GL_ES \n\
  precision highp float; \n\
  #endif \n\
  varying vec2 vTexCoord; \n\
  varying vec4 vColor; \n\
  uniform sampler2D texture; \n\
\n\
  void main(void) { \n\
    vec4 diffuseColor = texture2D(texture, vTexCoord); \n\
    gl_FragColor = vec4(diffuseColor.rgb * vColor.rgb, diffuseColor.a); \n\
  } \n\
';

(function(q3w) {
  var _defaultProgram = null;
  var _modelProgram = null;

  q3w.R_InitGLShaders = function() {
    var gl = this.gl;

    _defaultProgram = CompileShaderProgram(gl, q3bsp_default_vertex, q3bsp_default_fragment);
    _modelProgram = CompileShaderProgram(gl, q3bsp_default_vertex, q3bsp_model_fragment);
  }

  /**
   * Setup render state
   */
  q3w.R_SetShader = function(shader) {
    var gl = this.gl;

    if (!shader) {
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);
    } else if (shader.cull && !shader.sky) {
      gl.enable(gl.CULL_FACE);
      gl.cullFace(shader.cull);
    } else {
      gl.disable(gl.CULL_FACE);
    }

    return true;
  }

  q3w.R_SetShaderStage = function(shader, stage, time) {
    var gl = this.gl;

    if (stage.animFreq) {
      // Texture animation seems like a natural place for setInterval, but that approach has proved error prone.
      // It can easily get out of sync with other effects (like rgbGen pulses and whatnot) which can give a
      // jittery or flat out wrong appearance. Doing it this way ensures all effects are synced.
      var animFrame = Math.floor(time*stage.animFreq) % stage.animTexture.length;
      stage.texture = stage.animTexture[animFrame];
    }

    gl.blendFunc(stage.blendSrc, stage.blendDest);

    if (stage.depthWrite && !shader.sky) {
      gl.depthMask(true);
    } else {
      gl.depthMask(false);
    }

    gl.depthFunc(stage.depthFunc);

    gl.useProgram(stage.program);

    var texture = stage.texture || this.R_FindImage('*default');

    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(stage.program.uniform.texture, 0);
    gl.bindTexture(gl.TEXTURE_2D, texture.texnum);

    if (stage.program.uniform.lightmap) {
      var lightmap = this.R_FindImage('*lightmap');
      gl.activeTexture(gl.TEXTURE1);
      gl.uniform1i(stage.program.uniform.lightmap, 1);;
      gl.bindTexture(gl.TEXTURE_2D, lightmap.texnum);
    }

    if (stage.program.uniform.time) {
      gl.uniform1f(stage.program.uniform.time, time);
    }
  };

  /**
   * Shader compilation
   */
  function TranslateDepthFunc(gl, depth) {
    if(!depth) { return gl.LEQUAL; }
    switch(depth.toLowerCase()) {
      case 'gequal': return gl.GEQUAL;
      case 'lequal': return gl.LEQUAL;
      case 'equal': return gl.EQUAL;
      case 'greater': return gl.GREATER;
      case 'less': return gl.LESS;
      default: return gl.LEQUAL;
    }
  }

  function TranslateCull(gl, cull) {
    if (cull) {
      cull = cull.toLowerCase();

      if (cull == 'none' || cull == 'twosided' || cull == 'disable') {
       return null;
      } else if (cull == 'back' || cull == 'backside' || cull == 'backsided') {
        return gl.BACK;
      }
    }

    return gl.FRONT;
  }

  function TranslateBlend(gl, blend) {
    if(!blend) { return gl.ONE; }
    switch(blend.toUpperCase()) {
      case 'GL_ONE': return gl.ONE;
      case 'GL_ZERO': return gl.ZERO;
      case 'GL_DST_COLOR': return gl.DST_COLOR;
      case 'GL_ONE_MINUS_DST_COLOR': return gl.ONE_MINUS_DST_COLOR;
      case 'GL_SRC_ALPHA ': return gl.SRC_ALPHA;
      case 'GL_ONE_MINUS_SRC_ALPHA': return gl.ONE_MINUS_SRC_ALPHA;
      case 'GL_SRC_COLOR': return gl.SRC_COLOR;
      case 'GL_ONE_MINUS_SRC_COLOR': return gl.ONE_MINUS_SRC_COLOR;
      default: return gl.ONE;
    }
  }

  q3w.R_BuildGLShaderForShader = function (shader) {
    var gl = this.gl;

    var glshader = {
      cull: TranslateCull(gl, shader.cull),
      sort: shader.sort,
      sky: shader.sky,
      blend: shader.blend,
      name: shader.name,
      lightmap: shader.lightmap,
      stages: []
    };

    for (var i = 0; i < shader.stages.length; i++) {
      var stage = shader.stages[i],
        vertexSrc = GenerateVertexShader(gl, shader, stage),
        fragmentSrc = GenerateFragmentShader(gl, shader, stage);

      var glstage = _.clone(stage);

      glstage.blendSrc = TranslateBlend(gl, stage.blendSrc);
      glstage.blendDest = TranslateBlend(gl, stage.blendDest);
      glstage.depthFunc = TranslateDepthFunc(gl, stage.depthFunc);
      glstage.program = CompileShaderProgram(gl, vertexSrc, fragmentSrc);

      glshader.stages.push(glstage);
    }

    return glshader;
  };

  q3w.R_BuildGLShaderForTexture = function (texture) {
    var gl = this.gl;

    var glshader = {
      cull: gl.FRONT,
      blend: false,
      sort: 3,
      stages: [
        {
          map: texture,
          isLightmap: false,
          blendSrc: gl.ONE,
          blendDest: gl.ZERO,
          depthFunc: gl.LEQUAL,
          depthWrite: true,
          texture: this.R_FindImage(texture),
          program: _defaultProgram
        }
      ]
    };

    return glshader;
  };

    //
  // WebGL Shader builder utility
  //
  var shaderBuilder = function() {
    this.attrib = {};
    this.varying = {};
    this.uniform = {};
    this.functions = {};
    this.statements = [];
  };

  shaderBuilder.prototype.addAttribs = function(attribs) {
    for (var name in attribs) {
      this.attrib[name] = 'attribute ' + attribs[name] + ' ' + name + ';'
    }
  };

  shaderBuilder.prototype.addVaryings = function(varyings) {
    for (var name in varyings) {
      this.varying[name] = 'varying ' + varyings[name] + ' ' + name + ';'
    }
  };

  shaderBuilder.prototype.addUniforms = function(uniforms) {
    for (var name in uniforms) {
      this.uniform[name] = 'uniform ' + uniforms[name] + ' ' + name + ';'
    }
  };

  shaderBuilder.prototype.addFunction = function(name, lines) {
    this.functions[name] = lines.join('\n');
  };

  shaderBuilder.prototype.addLines = function(statements) {
    for (var i = 0; i < statements.length; ++i) {
      this.statements.push(statements[i]);
    }
  };

  shaderBuilder.prototype.getSource = function() {
    var src = '\
    #ifdef GL_ES \n\
    precision highp float; \n\
    #endif \n';

    for (var i in this.attrib) {
      src += this.attrib[i] + '\n';
    }

    for (var i in this.varying) {
      src += this.varying[i] + '\n';
    }

    for (var i in this.uniform) {
      src += this.uniform[i] + '\n';
    }

    for (var i in this.functions) {
      src += this.functions[i] + '\n';
    }

    src += 'void main(void) {\n\t';
    src += this.statements.join('\n\t');
    src += '\n}\n';

    return src;
  };

  shaderBuilder.prototype.addWaveform = function(name, wf, timeVar) {
    if (!wf) {
      this.statements.push('float ' + name + ' = 0.0;');
      return;
    }

    if (!timeVar) { timeVar = 'time'; }

    if (typeof(wf.phase) == "number") {
      wf.phase = wf.phase.toFixed(4)
    }

    switch (wf.funcName) {
      case 'sin':
      this.statements.push('float ' + name + ' = ' + wf.base.toFixed(4) + ' + sin((' + wf.phase + ' + ' + timeVar + ' * ' + wf.freq.toFixed(4) + ') * 6.283) * ' + wf.amp.toFixed(4) + ';');
      return;
      case 'square': funcName = 'square'; this.addSquareFunc(); break;
      case 'triangle': funcName = 'triangle'; this.addTriangleFunc(); break;
      case 'sawtooth': funcName = 'fract'; break;
      case 'inversesawtooth': funcName = '1.0 - fract'; break;
      default:
      this.statements.push('float ' + name + ' = 0.0;');
      return;
    }

    this.statements.push('float ' + name + ' = ' + wf.base.toFixed(4) + ' + ' + funcName + '(' + wf.phase + ' + ' + timeVar + ' * ' + wf.freq.toFixed(4) + ') * ' + wf.amp.toFixed(4) + ';');
  };

  shaderBuilder.prototype.addSquareFunc = function() {
    this.addFunction('square', [
      'float square(float val) {',
      '   return (mod(floor(val*2.0)+1.0, 2.0) * 2.0) - 1.0;',
      '}',
    ]);
  };

  shaderBuilder.prototype.addTriangleFunc = function() {
    this.addFunction('triangle', [
      'float triangle(float val) {',
      '   return abs(2.0 * fract(val) - 1.0);',
      '}',
    ]);
  };

  //
  // Shader program compilation
  //
  function CompileShaderProgram(gl, vertexSrc, fragmentSrc) {
    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentSrc);
    gl.compileShader(fragmentShader);

    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      gl.deleteShader(fragmentShader);
      return null;
    }

    var vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexSrc);
    gl.compileShader(vertexShader);

    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      gl.deleteShader(vertexShader);
      return null;
    }

    var shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      gl.deleteProgram(shaderProgram);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      return null;
    }

    var i, attrib, uniform;
    var attribCount = gl.getProgramParameter(shaderProgram, gl.ACTIVE_ATTRIBUTES);
    shaderProgram.attrib = {};
    for (i = 0; i < attribCount; i++) {
      attrib = gl.getActiveAttrib(shaderProgram, i);
      shaderProgram.attrib[attrib.name] = gl.getAttribLocation(shaderProgram, attrib.name);
    }

    var uniformCount = gl.getProgramParameter(shaderProgram, gl.ACTIVE_UNIFORMS);
    shaderProgram.uniform = {};
    for (i = 0; i < uniformCount; i++) {
      uniform = gl.getActiveUniform(shaderProgram, i);
      shaderProgram.uniform[uniform.name] = gl.getUniformLocation(shaderProgram, uniform.name);
    }

    return shaderProgram;
  }

  function GenerateVertexShader(gl, stageShader, stage) {
    var shader = new shaderBuilder();

    shader.addAttribs({
      position: 'vec3',
      normal: 'vec3',
      color: 'vec4',
    });

    shader.addVaryings({
      vTexCoord: 'vec2',
      vColor: 'vec4',
    });

    shader.addUniforms({
      modelViewMat: 'mat4',
      projectionMat: 'mat4',
      time: 'float',
    });

    if (stage.isLightmap) {
      shader.addAttribs({ lightCoord: 'vec2' });
    } else {
      shader.addAttribs({ texCoord: 'vec2' });
    }

    shader.addLines(['vec3 defPosition = position;']);

    for(var i = 0; i < stageShader.vertexDeforms.length; ++i) {
      var deform = stageShader.vertexDeforms[i];

      switch(deform.type) {
        case 'wave':
          var name = 'deform' + i;
          var offName = 'deformOff' + i;

          shader.addLines([
            'float ' + offName + ' = (position.x + position.y + position.z) * ' + deform.spread.toFixed(4) + ';'
          ]);

          var phase = deform.waveform.phase;
          deform.waveform.phase = phase.toFixed(4) + ' + ' + offName;
          shader.addWaveform(name, deform.waveform);
          deform.waveform.phase = phase;

          shader.addLines([
            'defPosition += normal * ' + name + ';'
          ]);
          break;
        default: break;
      }
    }

    shader.addLines(['vec4 worldPosition = modelViewMat * vec4(defPosition, 1.0);']);
    shader.addLines(['vColor = color;']);

    if (stage.tcGen == 'environment') {
      shader.addLines([
      'vec3 viewer = normalize(-worldPosition.xyz);',
      'float d = dot(normal, viewer);',
      'vec3 reflected = normal*2.0*d - viewer;',
      'vTexCoord = vec2(0.5, 0.5) + reflected.xy * 0.5;'
      ]);
    } else {
      // Standard texturing
      if(stage.isLightmap) {
        shader.addLines(['vTexCoord = lightCoord;']);
      } else {
        shader.addLines(['vTexCoord = texCoord;']);
      }
    }

    // tcMods
    for(var i = 0; i < stage.tcMods.length; ++i) {
      var tcMod = stage.tcMods[i];
      switch(tcMod.type) {
      case 'rotate':
        shader.addLines([
        'float r = ' + tcMod.angle.toFixed(4) + ' * time;',
        'vTexCoord -= vec2(0.5, 0.5);',
        'vTexCoord = vec2(vTexCoord.s * cos(r) - vTexCoord.t * sin(r), vTexCoord.t * cos(r) + vTexCoord.s * sin(r));',
        'vTexCoord += vec2(0.5, 0.5);',
        ]);
        break;
      case 'scroll':
        shader.addLines([
        'vTexCoord += vec2(' + tcMod.sSpeed.toFixed(4) + ' * time, ' + tcMod.tSpeed.toFixed(4) + ' * time);'
        ]);
        break;
      case 'scale':
        shader.addLines([
        'vTexCoord *= vec2(' + tcMod.scaleX.toFixed(4) + ', ' + tcMod.scaleY.toFixed(4) + ');'
        ]);
        break;
      case 'stretch':
        shader.addWaveform('stretchWave', tcMod.waveform);
        shader.addLines([
        'stretchWave = 1.0 / stretchWave;',
        'vTexCoord *= stretchWave;',
        'vTexCoord += vec2(0.5 - (0.5 * stretchWave), 0.5 - (0.5 * stretchWave));',
        ]);
        break;
      case 'turb':
        var tName = 'turbTime' + i;
        shader.addLines([
        'float ' + tName + ' = ' + tcMod.turbulance.phase.toFixed(4) + ' + time * ' + tcMod.turbulance.freq.toFixed(4) + ';',
        'vTexCoord.s += sin( ( ( position.x + position.z )* 1.0/128.0 * 0.125 + ' + tName + ' ) * 6.283) * ' + tcMod.turbulance.amp.toFixed(4) + ';',
        'vTexCoord.t += sin( ( position.y * 1.0/128.0 * 0.125 + ' + tName + ' ) * 6.283) * ' + tcMod.turbulance.amp.toFixed(4) + ';'
        ]);
        break;
      default: break;
      }
    }

    switch(stage.alphaGen) {
      case 'lightingspecular':
      shader.addAttribs({ lightCoord: 'vec2' });
      shader.addVaryings({ vLightCoord: 'vec2' });
      shader.addLines([ 'vLightCoord = lightCoord;' ]);
      break;
      default:
      break;
    }

    shader.addLines(['gl_Position = projectionMat * worldPosition;']);

    return shader.getSource();
  }

  function GenerateFragmentShader(gl, stageShader, stage) {
    var shader = new shaderBuilder();

    shader.addVaryings({
      vTexCoord: 'vec2',
      vColor: 'vec4',
    });

    shader.addUniforms({
      texture: 'sampler2D',
      time: 'float',
    });

    shader.addLines(['vec4 texColor = texture2D(texture, vTexCoord.st);']);

    switch(stage.rgbGen) {
      case 'vertex':
      shader.addLines(['vec3 rgb = texColor.rgb * vColor.rgb;']);
      break;
      case 'wave':
      shader.addWaveform('rgbWave', stage.rgbWaveform);
      shader.addLines(['vec3 rgb = texColor.rgb * rgbWave;']);
      break;
      default:
      shader.addLines(['vec3 rgb = texColor.rgb;']);
      break;
    }

    switch(stage.alphaGen) {
      case 'wave':
      shader.addWaveform('alpha', stage.alphaWaveform);
      break;
      case 'lightingspecular':
      // For now this is VERY special cased. May not work well with all instances of lightingSpecular
      shader.addUniforms({
        lightmap: 'sampler2D'
      });
      shader.addVaryings({
        vLightCoord: 'vec2',
        vLight: 'float'
      });
      shader.addLines([
        'vec4 light = texture2D(lightmap, vLightCoord.st);',
        'rgb *= light.rgb;',
        'rgb += light.rgb * texColor.a * 0.6;', // This was giving me problems, so I'm ignorning an actual specular calculation for now
        'float alpha = 1.0;'
      ]);
      break;
      default:
      shader.addLines(['float alpha = texColor.a;']);
      break;
    }

    if(stage.alphaFunc) {
      switch(stage.alphaFunc) {
      case 'GT0':
        shader.addLines([
        'if(alpha == 0.0) { discard; }'
        ]);
        break;
      case 'LT128':
        shader.addLines([
        'if(alpha >= 0.5) { discard; }'
        ]);
        break;
      case 'GE128':
        shader.addLines([
        'if(alpha < 0.5) { discard; }'
        ]);
        break;
      default:
        break;
      }
    }

    shader.addLines(['gl_FragColor = vec4(rgb, alpha);']);

    return shader.getSource();
  }
})(window.q3w = window.q3w || {});