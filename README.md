# quakejs

## Quickstart

    git clone --recursive https://github.com/inolen/quakejs.git
    cd quakejs
    npm install
    node test/server.js

Open your browser and hit `http://localhost:8080/?cmd=map%20pro-q3dm6` et voila!

NOTE: node.js 0.9.4 or higher is required.

NOTE 2: This project depends on sub-modules for assets, so please be sure to do a recursive clone as outlined above.

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


