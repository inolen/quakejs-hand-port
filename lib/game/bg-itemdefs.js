var itemList = [
	/**
	 * ARMOR
	 */
	new GameItemDesc(
		'item_armor_shard',
		[
			'models/powerups/armor/shard.md3'
		],
		'icons/iconr_shard',
		ItemType.ARMOR,
		0
	),
	new GameItemDesc(
		'item_armor_combat',
		[
			'models/powerups/armor/armor_yel.md3'
		],
		'icons/iconr_yellow',
		ItemType.ARMOR,
		0
	),
	new GameItemDesc(
		'item_armor_body',
		[
			'models/powerups/armor/armor_red.md3'
		],
		'icons/iconr_red',
		ItemType.ARMOR,
		0
	),
	/**
	 * HEALTH
	 */
	new GameItemDesc(
		'item_health_small',
		[
			'models/powerups/health/small_cross.md3',
			'models/powerups/health/small_sphere.md3'
		],
		'icons/iconh_green',
		ItemType.HEALTH,
		0
	),
	new GameItemDesc(
		'item_health',
		[
			'models/powerups/health/medium_cross.md3',
			'models/powerups/health/medium_sphere.md3'
		],
		'icons/iconh_yellow',
		ItemType.HEALTH,
		0
	),
	new GameItemDesc(
		'item_health_large',
		[
			'models/powerups/health/large_cross.md3',
			'models/powerups/health/large_sphere.md3'
		],
		'icons/iconh_red',
		ItemType.HEALTH,
		0
	),
	new GameItemDesc(
		'item_health_mega',
		[
			'models/powerups/health/mega_cross.md3',
			'models/powerups/health/mega_sphere.md3'
		],
		'icons/iconh_mega',
		ItemType.HEALTH,
		0
	),
	/**
	 * WEAPONS
	 */
	new GameItemDesc(
		'weapon_gauntlet',
		[
			'models/weapons2/gauntlet/gauntlet.md3'
		],
		'icons/iconw_gauntlet',
		ItemType.WEAPON,
		Weapon.GAUNTLET
	),
	new GameItemDesc(
		'weapon_shotgun',
		[
			'models/weapons2/shotgun/shotgun.md3'
		],
		'icons/iconw_shotgun',
		ItemType.WEAPON,
		Weapon.SHOTGUN
	),
	new GameItemDesc(
		'weapon_machinegun',
		[
			'models/weapons2/machinegun/machinegun.md3'
		],
		'icons/iconw_machinegun',
		ItemType.WEAPON,
		Weapon.MACHINEGUN
	),
	new GameItemDesc(
		'weapon_grenadelauncher',
		[
			'models/weapons2/grenadel/grenadel.md3'
		],
		'icons/iconw_grenade',
		ItemType.WEAPON,
		Weapon.GRENADE_LAUNCHER
	),
	new GameItemDesc(
		'weapon_rocketlauncher',
		[
			'models/weapons2/rocketl/rocketl.md3'
		],
		'icons/iconw_rocket',
		ItemType.WEAPON,
		Weapon.ROCKET_LAUNCHER
	),
	new GameItemDesc(
		'weapon_lightning',
		[
			'models/weapons2/lightning/lightning.md3'
		],
		'icons/iconw_lightning',
		ItemType.WEAPON,
		Weapon.LIGHTNING
	),
	new GameItemDesc(
		'weapon_railgun',
		[
			'models/weapons2/railgun/railgun.md3'
		],
		'icons/iconw_railgun',
		ItemType.WEAPON,
		Weapon.RAILGUN
	),
	new GameItemDesc(
		'weapon_plasmagun',
		[
			'models/weapons2/plasma/plasma.md3'
		],
		'icons/iconw_plasma',
		ItemType.WEAPON,
		Weapon.PLASMAGUN
	),
	/**
	 * POWERUPS
	 */
	new GameItemDesc(
		'item_quad',
		[
			'models/powerups/instant/quad.md3',
			'models/powerups/instant/quad_ring.md3'
		],
		'icons/quad',
		ItemType.POWERUP,
		0
	)
];
