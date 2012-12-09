<div class="crosshair centerx centery" data-image="gfx/2d/crosshaira"></div>
<div class="crosshair-name centerx centery" style="opacity: <%- crosshairAlpha %>;"><%- crosshairName %></div>

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
	<span class="text armor"><%- armor %></span>
	<div class="bar armor" style="width: <%- (armor / 10) %>em; <% if (armor == 0) { %>display: none;<% } %>"></div>
</div>

<div class="health-wrapper">
	<span class="text health"><%- health %></span>
	<div class="bar health" style="width: <%- (health / 10) %>em; <% if (health == 0) { %>display: none;<% } %>"></div>
</div>
