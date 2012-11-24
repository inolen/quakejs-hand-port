var root = typeof(global) !== 'undefined' ? global : window;

root.RT = {
	MODEL:               0,
	POLY:                1,
	SPRITE:              2,
	BEAM:                3,
	RAIL_CORE:           4,
	RAIL_RINGS:          5,
	LIGHTNING:           6,
	PORTALSURFACE:       7,                                // doesn't draw anything, just info for portals
	MAX_REF_ENTITY_TYPE: 8
};

root.RF = {
	MINLIGHT:        0x0001,                               // allways have some light (viewmodel, some items)
	THIRD_PERSON:    0x0002,                               // don't draw through eyes, only mirrors (player bodies, chat sprites)
	FIRST_PERSON:    0x0004,                               // only draw through eyes (view weapon, damage blood blob)
	DEPTHHACK:       0x0008,                               // for view weapon Z crunching
	NOSHADOW:        0x0040,                               // don't add stencil shadows
	LIGHTING_ORIGIN: 0x0080,                               // use refEntity->lightingOrigin instead of refEntity->origin
	                                                       // for lighting.  This allows entities to sink into the floor
	                                                       // with their origin going solid, and allows all parts of a
	                                                       // player to get the same lighting
	SHADOW_PLANE:    0x0100,                               // use refEntity->shadowPlane
	WRAP_FRAMES:     0x0200                                // mod the model frames by the maxframes to allow continuous
};