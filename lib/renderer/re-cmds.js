/**
 * RegisterCommands
 */
function RegisterCommands() {
	com.AddCmd('showcluster', CmdShowCluster);
}

/**
 * CmdShowCluster
 */
function CmdShowCluster() {
	var leaf = PointInLeaf(re.viewParms.pvsOrigin);	
	log('Current cluster: ' + leaf.cluster);
}