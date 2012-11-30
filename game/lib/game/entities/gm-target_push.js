entityEvents['target_push'] = {
	spawn: function (self) {
		if (!self.speed) {
			self.speed = 1000;
		}

		//G_SetMovedir (self->s.angles, self->s.origin2);
		//VectorScale (self->s.origin2, self->speed, self->s.origin2);

		/*if ( self->spawnflags & 1 ) {
			self->noise_index = G_SoundIndex("sound/world/jumppad.wav");
		} else {
			self->noise_index = G_SoundIndex("sound/misc/windfly.wav");
		}*/

		// if ( self->target ) {
		// 	VectorCopy( self->s.origin, self->r.absmin );
		// 	VectorCopy( self->s.origin, self->r.absmax );
		// 	self->think = AimAtTarget;
		// 	self->nextthink = level.time + FRAMETIME;
		// }
	}
};