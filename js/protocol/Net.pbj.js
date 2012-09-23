"use strict";
/** @suppress {duplicate}*/var Net;
if (typeof(Net)=="undefined") {Net = {};}

Net.ClientOp = PROTO.Message("Net.ClientOp",{
	Type: PROTO.Enum("Net.ClientOp.Type",{
		nop :1,
		move :2,
		moveNoDelta :3,
		clientCommand :4	}),
	type: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return Net.ClientOp.Type;},
		id: 1
	},
	clop_move: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return Net.ClientOp_UserCmd;},
		id: 2
	}});
Net.ClientOp_UserCmd = PROTO.Message("Net.ClientOp_UserCmd",{
	serverTime: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.uint32;},
		id: 1
	},
	angles: {
		options: {packed:true},
		multiplicity: PROTO.repeated,
		type: function(){return PROTO.Float;},
		id: 2
	},
	forwardmove: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.int32;},
		id: 3
	},
	rightmove: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.int32;},
		id: 4
	},
	upmove: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.int32;},
		id: 5
	}});
Net.ServerOp = PROTO.Message("Net.ServerOp",{
	Type: PROTO.Enum("Net.ServerOp.Type",{
		gamestate :1,
		configstring :2,
		baseline :3,
		serverCommand :4,
		snapshot :5	}),
ConfigString : PROTO.Message("Net.ServerOp.ConfigString",{
	key: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.string;},
		id: 1
	},
	value: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.string;},
		id: 2
	}})
,
	type: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return Net.ServerOp.Type;},
		id: 1
	},
	svop_gamestate: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return Net.ServerOp_Gamestate;},
		id: 2
	},
	svop_snapshot: {
		options: {},
		multiplicity: PROTO.optional,
		type: function(){return Net.ServerOp_Snapshot;},
		id: 3
	}});
Net.ServerOp_Gamestate = PROTO.Message("Net.ServerOp_Gamestate",{
	configstrings: {
		options: {},
		multiplicity: PROTO.repeated,
		type: function(){return Net.ServerOp.ConfigString;},
		id: 1
	}});
Net.ServerOp_Snapshot = PROTO.Message("Net.ServerOp_Snapshot",{
	origin: {
		options: {packed:true},
		multiplicity: PROTO.repeated,
		type: function(){return PROTO.Float;},
		id: 1
	}});
Net.EntityState = PROTO.Message("Net.EntityState",{
Trajectory : PROTO.Message("Net.EntityState.Trajectory",{
	type: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.uint32;},
		id: 1
	},
	tyme: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.uint32;},
		id: 2
	},
	durashun: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.uint32;},
		id: 3
	},
	base: {
		options: {packed:true},
		multiplicity: PROTO.repeated,
		type: function(){return PROTO.Float;},
		id: 4
	},
	delta: {
		options: {packed:true},
		multiplicity: PROTO.repeated,
		type: function(){return PROTO.Float;},
		id: 5
	}})
,
	number: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return int;},
		id: 1
	},
	pos: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return Net.EntityState.Trajectory;},
		id: 2
	},
	apos: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return Net.EntityState.Trajectory;},
		id: 3
	},
	tyme: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.uint32;},
		id: 4
	},
	tyme2: {
		options: {},
		multiplicity: PROTO.required,
		type: function(){return PROTO.uint32;},
		id: 5
	},
	origin: {
		options: {packed:true},
		multiplicity: PROTO.repeated,
		type: function(){return PROTO.Float;},
		id: 6
	},
	origin2: {
		options: {packed:true},
		multiplicity: PROTO.repeated,
		type: function(){return PROTO.Float;},
		id: 7
	},
	angles: {
		options: {packed:true},
		multiplicity: PROTO.repeated,
		type: function(){return PROTO.Float;},
		id: 8
	},
	angles2: {
		options: {packed:true},
		multiplicity: PROTO.repeated,
		type: function(){return PROTO.Float;},
		id: 9
	},
	clientNum: {
		options: {},
		multiplicity: PROTO.repeated,
		type: function(){return PROTO.uint32;},
		id: 10
	},
	frame: {
		options: {},
		multiplicity: PROTO.repeated,
		type: function(){return PROTO.uint32;},
		id: 11
	}});
