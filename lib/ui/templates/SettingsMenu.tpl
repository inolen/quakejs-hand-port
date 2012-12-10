<div class="fullscreen" data-image="ui/main_menu_bg.jpg">
	<div class="vertical-menu vertical-menu-left">
		<div class="vertical-menu-content centery">
			<h1>Settings</h1>
			<ul>
				<li class="player vertical-menu-item active"><a href="#character" data-toggle="tab">Character</a></li>
				<li class="look vertical-menu-item"><a href="#controls" data-toggle="tab">Controls</a></li>
				<li class="move vertical-menu-item"><a href="#game-settings" data-toggle="tab">Game settings</a></li>
				<li class="back vertical-menu-item">Back</li>
			</ul>
		</ul>
		</div>
	</div>
	<div class="vertical-menu vertical-menu-right">
		<div class="vertical-menu-content">
			<div class="tab-content">
				<div class="tab-pane active" id="character">
					<h1>Character</h1>
					<div class="name control-group">
						<div class="control-label">Name:</div><div name="name" class="control-input input-text"><%- name %></div>
					</div>
				</div>
				
				<div class="tab-pane" id="controls">
					<h1>Controls</h1>

					<ul class="nav-tabs">
						<li class="look active"><a href="#look" data-toggle="tab">Look</a></li>
						<li class="move"><a href="#move" data-toggle="tab">Move</a></li>
						<li class="shoot"><a href="#shoot" data-toggle="tab">Shoot</a></li>
					</ul>

					<div class="tab-content">
						<div class="tab-pane active" id="look">
							<h2>Look</h2>
							<div class="control-group">
								<div class="control-label">Sensitivity:</div><div name="sensitivity" class="control-input input-range" data-min="0" data-max="10" data-value="<%- sensitivity %>"></div>
							</div>
						</div>

						<div class="tab-pane" id="move">
							<h2>Move</h2>
							<div class="control-group">
								<div class="control-label">Move forward:</div><div name="forwardKey" class="control-input input-key"><%- forwardKey %></div>
							</div>
							<div class="control-group">
								<div class="control-label">Move left:</div><div name="leftKey" class="control-input input-key"><%- leftKey %></div>
							</div>
							<div class="control-group">
								<div class="control-label">Move back:</div><div name="backKey" class="control-input input-key"><%- backKey %></div>
							</div>
							<div class="control-group">
								<div class="control-label">Move right:</div><div name="rightKey" class="control-input input-key"><%- rightKey %></div>
							</div>
							<div class="control-group">
								<div class="control-label">Jump:</div><div name="upKey" class="control-input input-key"><%- upKey %></div>
							</div>
						</div>


						<div class="tab-pane" id="shoot">
							<h2>Shoot</h2>
							<div class="control-group">
								<div class="control-label">Attack:</div><div name="attackKey" class="control-input input-key"><%- attackKey %></div>
							</div>
							<div class="control-group">
								<div class="control-label">Zoom:</div><div name="zoomKey" class="control-input input-key"><%- zoomKey %></div>
							</div>
							<div class="control-group">
								<div class="control-label">Next weapon:</div><div name="weapnextKey" class="control-input input-key"><%- weapnextKey %></div>
							</div>
							<div class="control-group">
								<div class="control-label">Prev weapon:</div><div name="weapprevKey" class="control-input input-key"><%- weapprevKey %></div>
							</div>
							<div class="control-group">
								<div class="control-label">Gauntlet:</div><div name="weapon1Key" class="control-input input-key"><%- weapon1Key %></div>
							</div>
							<div class="control-group">
								<div class="control-label">Machinegun:</div><div name="weapon2Key" class="control-input input-key"><%- weapon2Key %></div>
							</div>
							<div class="control-group">
								<div class="control-label">Shotgun:</div><div name="weapon3Key" class="control-input input-key"><%- weapon3Key %></div>
							</div>
							<div class="control-group">
								<div class="control-label">Grenade launcher:</div><div name="weapon4Key" class="control-input input-key"><%- weapon4Key %></div>
							</div>
							<div class="control-group">
								<div class="control-label">Rocket launcher:</div><div name="weapon5Key" class="control-input input-key"><%- weapon5Key %></div>
							</div>
							<div class="control-group">
								<div class="control-label">Lightning gun:</div><div name="weapon6Key" class="control-input input-key"><%- weapon6Key %></div>
							</div>
							<div class="control-group">
								<div class="control-label">Railgun:</div><div name="weapon7Key" class="control-input input-key"><%- weapon7Key %></div>
							</div>
							<div class="control-group">
								<div class="control-label">Plasma gun:</div><div name="weapon8Key" class="control-input input-key"><%- weapon8Key %></div>
							</div>
							<div class="control-group">
								<div class="control-label">BFG:</div><div name="weapon9Key" class="control-input input-key"><%- weapon9Key %></div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
