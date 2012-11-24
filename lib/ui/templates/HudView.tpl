<div class="crosshair abscenter" data-image="gfx/2d/crosshaira"></div>

<div class="fps-wrapper">
	<span class="fps"><%- fps %></span> FPS
</div>

<div class="count-wrapper">
	<div><span class="count-label">Shaders:</span> <span class="count-shaders"><%- shaders %></span></div>
	<div><span class="count-label">Vertexes:</span> <span class="count-vertexes"><%- vertexes %></span></div>
	<div><span class="count-label">Indexes:</span> <span class="count-indexes"><%- indexes %></span></div>
	<div><span class="count-label">Culled faces:</span> <span class="count-culled-faces"><%- culledFaces %></span></div>
	<div><span class="count-label">Culled mod out:</span> <span class="count-culled-model-out"><%- culledModelOut %></span></div>
	<div><span class="count-label">Culled mod in:</span> <span class="count-culled-model-in"><%- culledModelIn %></span></div>
	<div><span class="count-label">Culled mod clip:</span> <span class="count-culled-model-clip"><%- culledModelClip %></span></div>
</div>

<div class="weapons-wrapper">
	<ul class="weapons">
		<% for (var i = 0; i < weapons.length; i++) { %>
			<% if (!weapons[i]) continue; %>
			<li<% if (i === weaponSelect) { %> class="selected"<% } %>>
				<span class="icon" data-himage="<%= weapons[i].weaponIcon %>"></span>
				<span class="ammo"><%- ammo[i] %></span>
			</li>
		<% } %>
	</ul>
</div>

<div class="armor-wrapper">
	Armor: <span class="armor"><%- armor %></span>
</div>

<div class="health-wrapper">
	Health: <span class="health"><%- health %></span>
</div>