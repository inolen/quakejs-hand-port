entityEvents['trigger_push'] = {
	spawn: function () {
		var gent = this;
		console.log('spawning trigger_push', gent);
		sv.SetBrushModel(gent, gent.model);
		gent.contents = CONTENTS_TRIGGER; // replaces the -1 from trap_SetBrushModel
		sv.LinkEntity(gent);
	},

	touch: function () {
		console.log('touch');
	}
};