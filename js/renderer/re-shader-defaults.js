var defaultVertexShaderSrc = '\
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

var defaultFragmentShaderSrc = '\
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

var modelFragmnetShaderSrc = '\
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