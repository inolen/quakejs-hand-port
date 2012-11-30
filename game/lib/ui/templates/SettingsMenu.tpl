<div class="background fullscreen">
	<div class="dialog centerx centery">
		<div class="form-horizontal">
			<h3>Settings</h3>
			<div class="name control-group">
				<div class="control-label">Name:</div><div name="name" class="control-input input-text"><%- name %></div>
			</div>
			
			<h3>Controls</h3>
			<ul class="nav-tabs">
				<li class="active"><a href="#look" data-toggle="tab">Look</a></li>
				<li><a href="#move" data-toggle="tab">Move</a></li>
				<li><a href="#shoot" data-toggle="tab">Shoot</a></li>
			</ul>
			<div class="tab-content">
				<div class="tab-pane active" id="look">
					<div class="control-group">
						<div class="control-label">Sensitivity:</div><div name="sensitivity" class="control-input input-range" data-min="0" data-max="10" data-value="<%- sensitivity %>"></div>
					</div>
				</div>
				<div class="tab-pane" id="move">
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
					<div class="control-group">
						<div class="control-label">Attack:</div><div name="attackKey" class="control-input input-key"><%- attackKey %></div>
					</div>
					<div class="control-group">
						<div class="control-label">Next weapon:</div><div name="weapnextKey" class="control-input input-key"><%- weapnextKey %></div>
					</div>
					<div class="control-group">
						<div class="control-label">Previous weapon:</div><div name="weapprevKey" class="control-input input-key"><%- weapprevKey %></div>
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

		<div class="footer">
			<div class="button back">Back</div>
		</div>
	</div>
</div>
