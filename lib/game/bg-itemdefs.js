var itemList = [
	{
	},
	/**
	 * ARMOR
	 */
	{
		classname: 'item_armor_shard',
		name: 'Armor Shard',
		models: {
			primary: 'models/powerups/armor/shard.md3'
		},
		gfx: {
			icon: 'icons/iconr_shard'
		},
		sounds: {
			pickup: 'sound/misc/ar1_pkup'
		},
		quantity: 5,
		giType: IT.ARMOR,
		giTag: 0
	},
	{
		classname: 'item_armor_combat',
		name: 'Armor',
		models: {
			primary: 'models/powerups/armor/armor_yel.md3'
		},
		gfx: {
			icon: 'icons/iconr_yellow'
		},
		sounds: {
			pickup: 'sound/misc/ar2_pkup'
		},
		quantity: 50,
		giType: IT.ARMOR,
		giTag: 0
	},
	{
		classname: 'item_armor_body',
		name: 'Heavy Armor',
		models: {
			primary: 'models/powerups/armor/armor_red.md3'
		},
		gfx: {
			icon: 'icons/iconr_red'
		},
		sounds: {
			pickup: 'sound/misc/ar2_pkup'
		},
		quantity: 100,
		giType: IT.ARMOR,
		giTag: 0
	},
	/**
	 * HEALTH
	 */
	{
		classname: 'item_health_small',
		name: '5 Health',
		models: {
			primary: 'models/powerups/health/small_cross.md3',
			secondary: 'models/powerups/health/small_sphere.md3'
		},
		gfx: {
			icon: 'icons/iconh_green'
		},
		sounds: {
			pickup: 'sound/items/s_health'
		},
		quantity: 5,
		giType: IT.HEALTH,
		giTag: 0
	},
	{
		classname: 'item_health',
		name: '25 Health',
		models: {
			primary: 'models/powerups/health/medium_cross.md3',
			secondary: 'models/powerups/health/medium_sphere.md3'
		},
		gfx: {
			icon: 'icons/iconh_yellow'
		},
		sounds: {
			pickup: 'sound/items/n_health'
		},
		quantity: 25,
		giType: IT.HEALTH,
		giTag: 0
	},
	{
		classname: 'item_health_large',
		name: '50 Health',
		models: {
			primary: 'models/powerups/health/large_cross.md3',
			secondary: 'models/powerups/health/large_sphere.md3'
		},
		gfx: {
			icon: 'icons/iconh_red'
		},
		sounds: {
			pickup: 'sound/items/l_health'
		},
		quantity: 50,
		giType: IT.HEALTH,
		giTag: 0
	},
	{
		classname: 'item_health_mega',
		name: 'Mega Health',
		models: {
			primary: 'models/powerups/health/mega_cross.md3',
			secondary: 'models/powerups/health/mega_sphere.md3'
		},
		gfx: {
			icon: 'icons/iconh_mega'
		},
		sounds: {
			pickup: 'sound/items/m_health'
		},
		quantity: 100,
		giType: IT.HEALTH,
		giTag: 0
	},
	/**
	 * WEAPONS
	 */
	{
		classname: 'weapon_gauntlet',
		name: 'Gauntlet',
		models: {
			primary: 'models/weapons2/gauntlet/gauntlet.md3',
			barrel: 'models/weapons2/gauntlet/gauntlet_barrel.md3',
			flash: 'models/weapons2/gauntlet/gauntlet_flash.md3',
			hand: 'models/weapons2/gauntlet/gauntlet_hand.md3'
		},
		gfx: {
			icon: 'icons/iconw_gauntlet'
		},
		sounds: {
			pickup: 'sound/misc/w_pkup',
			firing: 'sound/weapons/melee/fstrun',
			flash0: 'sound/weapons/melee/fstatck'
		},
		quantity: 0,
		giType: IT.WEAPON,
		giTag: WP.GAUNTLET,
		flashDlightColor: [0.6, 0.6, 1.0]
	},
	{
		classname: 'weapon_machinegun',
		name: 'Machinegun',
		models: {
			primary: 'models/weapons2/machinegun/machinegun.md3',
			barrel: 'models/weapons2/machinegun/machinegun_barrel.md3',
			flash: 'models/weapons2/machinegun/machinegun_flash.md3',
			hand: 'models/weapons2/machinegun/machinegun_hand.md3'
		},
		shaders: {
			bulletExplosion: 'bulletExplosion'
		},
		gfx: {
			icon: 'icons/iconw_machinegun'
		},
		sounds: {
			pickup: 'sound/misc/w_pkup',
			flash0: 'sound/weapons/machinegun/machgf1b',
			flash1: 'sound/weapons/machinegun/machgf2b',
			flash2: 'sound/weapons/machinegun/machgf3b',
			flash3: 'sound/weapons/machinegun/machgf4b',
			ric0: 'sound/weapons/machinegun/ric1',
			ric1: 'sound/weapons/machinegun/ric2',
			ric2: 'sound/weapons/machinegun/ric3'
		},
		quantity: 40,
		giType: IT.WEAPON,
		giTag: WP.MACHINEGUN,
		flashDlightColor: [1.0, 1.0, 0.0]
	},
	{
		classname: 'weapon_shotgun',
		name: 'Shotgun',
		models: {
			primary: 'models/weapons2/shotgun/shotgun.md3',
			flash: 'models/weapons2/shotgun/shotgun_flash.md3',
			hand: 'models/weapons2/shotgun/shotgun_hand.md3'
		},
		shaders: {
			bulletExplosion: 'bulletExplosion'
		},
		gfx: {
			icon: 'icons/iconw_shotgun'
		},
		sounds: {
			pickup: 'sound/misc/w_pkup',
			flash0: 'sound/weapons/shotgun/sshotf1b'
		},
		quantity: 10,
		giType: IT.WEAPON,
		giTag: WP.SHOTGUN,
		flashDlightColor: [1.0, 1.0, 0.0]
	},
	{
		classname: 'weapon_grenadelauncher',
		name: 'Grenade Launcher',
		models: {
			primary: 'models/weapons2/grenadel/grenadel.md3',
			flash: 'models/weapons2/grenadel/grenadel_flash.md3',
			hand: 'models/weapons2/grenadel/grenadel_hand.md3',
			missile: 'models/ammo/grenade1.md3'
		},
		shaders: {
			explosion: 'grenadeExplosion'
		},
		gfx: {
			icon: 'icons/iconw_grenade'
		},
		sounds: {
			pickup: 'sound/misc/w_pkup',
			flash0: 'sound/weapons/grenade/grenlf1a',
			bounce0: 'sound/weapons/grenade/hgrenb1a',
			bounce1: 'sound/weapons/grenade/hgrenb2a'
		},
		quantity: 10,
		trailTime: 700,
		trailRadius: 32,
		giType: IT.WEAPON,
		giTag: WP.GRENADE_LAUNCHER,
		flashDlightColor: [1.0, 0.7, 0.0]
	},
	{
		classname: 'weapon_rocketlauncher',
		name: 'Rocket Launcher',
		models: {
			primary: 'models/weapons2/rocketl/rocketl.md3',
			flash: 'models/weapons2/rocketl/rocketl_flash.md3',
			hand: 'models/weapons2/rocketl/rocketl_hand.md3',
			missile: 'models/ammo/rocket/rocket.md3'
		},
		shaders: {
			explosion: 'rocketExplosion'
		},
		gfx: {
			icon: 'icons/iconw_rocket'
		},
		sounds: {
			pickup: 'sound/misc/w_pkup',
			missile: 'sound/weapons/rocket/rockfly',
			flash0: 'sound/weapons/rocket/rocklf1a',
			explosion: 'sound/weapons/rocket/rocklx1a'
		},
		quantity: 10,
		trailTime: 2000,
		trailRadius: 64,
		giType: IT.WEAPON,
		giTag: WP.ROCKET_LAUNCHER,
		flashDlightColor: [1.0, 0.75, 0.0],
		missileDlightIntensity: 200,
		missileDlightColor: [1.0, 0.75, 0.0],
	},
	{
		classname: 'weapon_lightning',
		name: 'Lightning Gun',
		models: {
			primary: 'models/weapons2/lightning/lightning.md3',
			flash: 'models/weapons2/lightning/lightning_flash.md3',
			hand: 'models/weapons2/lightning/lightning_hand.md3',
			explosion: 'models/weaphits/crackle.md3'
		},
		shaders: {
			lightning: 'lightningBoltNew'
		},
		gfx: {
			icon: 'icons/iconw_lightning'
		},
		sounds: {
			pickup: 'sound/misc/w_pkup',
			ready: 'sound/weapons/melee/fsthum',
			firing: 'sound/weapons/lightning/lg_hum',
			flash0: 'sound/weapons/lightning/lg_fire',
			hit0: 'sound/weapons/lightning/lg_hit',
			hit1: 'sound/weapons/lightning/lg_hit2',
			hit2: 'sound/weapons/lightning/lg_hit3'
		},

		quantity: 100,
		giType: IT.WEAPON,
		giTag: WP.LIGHTNING,
		flashDlightColor: [0.6, 0.6, 1.0]
	},
	{
		classname: 'weapon_railgun',
		name: 'Railgun',
		models: {
			primary: 'models/weapons2/railgun/railgun.md3',
			flash: 'models/weapons2/railgun/railgun_flash.md3',
			hand: 'models/weapons2/railgun/railgun_hand.md3'
		},
		shaders: {
			core: 'railCore',
			explosion: 'railExplosion'
		},
		gfx: {
			icon: 'icons/iconw_railgun'
		},
		sounds: {
			pickup: 'sound/misc/w_pkup',
			ready: 'sound/weapons/railgun/rg_hum',
			explosion: 'sound/weapons/plasma/plasmx1a',
			flash0: 'sound/weapons/railgun/railgf1a'
		},
		quantity: 10,
		giType: IT.WEAPON,
		giTag: WP.RAILGUN,
		flashDlightColor: [1.0, 0.5, 0.0]
	},
	{
		classname: 'weapon_plasmagun',
		name: 'Plasma Gun',
		models: {
			primary: 'models/weapons2/plasma/plasma.md3',
			flash: 'models/weapons2/plasma/plasma_flash.md3',
			hand: 'models/weapons2/plasma/plasma_hand.md3'
		},
		shaders: {
			missile: 'railDisc',
			explosion: 'plasmaExplosion'
		},
		gfx: {
			icon: 'icons/iconw_plasma'
		},
		sounds: {
			pickup: 'sound/misc/w_pkup',
			missile: 'sound/weapons/plasma/lasfly',
			explosion: 'sound/weapons/plasma/plasmx1a',
			flash0: 'sound/weapons/plasma/hyprbf1a'
		},
		quantity: 50,
		giType: IT.WEAPON,
		giTag: WP.PLASMAGUN,
		flashDlightColor: [0.6, 0.6, 1.0]
	},
	{
		classname: 'weapon_bfg',
		name: 'BFG10K',
		models: {
			primary: 'models/weapons2/bfg/bfg.md3',
			barrel: 'models/weapons2/bfg/bfg_barrel.md3',
			flash: 'models/weapons2/bfg/bfg_flash.md3',
			hand: 'models/weapons2/bfg/bfg_hand.md3',
			missile: 'models/weaphits/bfg.md3'
		},
		shaders: {
			explosion: 'bfgExplosion'
		},
		gfx: {
			icon: 'icons/iconw_bfg'
		},
		sounds: {
			pickup: 'sound/misc/w_pkup',
			ready: 'sound/weapons/bfg/bfg_hum',
			missile: 'sound/weapons/rocket/rockfly',
			flash0: 'sound/weapons/bfg/bfg_fire'
		},
		quantity: 20,
		giType: IT.WEAPON,
		giTag: WP.BFG,
		flashDlightColor: [1.0, 0.7, 1.0]
	},
	{
		classname: 'weapon_grapplinghook',
		name: 'Grappling Hook',
		models: {
			primary: 'models/weapons2/grapple/grapple.md3',
			flash: 'models/weapons2/grapple/grapple_flash.md3',
			hand: 'models/weapons2/grapple/grapple_hand.md3'
		},
		gfx: {
			icon: 'icons/iconw_grapple'
		},
		sounds: {
			pickup: 'sound/misc/w_pkup',
			ready: 'sound/weapons/melee/fsthum',
			firing: 'sound/weapons/melee/fstrun'
		},
		quantity: 0,
		giType: IT.WEAPON,
		giTag: WP.GRAPPLING_HOOK
	},
	/**
	 * AMMO ITEMS
	 */
	{
		classname: 'ammo_bullets',
		name: 'Bullets',
		models: {
			primary: 'models/powerups/ammo/machinegunam.md3'
		},
		gfx: {
			icon: 'icons/icona_machinegun'
		},
		sounds: {
			pickup: 'sound/misc/am_pkup'
		},
		quantity: 50,
		giType: IT.AMMO,
		giTag: WP.MACHINEGUN
	},
	{
		classname: 'ammo_shells',
		name: 'Shells',
		models: {
			primary: 'models/powerups/ammo/shotgunam.md3'
		},
		gfx: {
			icon: 'icons/icona_shotgun'
		},
		sounds: {
			pickup: 'sound/misc/am_pkup'
		},
		quantity: 10,
		giType: IT.AMMO,
		giTag: WP.SHOTGUN
	},
	{
		classname: 'ammo_grenades',
		name: 'Grenades',
		models: {
			primary: 'models/powerups/ammo/grenadeam.md3'
		},
		gfx: {
			icon: 'icons/icona_grenade'
		},
		sounds: {
			pickup: 'sound/misc/am_pkup'
		},
		quantity: 5,
		giType: IT.AMMO,
		giTag: WP.GRENADE_LAUNCHER
	},
	{
		classname: 'ammo_rockets',
		name: 'Rockets',
		models: {
			primary: 'models/powerups/ammo/rocketam.md3'
		},
		gfx: {
			icon: 'icons/icona_rocket'
		},
		sounds: {
			pickup: 'sound/misc/am_pkup'
		},
		quantity: 5,
		giType: IT.AMMO,
		giTag: WP.ROCKET_LAUNCHER
	},
	{
		classname: 'ammo_lightning',
		name: 'Lightning',
		models: {
			primary: 'models/powerups/ammo/lightningam.md3'
		},
		gfx: {
			icon: 'icons/icona_lightning'
		},
		sounds: {
			pickup: 'sound/misc/am_pkup'
		},
		quantity: 60,
		giType: IT.AMMO,
		giTag: WP.LIGHTNING
	},
	{
		classname: 'ammo_slugs',
		name: 'Slugs',
		models: {
			primary: 'models/powerups/ammo/railgunam.md3'
		},
		gfx: {
			icon: 'icons/icona_railgun'
		},
		sounds: {
			pickup: 'sound/misc/am_pkup'
		},
		quantity: 10,
		giType: IT.AMMO,
		giTag: WP.RAILGUN
	},
	{
		classname: 'ammo_cells',
		name: 'Cells',
		models: {
			primary: 'models/powerups/ammo/plasmaam.md3'
		},
		gfx: {
			icon: 'icons/icona_plasma'
		},
		sounds: {
			pickup: 'sound/misc/am_pkup'
		},
		quantity: 30,
		giType: IT.AMMO,
		giTag: WP.PLASMAGUN
	},
	{
		classname: 'ammo_bfg',
		name: 'Bfg Ammo',
		models: {
			primary: 'models/powerups/ammo/bfgam.md3'
		},
		gfx: {
			icon: 'icons/icona_bfg'
		},
		sounds: {
			pickup: 'sound/misc/am_pkup'
		},
		quantity: 15,
		giType: IT.AMMO,
		giTag: WP.BFG
	},
	/**
	 * POWERUPS
	 */
	{
		classname: 'item_quad',
		name: 'Quad Damage',
		models: {
			primary: 'models/powerups/instant/quad.md3',
			secondary: 'models/powerups/instant/quad_ring.md3'
		},
		gfx: {
			icon: 'icons/quad'
		},
		sounds: {
			pickup: 'sound/items/quaddamage'
		},
		quantity: 30,
		giType: IT.POWERUP,
		giTag: PW.QUAD
	},
	/**
	 * CTF
	 */
	{
		classname: 'team_CTF_redflag',
		name: 'Red Flag',
		models: {
			primary: 'models/flags/r_flag.md3'
		},
		gfx: {
			icon: 'icons/iconf_red1'
		},
		quantity: 0,
		giType: IT.TEAM,
		giTag: PW.REDFLAG
	},
	{
		classname: 'team_CTF_blueflag',
		name: 'Blue Flag',
		models: {
			primary: 'models/flags/b_flag.md3'
		},
		gfx: {
			icon: 'icons/iconf_blu1'
		},
		quantity: 0,
		giType: IT.TEAM,
		giTag: PW.BLUEFLAG
	},
	/**
	 * 1FCTF
	 */
	{
		classname: 'team_CTF_neutralflag',
		name: 'Neutral Flag',
		models: {
			primary: 'models/flags/n_flag.md3'
		},
		gfx: {
			icon: 'icons/iconf_neutral1'
		},
		quantity: 0,
		giType: IT.TEAM,
		giTag: PW.NEUTRALFLAG
	}
];