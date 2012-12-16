/*
 * QUAKED misc_portal_camera (0 0 1) (-8 -8 -8) (8 8 8) slowrotate fastrotate noswing
 * The target for a misc_portal_director.  You can set either angles or target another entity to determine the direction of view.
 * "roll" an angle modifier to orient the camera around the target vector;
 */
spawnFuncs['misc_portal_camera'] = function (self) {
	self.mins[0] = self.mins[1] = self.mins[2] = 0;
	self.maxs[0] = self.maxs[1] = self.maxs[2] = 0;
	sv.LinkEntity(self);

	var roll = SpawnFloat('roll', 0);
	self.s.clientNum = roll / 360.0 * 256;
};