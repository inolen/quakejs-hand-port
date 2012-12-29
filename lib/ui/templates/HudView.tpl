<div class="crosshair centerx centery" data-image="gfx/2d/crosshaira"></div>
<div class="crosshair-name centerx centery" style="opacity: <%- crosshairAlpha %>;"><%- crosshairName %></div>

<div class="gamestate-wrapper">
	<div class="gametype-info">
	</div>
	<div class="scores">
		<div class="score score1<% if (score1 && score1.localplayer) { %> localplayer<% } %>">
			<span class="name"><% if (score1 !== null) { %><%- score1.rank %>. <%- score1.name %><% } %></span>
			<span class="score"><% if (score1 !== null) { %><%- score1.score %><% } %></span>
		</div>
		<div class="score score2<% if (score2 && score2.localplayer) { %> localplayer<% } %>">
			<span class="name"><% if (score2 !== null) { %><%- score2.rank %>. <%- score2.name %><% } %></span>
			<span class="score"><% if (score2 !== null) { %><%- score2.score %><% } %></span>
		</div>
	</div>
</div>

<div class="fps-wrapper">
	<span class="fps"><%- fps %></span> FPS
</div>

<div class="count-wrapper">
	<div><span class="count-label">Shaders:</span> <span class="count-value count-shaders"><%- shaders %></span></div>
	<div><span class="count-label">Nodes:</span> <span class="count-value count-nodes"><%- nodes %>/<%- leafs %></span></div>
	<div><span class="count-label">Surfaces:</span> <span class="count-value count-surfaces"><%- surfaces %></span></div>
	<div><span class="count-label">Indexes:</span> <span class="count-value count-indexes"><%- indexes %></span></div>
	<div><span class="count-label">Culled mod out:</span> <span class="count-value count-culled-model-out"><%- culledModelOut %></span></div>
	<div><span class="count-label">Culled mod in:</span> <span class="count-value count-culled-model-in"><%- culledModelIn %></span></div>
	<div><span class="count-label">Culled mod clip:</span> <span class="count-value count-culled-model-clip"><%- culledModelClip %></span></div>
</div>

<div class="weapons-wrapper">
	<ul class="weapons">
		<% for (var i = 0; i < weapons.length; i++) { %>
			<% if (!weapons[i]) continue; %>
			<li data-index="<%- i %>" class="weapon<% if (i === weaponSelect) { %> selected<% } %>">
				<span class="icon" data-himage="<%= weapons[i].gfx.icon %>"></span>
				<span class="ammo"><% if (ammo[i] > 0) { print(ammo[i]); } else { print('&nbsp;'); } %></span>
			</li>
		<% } %>
	</ul>
</div>

<div class="health-wrapper">
	<span class="health-text"><%- health %></span>
	<span class="health-icon" data-image="icons/iconh_green.png"></span>
</div>

<div class="armor-wrapper">
	<span class="armor-icon" data-image="icons/iconr_yellow.png"></span>
	<span class="armor-text"><%- armor %></span>
</div>

<div class="lagometer-wrapper"<% if (!lagometerVisible) { %> style="display: none;"<% } %>>
	<% for (var i = 0; i < frames.samples.length; i++) { %>
		<div class="frame-wrapper">
			<div data-index="<%- i %>" class="lag-frame">&nbsp</div>
			<div data-index="<%- i %>" class="snapshot-frame">&nbsp</div>
		</div>
	<% } %>
</div>