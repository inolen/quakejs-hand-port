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
		5,
		IT.ARMOR,
		0
	),
	new GameItemDesc(
		'item_armor_combat',
		[
			'models/powerups/armor/armor_yel.md3'
		],
		'icons/iconr_yellow',
		50,
		IT.ARMOR,
		0
	),
	new GameItemDesc(
		'item_armor_body',
		[
			'models/powerups/armor/armor_red.md3'
		],
		'icons/iconr_red',
		100,
		IT.ARMOR,
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
		5,
		IT.HEALTH,
		0
	),
	new GameItemDesc(
		'item_health',
		[
			'models/powerups/health/medium_cross.md3',
			'models/powerups/health/medium_sphere.md3'
		],
		'icons/iconh_yellow',
		25,
		IT.HEALTH,
		0
	),
	new GameItemDesc(
		'item_health_large',
		[
			'models/powerups/health/large_cross.md3',
			'models/powerups/health/large_sphere.md3'
		],
		'icons/iconh_red',
		50,
		IT.HEALTH,
		0
	),
	new GameItemDesc(
		'item_health_mega',
		[
			'models/powerups/health/mega_cross.md3',
			'models/powerups/health/mega_sphere.md3'
		],
		'icons/iconh_mega',
		100,
		IT.HEALTH,
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
		0,
		IT.WEAPON,
		WP.GAUNTLET
	),
	new GameItemDesc(
		'weapon_shotgun',
		[
			'models/weapons2/shotgun/shotgun.md3'
		],
		'icons/iconw_shotgun',
		10,
		IT.WEAPON,
		WP.SHOTGUN
	),
	new GameItemDesc(
		'weapon_machinegun',
		[
			'models/weapons2/machinegun/machinegun.md3'
		],
		'icons/iconw_machinegun',
		40,
		IT.WEAPON,
		WP.MACHINEGUN
	),
	new GameItemDesc(
		'weapon_grenadelauncher',
		[
			'models/weapons2/grenadel/grenadel.md3'
		],
		'icons/iconw_grenade',
		10,
		IT.WEAPON,
		WP.GRENADE_LAUNCHER
	),
	new GameItemDesc(
		'weapon_rocketlauncher',
		[
			'models/weapons2/rocketl/rocketl.md3'
		],
		'icons/iconw_rocket',
		10,
		IT.WEAPON,
		WP.ROCKET_LAUNCHER
	),
	new GameItemDesc(
		'weapon_lightning',
		[
			'models/weapons2/lightning/lightning.md3'
		],
		'icons/iconw_lightning',
		100,
		IT.WEAPON,
		WP.LIGHTNING
	),
	new GameItemDesc(
		'weapon_railgun',
		[
			'models/weapons2/railgun/railgun.md3'
		],
		'icons/iconw_railgun',
		10,
		IT.WEAPON,
		WP.RAILGUN
	),
	new GameItemDesc(
		'weapon_plasmagun',
		[
			'models/weapons2/plasma/plasma.md3'
		],
		'icons/iconw_plasma',
		50,
		IT.WEAPON,
		WP.PLASMAGUN
	),
	/**
	 * AMMO ITEMS
	 */
	new GameItemDesc(
		'ammo_shells',
		[
			'models/powerups/ammo/shotgunam.md3'
		],
		'icons/icona_shotgun',
		10,
		IT.AMMO,
		WP.SHOTGUN
	),
	new GameItemDesc(
		'ammo_bullets',
		[
			'models/powerups/ammo/machinegunam.md3'
		],
		'icons/icona_machinegun',
		50,
		IT.AMMO,
		WP.MACHINEGUN
	),
	new GameItemDesc(
		'ammo_grenades',
		[
			'models/powerups/ammo/grenadeam.md3'
		],
		'icons/icona_grenade',
		5,
		IT.AMMO,
		WP.GRENADE_LAUNCHER
	),
	new GameItemDesc(
		'ammo_cells',
		[
			'models/powerups/ammo/plasmaam.md3'
		],
		'icons/icona_plasma',
		30,
		IT.AMMO,
		WP.PLASMAGUN
	),
	new GameItemDesc(
		'ammo_lightning',
		[
			'models/powerups/ammo/lightningam.md3'
		],
		'icons/icona_lightning',
		60,
		IT.AMMO,
		WP.LIGHTNING
	),
	new GameItemDesc(
		'ammo_rockets',
		[
			'models/powerups/ammo/rocketam.md3'
		],
		'icons/icona_rocket',
		5,
		IT.AMMO,
		WP.ROCKET_LAUNCHER
	),
	new GameItemDesc(
		'ammo_slugs',
		[
			'models/powerups/ammo/railgunam.md3'
		],
		'icons/icona_railgun',
		10,
		IT.AMMO,
		WP.RAILGUN
	),
	new GameItemDesc(
		'ammo_bfg',
		[
			'models/powerups/ammo/bfgam.md3'
		],
		'icons/icona_bfg',
		15,
		IT.AMMO,
		WP.BFG
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
		30,
		IT.POWERUP,
		0
	)
];
