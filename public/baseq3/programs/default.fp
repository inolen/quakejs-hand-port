#ifdef GL_ES
	precision highp float;
#endif

varying vec2 vTexCoord;
varying vec2 vLightmapCoord;
uniform sampler2D texture;
uniform sampler2D lightmap;

void main(void) {
	vec4 diffuseColor = texture2D(texture, vTexCoord);
	vec4 lightColor = texture2D(lightmap, vLightmapCoord);
	gl_FragColor = vec4(diffuseColor.rgb * lightColor.rgb, diffuseColor.a);
}