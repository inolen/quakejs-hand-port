/**
 * RegisterCommands
 */
function RegisterCommands() {
	com.AddCmd('showcluster', CmdShowCluster);
	com.AddCmd('dlightnext',  CmdDlightNext);
	com.AddCmd('dlightprev',  CmdDlightPrev);
}

/**
 * CmdShowCluster
 */
function CmdShowCluster() {
	var leaf = PointInLeaf(re.viewParms.pvsOrigin);
	log('Current cluster: ' + leaf.cluster);
}

/**
 * CmdDlightNext
 */
function CmdDlightNext() {
	var dlight = r_activeDlight();

	dlight++;

	if (dlight >= MAX_DLIGHTS) {
		dlight = -1;
	}

	log('ACTIVE DLIGHT', dlight);

	r_activeDlight(dlight);
}

/**
 * CmdDlightPrev
 */
function CmdDlightPrev() {
	var dlight = r_activeDlight();

	dlight--;

	if (dlight < -1) {
		dlight = MAX_DLIGHTS - 1;
	}

	log('ACTIVE DLIGHT', dlight);

	r_activeDlight(dlight);
}