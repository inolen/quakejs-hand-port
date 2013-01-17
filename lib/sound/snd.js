/*global vec3: true */

define('sound/snd',
['underscore', 'glmatrix', 'common/qshared', 'common/asset-cache'],
function (_, glmatrix, QShared, AssetCache) {
	function Snd(imp) {
		var sys = imp.sys;
		var com = imp.com;

		var MAX_GENTITIES = QShared.MAX_GENTITIES;

		var CVF           = QShared.CVF;
		var ERR           = com.ERR;

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
			return new Snd(imp);
		}
	};
});
