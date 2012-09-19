define('renderer/re-world', [], function () {
	return function () {
		var re = this;

		function RecursiveWorldNode(nodes) {
		}

		function AddWorldSurfaces(map) {
			re.RecursiveWorldNode(nodes);
		}

		return {
			RecursiveWorldNode: RecursiveWorldNode,
			AddWorldSurfaces: AddWorldSurfaces
		};
	};
});