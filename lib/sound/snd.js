/*global vec3: true */

define('sound/snd',
['underscore', 'jquery', 'glmatrix', 'common/qshared'],
function (_, $, glmatrix, QShared) {
	function Snd(imp) {
		var sys = imp.sys;
		var com = imp.com;

		var MAX_GENTITIES = QShared.MAX_GENTITIES;

		var CVF           = QShared.CVF;
		var ERR           = com.ERR;

		{{ include snd-defines.js }}
		{{ include snd-main.js }}

		return {
			Init:                 Init,
			Shutdown:             Shutdown,
			Frame:                Frame,
			RegisterSound:        RegisterSound,
			StartSound:           StartSound,
			StartLocalSound:      StartLocalSound,
			StartBackgroundTrack: StartBackgroundTrack,
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
