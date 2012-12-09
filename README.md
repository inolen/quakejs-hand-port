# quakejs

NOTE: This project depends on the quakejs-demoq3 project for assets, so please clone with:
`git clone --recursive https://github.com/inolen/quakejs.git`

## Quickstart

`node assets.js`

Open your browser and hit `http://localhost:9000`.

Et voila!

## Building

Everything should work right out of the box after cloing, however, if you're actually developing you're going to eventually have to build.

There are two main build categories: assets and modules.

### Assets

The assets build depends on the [vorbis-tools](http://www.xiph.org/downloads/) and [crunch](http://code.google.com/p/crunch/) binaries being in your path.

Assets are compiled down to more web-friendly versions with the asset build process. There are currently 3 targets: `images`, `textures`, and `audio`.

### Modules

The module build process has 3 targets: `jshint`, `browser` and `dedicated`.

#### JSHint

The jshint process can be a bit confusing. Unfortunately, there isn't a clear way to lint each individual script, so we instead pre-process all the modules and lint the aggregated script in `/bin/tmp`.

#### Browser

The browser binaries aren't currently used as the default index.html loads the individual dynamically aggregated JS modules.

#### Dedicated

The dedicated binaries must be built each time you make a change you'd like to be reflected.


