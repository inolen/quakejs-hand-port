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
			<li data-index="<%- i %>" class="weapon<% if (i === weaponSelect) { %> selected<% } %>">
				<span class="icon" data-himage="<%= weapons[i].weaponIcon %>"></span>
				<span class="ammo"><%- ammo[i] %></span>
			</li>
		<% } %>
	</ul>
</div>

<div class="armor-wrapper">
	<span class="armor-text"><%- armor %></span>
</div>

<div class="health-wrapper">
	<span class="health-text"><%- health %></span>
</div>

<div class="kills-wrapper">
	Kills: <span class="kills"><%- kills %></span>
</div>

<div class="team-wrapper">
	Team:
	<span class="team">
		<% switch (team) {
		case 1:
			print('RED');
			break;
		case 2:
			print('BLUE');
			break;
		case 3:
			print('SPECTATOR');
			break;
		default:
			print('FREE');
			break;
		} %>
	</span>
</div>

<div class="lagometer-wrapper"<% if (!lagometerVisible) { %> style="display: none;"<% } %>>
	<% for (var i = 0; i < frames.samples.length; i++) { %>
		<div class="frame-wrapper">
			<div data-index="<%- i %>" class="lag-frame">&nbsp</div>
			<div data-index="<%- i %>" class="snapshot-frame">&nbsp</div>
		</div>
	<% } %>
</div>