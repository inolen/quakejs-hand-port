define('common/sh', ['common/qmath'], function (qm) {
	{{ include sh-public.js }}
	{{ include sh-local.js }}
	{{ include sh-msg.js }}

	return {
		Err:                   Err,

		PlayerState:           PlayerState,
		Trajectory:            Trajectory,
		Orientation:           Orientation,
		EntityState:           EntityState,

		NetAdrType:            NetAdrType,
		NetSrc:                NetSrc,
		NetAdr:                NetAdr,
		UserCmd:               UserCmd,

		Lumps:                 Lumps,
		MapSurfaceType:        MapSurfaceType,
		lumps_t:               lumps_t,
		dheader_t:             dheader_t,
		dmodel_t:              dmodel_t,
		dshader_t:             dshader_t,
		dplane_t:              dplane_t,
		dnode_t:               dnode_t,
		dleaf_t:               dleaf_t,
		dbrushside_t:          dbrushside_t,
		dbrush_t:              dbrush_t,
		dfog_t:                dfog_t,
		drawVert_t:            drawVert_t,
		dsurface_t:            dsurface_t,

		atob64:                atob64,

		WriteDeltaPlayerState: WriteDeltaPlayerState,
		ReadDeltaPlayerState:  ReadDeltaPlayerState,
		WriteDeltaEntityState: WriteDeltaEntityState,
		ReadDeltaEntityState:  ReadDeltaEntityState
	};
});