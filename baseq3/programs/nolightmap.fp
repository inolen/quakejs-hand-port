#ifdef GL_ES
	precision highp float;
#endif

varying vec2 vTexCoord;
varying vec4 vColor;
uniform sampler2D texture;

void main(void) {
	vec4 diffuseColor = texture2D(texture, vTexCoord);
	gl_FragColor = vec4(diffuseColor.rgb * vColor.rgb, diffuseColor.a);
}