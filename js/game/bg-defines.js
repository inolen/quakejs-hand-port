define('game/bg-defines', ['common/com-defines'], function (q_com_def) {
	return function () {
		return {
			pmove_t: {
				// state (in / out)
				ps: Object.create(q_com_def.playerState_t),

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
	};
});