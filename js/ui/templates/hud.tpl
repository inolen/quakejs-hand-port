<div class="fps-wrapper"><span class="fps"><%- fps %></span> FPS</div>
<div class="count-wrapper">
	<div><span class="count-label">Shaders:</span> <span class="count-shaders"><%- shaders %></span></div>
	<div><span class="count-label">Vertexes:</span> <span class="count-vertexes">THE FUCK</span></div>
	<div><span class="count-label">Indexes:</span> <span class="count-indexes"><%- indexes %></span></div>
	<div><span class="count-label">Culled faces:</span> <span class="count-culled-faces"><%- culledFaces %></span></div>
	<div><span class="count-label">Culled mod out:</span> <span class="count-culled-model-out"><%- culledModelOut %></span></div>
	<div><span class="count-label">Culled mod in:</span> <span class="count-culled-model-in"><%- culledModelIn %></span></div>
	<div><span class="count-label">Culled mod clip:</span> <span class="count-culled-model-clip"><%- culledModelClip %></span></div>
</div>

<div class="weapons-wrapper">
	<ul class="weapons">
		<% _.each(weapons, function (weapon, i) { %>
			<li><img src="<%= weapon.url %>" /></li>
		<% }); %>
	</ul>
</div>