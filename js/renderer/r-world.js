define('renderer/r-world', [], function () {
	return function (q_shared) {
		return {
			RecursiveWorldNode: function (nodes) {
			},

			AddWorldSurfaces: function (map) {
				this.RecursiveWorldNode(nodes);
			}
		};
	};
});