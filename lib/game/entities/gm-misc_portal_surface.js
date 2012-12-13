/*
 * QUAKED misc_portal_surface (0 0 1) (-8 -8 -8) (8 8 8)
 *
 * The portal surface nearest this entity will show a view from the targeted misc_portal_camera, or a mirror view if untargeted.
 * This must be within 64 world units of the surface!
 */
spawnFuncs['misc_portal_surface'] = function (self) {
	self.mins[0] = self.mins[1] = self.mins[2] = 0;
	self.maxs[0] = self.maxs[1] = self.maxs[2] = 0;
	sv.LinkEntity(self);

	self.svFlags = SVF.PORTAL;
	self.s.eType = ET.PORTAL;

	if (!self.target) {
		vec3.set(self.s.origin, self.s.origin2);
	} else {
		self.think = PortalLocateCamera;
		self.nextthink = level.time + 100;
	}
}

function PortalLocateCamera(ent) {
	var owner = PickTarget(ent.target);
	if (!owner) {
		log('Couldn\'t find target for misc_partal_surface');
		FreeEntity(ent);
		return;
	}
	ent.ownerNum = owner.s.number;

	// Frame holds the rotate speed.
	if (owner.spawnflags & 1) {
		ent.s.frame = 25;
	} else if (owner.spawnflags & 2) {
		ent.s.frame = 75;
	}

	// Swing camera.
	if (owner.spawnflags & 4) {
		// set to 0 for no rotation at all
		ent.s.powerups = 0;
	} else {
		ent.s.powerups = 1;
	}

	// clientNum holds the rotate offset.
	ent.s.clientNum = owner.s.clientNum;

	vec3.set(owner.s.origin, ent.s.origin2);

	// See if the portal_camera has a target.
	var dir = [0, 0, 0];

	var target = PickTarget(owner.target);
	if (target) {
		vec3.subtract(target.s.origin, owner.s.origin, dir);
		vec3.normalize(dir);
	} else {
		SetMovedir(owner.s.angles, dir);
	}

	ent.s.eventParm = QMath.DirToByte(dir);
}