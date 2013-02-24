
models/flags/redXflagbits
{
	cull none
	// deformVertexes wave 100 sin 0 5 0 .7
	{
		map models/flags/redXflagbits.tga
		blendfunc gl_src_alpha gl_one_minus_src_alpha
		alphaFunc GE128
		rgbGen lightingDiffuse
		depthWrite
	}
}

models/flags/blueXflagbits
{
	cull none
	// deformVertexes wave 100 sin 0 5 0 .7
	{
		map models/flags/blueXflagbits.tga
		blendfunc gl_src_alpha gl_one_minus_src_alpha
		alphaFunc GE128
		rgbGen lightingDiffuse
		depthWrite
	}
}

models/flags/redflagbit
{
	cull disable
	deformVertexes wave 100 sin 0 5 0 .3
	{
		map models/flags/redflagbit.tga
		blendfunc gl_src_alpha gl_one_minus_src_alpha
		alphaFunc GE128
		rgbGen identity
	}
	{
		map models/flags/red_fx.tga
		blendfunc gl_dst_color gl_one
		tcgen environment
		tcmod scroll 0 2
		tcmod turb 1 1 1 1
		rgbGen identity
	}
}

models/flags/blueflagbit
{
	cull disable
	deformVertexes wave 100 sin 0 5 0 .3
	{
		map models/flags/blueflagbit.tga
		blendfunc gl_src_alpha gl_one_minus_src_alpha
		alphaFunc GE128
		rgbGen identity
	}
	{
		map models/flags/blue_fx.tga
		blendfunc gl_dst_color gl_one
		tcgen environment
		tcmod scroll 0 2
		tcmod turb 1 1 1 1
		rgbGen identity
	}
}

models/flags/redbeam
{
	cull disable
	{
		map models/flags/redbeam.tga
		tcMod Scroll .3 0
		blendFunc add
	}
}

models/flags/bluebeam
{
	cull disable
	{
		map models/flags/bluebeam.tga
		tcMod Scroll .3 0
		blendFunc add
	}
}

models/flags/skull_red
{
	cull none
	{
		map models/flags/skull_red.tga
		blendfunc GL_ONE GL_ZERO
		rgbGen lightingDiffuse
	}
	{
		map models/effects/redquad.tga
		blendfunc add
		tcMod turb .5 1 0 .5
		tcMod rotate 300
		rgbGen lightingDiffuse
	}
}

models/flags/skull_blue
{
	cull none
	{
		map models/flags/skull_blue.tga
		blendfunc GL_ONE GL_ZERO
		rgbGen lightingDiffuse
	}
	{
		map models/effects/bluequad.tga
		blendfunc add
		tcMod turb .5 1 0 .5
		tcMod rotate 300
		rgbGen lightingDiffuse
	}
}