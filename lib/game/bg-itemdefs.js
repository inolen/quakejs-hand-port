// typedef struct gitem_s {
// 	char		*classname;	// spawning name
// 	char		*pickup_sound;
// 	char		*world_model[MAX_ITEM_MODELS];
// 
// 	char		*icon;
// 	char		*pickup_name;	// for printing on pickup
// 
// 	int			quantity;		// for ammo how much, or duration of powerup
// 	itemType_t  giType;			// IT_* flags
// 
// 	int			giTag;
// 
// 	char		*precaches;		// string of all models and images this item will use
// 	char		*sounds;		// string of all sounds this item will use
// } gitem_t;

var itemList = [
	new GameItemDesc(),

	/**
	 * ARMOR
	 */
	new GameItemDesc(
		'item_armor_shard',
		"sound/misc/ar1_pkup",
		[
			'models/powerups/armor/shard.md3'
		],
		'icons/iconr_shard',
		"Armor Shard",
		5,
		IT.ARMOR,
		0
	),
	new GameItemDesc(
		'item_armor_combat',
		"sound/misc/ar2_pkup",
		[
			'models/powerups/armor/armor_yel.md3'
		],
		'icons/iconr_yellow',
		"Armor",
		50,
		IT.ARMOR,
		0
	),
	new GameItemDesc(
		'item_armor_body',
		"sound/misc/ar2_pkup",
		[
			'models/powerups/armor/armor_red.md3'
		],
		'icons/iconr_red',
		"Heavy Armor",
		100,
		IT.ARMOR,
		0
	),
	/**
	 * HEALTH
	 */
	new GameItemDesc(
		'item_health_small',
		"sound/items/s_health",
		[
			'models/powerups/health/small_cross.md3',
			'models/powerups/health/small_sphere.md3'
		],
		'icons/iconh_green',
		"5 Health",
		5,
		IT.HEALTH,
		0
	),
	new GameItemDesc(
		'item_health',
		"sound/items/n_health",
		[
			'models/powerups/health/medium_cross.md3',
			'models/powerups/health/medium_sphere.md3'
		],
		'icons/iconh_yellow',
		"25 Health",
		25,
		IT.HEALTH,
		0
	),
	new GameItemDesc(
		'item_health_large',
		"sound/items/l_health",
		[
			'models/powerups/health/large_cross.md3',
			'models/powerups/health/large_sphere.md3'
		],
		'icons/iconh_red',
		"50 Health",
		50,
		IT.HEALTH,
		0
	),
	new GameItemDesc(
		'item_health_mega',
		"sound/items/m_health",
		[
			'models/powerups/health/mega_cross.md3',
			'models/powerups/health/mega_sphere.md3'
		],
		'icons/iconh_mega',
		"Mega Health",
		100,
		IT.HEALTH,
		0
	),
	/**
	 * WEAPONS
	 */
	new GameItemDesc(
		'weapon_gauntlet',
		"sound/misc/w_pkup",
		[
			'models/weapons2/gauntlet/gauntlet.md3'
		],
		'icons/iconw_gauntlet',
		"Gauntlet",
		0,
		IT.WEAPON,
		WP.GAUNTLET
	),
	new GameItemDesc(
		'weapon_shotgun',
		"sound/misc/w_pkup",
		[
			'models/weapons2/shotgun/shotgun.md3'
		],
		'icons/iconw_shotgun',
		"Shotgun",
		10,
		IT.WEAPON,
		WP.SHOTGUN
	),
	new GameItemDesc(
		'weapon_machinegun',
		"sound/misc/w_pkup",
		[
			'models/weapons2/machinegun/machinegun.md3'
		],
		'icons/iconw_machinegun',
		"Machinegun",
		40,
		IT.WEAPON,
		WP.MACHINEGUN
	),
	new GameItemDesc(
		'weapon_grenadelauncher',
		"sound/misc/w_pkup",
		[
			'models/weapons2/grenadel/grenadel.md3'
		],
		'icons/iconw_grenade',
		"Grenade Launcher",
		10,
		IT.WEAPON,
		WP.GRENADE_LAUNCHER,
		undefined,
		[
			"sound/weapons/grenade/hgrenb1a",
			"sound/weapons/grenade/hgrenb2a"
		]
	),
	new GameItemDesc(
		'weapon_rocketlauncher',
		"sound/misc/w_pkup",
		[
			'models/weapons2/rocketl/rocketl.md3'
		],
		'icons/iconw_rocket',
		"Rocket Launcher",
		10,
		IT.WEAPON,
		WP.ROCKET_LAUNCHER
	),
	new GameItemDesc(
		'weapon_lightning',
		"sound/misc/w_pkup",
		[
			'models/weapons2/lightning/lightning.md3'
		],
		'icons/iconw_lightning',
		"Lightning Gun",
		100,
		IT.WEAPON,
		WP.LIGHTNING
	),
	new GameItemDesc(
		'weapon_railgun',
		"sound/misc/w_pkup",
		[
			'models/weapons2/railgun/railgun.md3'
		],
		'icons/iconw_railgun',
		"Railgun",
		10,
		IT.WEAPON,
		WP.RAILGUN
	),
	new GameItemDesc(
		'weapon_plasmagun',
		"sound/misc/w_pkup",
		[
			'models/weapons2/plasma/plasma.md3'
		],
		'icons/iconw_plasma',
		"Plasma Gun",
		50,
		IT.WEAPON,
		WP.PLASMAGUN
	),
	new GameItemDesc(
		'weapon_bfg',
		"sound/misc/w_pkup",
		[
			'models/weapons2/bfg/bfg.md3'
		],
		'icons/iconw_bfg',
		"BFG10K",
		20,
		IT.WEAPON,
		WP.BFG
	),
	new GameItemDesc(
		'weapon_grapplinghook',
		"sound/misc/w_pkup",
		[
			'models/weapons2/grapple/grapple.md3'
		],
		'icons/iconw_grapple',
		"Grappling Hook",
		0,
		IT.WEAPON,
		WP.GRAPPLING_HOOK
	),
	/**
	 * AMMO ITEMS
	 */
	new GameItemDesc(
		'ammo_shells',
		"sound/misc/am_pkup",
		[
			'models/powerups/ammo/shotgunam.md3'
		],
		'icons/icona_shotgun',
		"Shells",
		10,
		IT.AMMO,
		WP.SHOTGUN
	),
	new GameItemDesc(
		'ammo_bullets',
		"sound/misc/am_pkup",
		[
			'models/powerups/ammo/machinegunam.md3'
		],
		'icons/icona_machinegun',
		"Bullets",
		50,
		IT.AMMO,
		WP.MACHINEGUN
	),
	new GameItemDesc(
		'ammo_grenades',
		"sound/misc/am_pkup",
		[
			'models/powerups/ammo/grenadeam.md3'
		],
		'icons/icona_grenade',
		"Grenades",
		5,
		IT.AMMO,
		WP.GRENADE_LAUNCHER
	),
	new GameItemDesc(
		'ammo_cells',
		"sound/misc/am_pkup",
		[
			'models/powerups/ammo/plasmaam.md3'
		],
		'icons/icona_plasma',
		"Cells",
		30,
		IT.AMMO,
		WP.PLASMAGUN
	),
	new GameItemDesc(
		'ammo_lightning',
		"sound/misc/am_pkup",
		[
			'models/powerups/ammo/lightningam.md3'
		],
		'icons/icona_lightning',
		"Lightning",
		60,
		IT.AMMO,
		WP.LIGHTNING
	),
	new GameItemDesc(
		'ammo_rockets',
		"sound/misc/am_pkup",
		[
			'models/powerups/ammo/rocketam.md3'
		],
		'icons/icona_rocket',
		"Rockets",
		5,
		IT.AMMO,
		WP.ROCKET_LAUNCHER
	),
	new GameItemDesc(
		'ammo_slugs',
		"sound/misc/am_pkup",
		[
			'models/powerups/ammo/railgunam.md3'
		],
		'icons/icona_railgun',
		"Slugs",
		10,
		IT.AMMO,
		WP.RAILGUN
	),
	new GameItemDesc(
		'ammo_bfg',
		"sound/misc/am_pkup",
		[
			'models/powerups/ammo/bfgam.md3'
		],
		'icons/icona_bfg',
		"Bfg Ammo",
		15,
		IT.AMMO,
		WP.BFG
	),
	/**
	 * POWERUPS
	 */
	new GameItemDesc(
		'item_quad',
		"sound/items/quaddamage",
		[
			'models/powerups/instant/quad.md3',
			'models/powerups/instant/quad_ring.md3'
		],
		'icons/quad',
		"Quad Damage",
		30,
		IT.POWERUP,
		PW.QUAD,
		undefined,
		[
			'sound/items/damage2',
			'sound/items/damage3'
		]
	),
	/**
	 * CTF
	 */
	new GameItemDesc(
		'team_CTF_redflag',
		null,
		[
			'models/flags/r_flag.md3'
		],
		'icons/iconf_red1',
		"Red Flag",
		0,
		IT.TEAM,
		PW.REDFLAG
	),
	new GameItemDesc(
		'team_CTF_blueflag',
		null,
		[
			'models/flags/b_flag.md3'
		],
		'icons/iconf_blu1',
		"Blue Flag",
		0,
		IT.TEAM,
		PW.BLUEFLAG
	),
	/**
	 * 1FCTF
	 */
	new GameItemDesc(
		'team_CTF_neutralflag',
		null,
		[
			'models/flags/n_flag.md3'
		],
		'icons/iconf_neutral1',
		"Neutral Flag",
		0,
		IT.TEAM,
		PW.NEUTRALFLAG
	),
	new GameItemDesc(
		'item_redcube',
		'sound/misc/am_pkup.wav',
		[
			'models/powerups/orb/r_orb.md3'
		],
		'icons/iconh_rorb',
		"Red Cube",
		0,
		IT.TEAM,
		0
	),
	new GameItemDesc(
		'item_bluecube',
		'sound/misc/am_pkup.wav',
		[
			'models/powerups/orb/b_orb.md3'
		],
		'icons/iconh_borb',
		"Blue Cube",
		0,
		IT.TEAM,
		0
	)
];
