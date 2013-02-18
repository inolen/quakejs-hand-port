/*global mat4: true, vec3: true, vec4: true */

define(function (require) {
	var _             = require('underscore');
	var glmatrix      = require('glmatrix');
	var QMath         = require('common/qmath');
	var QS            = require('common/qshared');
	var SURF          = require('common/surfaceflags');
	var TextTokenizer = require('common/text-tokenizer');
	var Cvar          = require('common/cvar');
	var BothGame      = require('game/bg');

	function CGame(imp) {
		var SYS = imp.SYS;
		var CL  = imp.CL;
		var CM  = imp.CM;
		var RE  = imp.RE;
		var SND = imp.SND;
		var UI  = imp.UI;
		var BG  = new BothGame(BGExports());

		var CMD_BACKUP             = QS.CMD_BACKUP;
		var SOLID_BMODEL           = QS.SOLID_BMODEL;
		var SNAPFLAG_NOT_ACTIVE    = QS.SNAPFLAG_NOT_ACTIVE;
		var SNAPFLAG_SERVERCOUNT   = QS.SNAPFLAG_SERVERCOUNT;
		var MAX_CLIENTS            = QS.MAX_CLIENTS;
		var MAX_GENTITIES          = QS.MAX_GENTITIES;
		var MAX_POWERUPS           = QS.MAX_POWERUPS;
		var MAX_WEAPONS            = QS.MAX_WEAPONS;
		var MAX_PS_EVENTS          = QS.MAX_PS_EVENTS;
		var ARENANUM_NONE          = QS.ARENANUM_NONE;
		var ENTITYNUM_NONE         = QS.ENTITYNUM_NONE;
		var ENTITYNUM_WORLD        = QS.ENTITYNUM_WORLD;
		var ENTITYNUM_MAX_NORMAL   = QS.ENTITYNUM_MAX_NORMAL;
		var RANK_TIED_FLAG         = BG.RANK_TIED_FLAG;
		var DEFAULT_SHOTGUN_SPREAD = BG.DEFAULT_SHOTGUN_SPREAD;
		var DEFAULT_SHOTGUN_COUNT  = BG.DEFAULT_SHOTGUN_COUNT;
		var LIGHTNING_RANGE        = BG.LIGHTNING_RANGE;
		var SCORE_NOT_PRESENT      = BG.SCORE_NOT_PRESENT;
		var DEFAULT_VIEWHEIGHT     = BG.DEFAULT_VIEWHEIGHT;
		var CROUCH_VIEWHEIGHT      = BG.CROUCH_VIEWHEIGHT;
		var ANIM_TOGGLEBIT         = BG.ANIM_TOGGLEBIT;
		var EV_EVENT_BITS          = BG.EV_EVENT_BITS;
		var EVENT_VALID_MSEC       = BG.EVENT_VALID_MSEC;

		var CVAR                   = QS.CVAR;
		var BUTTON                 = QS.BUTTON;
		var TR                     = QS.TR;
		var CONTENTS               = QS.CONTENTS;
		var PM                     = BG.PM;
		var PMF                    = BG.PMF;
		var GT                     = BG.GT;
		var GS                     = BG.GS;
		var WS                     = BG.WS;
		var IT                     = BG.IT;
		var MASK                   = BG.MASK;
		var STAT                   = BG.STAT;
		var WP                     = BG.WP;
		var PW                     = BG.PW;
		var TEAM                   = BG.TEAM;
		var SPECTATOR              = BG.SPECTATOR;
		var PERS                   = BG.PERS;
		var PLAYEREVENTS           = BG.PLAYEREVENTS;
		var ET                     = BG.ET;
		var EF                     = BG.EF;
		var EV                     = BG.EV;
		var GTS                    = BG.GTS;
		var ANIM                   = BG.ANIM;
		var MOD                    = BG.MOD;
		var RT                     = RE.RT;
		var RF                     = RE.RF;
		var RDF                    = RE.RDF;

		<% include cg-defines.js %>
		<% include cg-main.js %>
		<% include cg-cmds.js %>
		<% include cg-draw.js %>
		<% include cg-effects.js %>
		<% include cg-ents.js %>
		<% include cg-event.js %>
		<% include cg-localents.js %>
		<% include cg-players.js %>
		<% include cg-playerstate.js %>
		<% include cg-predict.js %>
		<% include cg-servercmds.js %>
		<% include cg-snapshot.js %>
		<% include cg-view.js %>
		<% include cg-weapons.js %>

		return {
			Init: Init,
			Shutdown: Shutdown,
			Frame: Frame,
			HandleEscape: HandleEscape
		};
	}

	return CGame;
});
