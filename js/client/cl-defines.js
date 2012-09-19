define('client/cl-defines', [], function () {
	return {
		ClientActive: {
			mouseX: 0,
			mouseY: 0,

			/*UserCmd cmds[CMD_BACKUP]; // each mesage will send several old cmds
			int       cmdNumber;        // incremented each frame, because multiple
																	// frames may need to be packed into a single packet*/

			// the client maintains its own idea of view angles, which are
			// sent to the server each frame.  It is cleared to 0 upon entering each level.
			// the server sends a delta each frame which is added to the locally
			// tracked view angles to account for standing on rotating objects,
			// and teleport direction changes
			viewangles: [0, 0, 0]
		},

		ClientConnection: {
			/*connstate_t	state;
			var clientNum;*/
			challenge: 0,
			netchan: null
		},

		KeyState: {
			active: false,
			downtime: 0,
			partial: 0,
			binding: null
		}
	};
});