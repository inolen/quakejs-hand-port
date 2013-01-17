/*global vec3: true */

define('sound/snd',
['underscore', 'glmatrix', 'common/qshared', 'common/asset-cache'],
function (_, glmatrix, QS, AssetCache) {
	function Sound(imp) {
		var SYS = imp.SYS;
		var COM = imp.COM;

		{{ include snd-defines.js }}
		{{ include snd-main.js }}
		{{ include snd-cvar.js }}

		return {
			Init:                 Init,
			Shutdown:             Shutdown,
			Frame:                Frame,
			RegisterSound:        RegisterSound,
			StartSound:           StartSound,
			StartLocalSound:      StartLocalSound,
			StartBackgroundTrack: StartBackgroundTrack,
			AddLoopingSound:      AddLoopingSound,
			Respatialize:         Respatialize,
			UpdateEntityPosition: UpdateEntityPosition
		};
	}

	return {
		CreateInstance: function (imp) {
			return new Sound(imp);
		}
	};
});
