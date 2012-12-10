/**
 * OnSameTeam
 */
function OnSameTeam(ent1, ent2) {
	if (!ent1.client || !ent2.client) {
		return false;
	}

	if (g_gametype() < GT.TEAM) {
		return false;
	}

	if (ent1.client.sess.sessionTeam === ent2.client.sess.sessionTeam) {
		return true;
	}

	return false;
}