define('game/bg-defines', ['common/com-defines'], function (com_def) {
	return {
		Pmove: {
			// state (in / out)
			ps: Object.create(com_def.PlayerState),

			// command (in)
			cmd: null,
			tracemask: 0, // collide against these surfaces
			framecount: 0,

			// results (out)
			numtouch: 0,
			touchents: null, //[MAXTOUCH];
			mins: [0, 0, 0],
			maxs: [0, 0, 0]

			// callbacks to test the world
			// these will be different functions during game and cgame
			//void		(*trace)( trace_t *results, const vec3_t start, const vec3_t mins, const vec3_t maxs, const vec3_t end, int passEntityNum, int contentMask );
			//int			(*pointcontents)( const vec3_t point, int passEntityNum );
		}
	};
});