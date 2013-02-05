/**
 * RegisterCommands
 */
function RegisterCommands() {
	CL.AddCmd('showcluster', CmdShowCluster);
}

/**
 * CmdShowCluster
 */
function CmdShowCluster() {
	var leaf = PointInLeaf(re.viewParms.pvsOrigin);
	log('Current cluster: ' + leaf.cluster);
}