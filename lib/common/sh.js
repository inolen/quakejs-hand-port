define('common/sh', ['common/qmath'], function (qm) {
	{{ include sh-defines.js }}
	{{ include sh-msg.js }}

	return {
		BASE_FOLDER:           BASE_FOLDER,
		MAX_QPATH:             MAX_QPATH,
		CMD_BACKUP:            CMD_BACKUP,
		SOLID_BMODEL:          SOLID_BMODEL,

		SNAPFLAG_RATE_DELAYED: SNAPFLAG_RATE_DELAYED,
		SNAPFLAG_NOT_ACTIVE:   SNAPFLAG_NOT_ACTIVE,
		SNAPFLAG_SERVERCOUNT:  SNAPFLAG_SERVERCOUNT,

		GENTITYNUM_BITS:       GENTITYNUM_BITS,
		MAX_CLIENTS:           MAX_CLIENTS,
		MAX_GENTITIES:         MAX_GENTITIES,
		MAX_MODELS:            MAX_MODELS,
		MAX_SOUNDS:            MAX_SOUNDS,

		ENTITYNUM_NONE:        ENTITYNUM_NONE,
		ENTITYNUM_WORLD:       ENTITYNUM_WORLD,
		ENTITYNUM_MAX_NORMAL:  ENTITYNUM_MAX_NORMAL,

		MOVE_RUN:              MOVE_RUN,

		MAX_STATS:             MAX_STATS,
		MAX_PERSISTANT:        MAX_PERSISTANT,
		MAX_POWERUPS:          MAX_POWERUPS,
		MAX_WEAPONS:           MAX_WEAPONS,
		MAX_PS_EVENTS:         MAX_PS_EVENTS,
		PMOVEFRAMECOUNTBITS:   PMOVEFRAMECOUNTBITS,

		CVF:                   CVF,
		BUTTON:                BUTTON,
		TR:                    TR,
		SURF:                  SURF,
		CONTENTS:              CONTENTS,

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