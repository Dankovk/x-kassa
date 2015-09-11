/* global process */
// Basic stuff we need
var exec       = require('child_process').exec,
    del        = require('del'),
    config     = require('./barebones.json'),
    fs         = require('fs'),
    path       = require('path'),
    connect    = require('gulp-connect'),
    portfinder = require('portfinder'),
    gulp       = require('gulp');

// Gulp plugins
var rename         = require('gulp-rename'),
    filter         = require('gulp-filter'),
    plumber        = require('gulp-plumber'),
    gulpSequence   = require('gulp-sequence'),
    gulpif         = require('gulp-if'),
    notify         = require("gulp-notify"),
    concat         = require('gulp-concat'),
    lazypipe       = require('lazypipe'),
    newer          = require('gulp-newer'),

    cache          = require('gulp-cache'),
    imagemin       = require('gulp-imagemin'),
    fileinclude    = require('gulp-file-include'),

    sourcemaps     = require('gulp-sourcemaps'),
    spritesmith    = require('gulp.spritesmith'),
    merge          = require('merge-stream'),

    sass           = require('gulp-sass'),
    postcss        = require('gulp-postcss'),
    autoprefixer   = require('autoprefixer'),
    sprites        = require('postcss-sprites'),
    mqpacker       = require('css-mqpacker'),
    csswring       = require('csswring'),
    postcssSVG     = require('postcss-svg'),
    postcssEasings = require('postcss-easings'),
    csso           = require('gulp-csso'),

    useref         = require('gulp-useref'),
    uglify         = require('gulp-uglify');

var buildPath = config.path.development;

/* Unused plugins
 *
 * checkCSS = require('gulp-check-unused-css');
 *
 */

/* Project directory structure
 *
 * barebones
 * |
 * |- dist                      [project] compiled files, misc files (html, ico)
 * |  |- fonts                  [fonts]   compressed (eot, svg, ttf, woff)
 * |  |- images                 [images]  compressed (jpg, png) and sprites (png)
 * |  |- scripts                [scripts] combined and minified (min.js)
 * |  |  '- vendor              [scripts] vendor libraries (min.js)
 * |  '- styles                 [styles]  prefixed and minifed (min.css)
 * '- src                       [project] source files, misc files (html, ico)
 *    |- fonts                  [fonts]   source (eot, svg, ttf, woff)
 *    |- images                 [images]  source (jpg, png)
 *    |- scripts                [scripts] source (js)
 *    |- sprites                [images]  sprite components (png)
 *    |  '- icon                [example] [images] sprite components (png)
 *    |- styles                 [styles]  uncompiled source (scss)
 *    '- vendor                 [vendor]  libraries (via Bower)
 *
 */

// Gulp tasks

/* Bower task
 *
 * Installs all bower dependencies
 */
gulp.task('bower', function (cb) {
    // Install bower dependencies
    exec('bower install', function (err, stdout, stderr) {
        if (stdout) console.log(stdout);
        if (stderr) console.log(stderr);
        cb(err);
    });
});

/* Font task
 *
 * Copies font files over to dest dir
 */
gulp.task('font', function () {
    gulp.src(config.path.source + config.path.font.src + '/**/*.{eot,otf,svg,ttf,woff}')

        // Handle errors
        .pipe(plumber({
            errorHandler: handleError
        }))

        .pipe(gulp.dest(buildPath + config.path.font.dest))
        .pipe(connect.reload());
});

/* Html task
 *
 * Copies html files over to dest dir
 */
gulp.task('html', function () {
    var jsfiles = filter("**/*.js");
    var assets = useref.assets(
        {},
        lazypipe()
            .pipe(sourcemaps.init, {loadMaps: true})
    );

    gulp.src(config.path.source + '*.html')

        // Handle errors
        .pipe(plumber({
            errorHandler: handleError
        }))

        // Include partials
        .pipe(fileinclude({
            prefix: config.partials.prefix,
            suffix: config.partials.suffix,
            basepath: config.path.source + config.path.html.partials + '/',
            context: config.partials.context
        }))

        // Include all available assets
        .pipe(assets)

        // Concatenate and minify javascripts
        .pipe(jsfiles)
        .pipe(gulpif(process.env.NODE_ENV == 'production', uglify()))
        .pipe(sourcemaps.write())
        .pipe(jsfiles.restore())

        // Restore html stream and write concatenated js file names
        .pipe(assets.restore())
        .pipe(useref())
        .pipe(gulp.dest(buildPath))
        .pipe(connect.reload());
});

/* Image task
 *
 * Copies compressed and optimized images over to dest dir
 */
gulp.task('image', function() {
    gulp.src(config.path.source + config.path.image.src + '/**/*.{jpg,png}')

        // Handle errors
        .pipe(plumber({
            errorHandler: handleError
        }))
        .pipe(gulpif(process.env.NODE_ENV == 'production', cache(imagemin({
            optimizationLevel: 5,
            progressive: true,
            interlaced: true
        }))))
        .pipe(gulp.dest(buildPath + config.path.image.dest))
        .pipe(connect.reload());
});

/* Icon task
 *
 * Copies icons over to dest dir
 */
gulp.task('icon', function() {
    gulp.src(config.path.source + config.path.icon.src + '/**/*.{jpg,png,svg}')

        // Handle errors
        .pipe(plumber({
            errorHandler: handleError
        }))
        .pipe(gulp.dest(buildPath + config.path.icon.dest))
        .pipe(connect.reload());
});

/* Script task
 *
 * Concatenates and uglifies scripts
 */
gulp.task('script', ['html']);

/* Style task
 *
 * Compiles scss files to css dest dir
 */
gulp.task('style', function () {
    var productionProcessors = [
        autoprefixer({
            browsers: ['last 2 version']
        }),
        mqpacker,
        postcssEasings,
        sprites({
            stylesheetPath: buildPath + config.path.style.dest,
            spritePath: buildPath + config.path.image.dest + '/sprite.png',
            retina: config.sprites.retina,
            outputDimensions: true,
            engine: 'pixelsmith',
            filterBy      : function(image) {
              return /\/sprites\/[-\/a-z0-9_]+\.png$/gi.test(image.url);
            },
            verbose: true
        }),
        postcssSVG({
            paths: [config.path.source + config.path.icon.src],
        })
    ];

    var developmentProcessors = [
        autoprefixer({
            browsers: ['last 2 version']
        }),
        postcssEasings,
        sprites({
            stylesheetPath: buildPath + config.path.style.dest,
            spritePath: buildPath + config.path.image.dest + '/sprite.png',
            retina: config.sprites.retina,
            outputDimensions: true,
            engine: 'pixelsmith',
            filterBy      : function(image) {
              return /\/sprites\/[-\/a-z0-9_]+\.png$/gi.test(image.url);
            },
            verbose: true
        }),
        postcssSVG({
            paths: [config.path.source + config.path.icon.src],
        })
    ];

    gulp.src(config.path.source + config.path.style.src + '/*.scss')

        // Handle errors
        .pipe(plumber({
            errorHandler: handleError
        }))
        .pipe(sourcemaps.init())
        .pipe(sass())
        .pipe(gulpif(process.env.NODE_ENV == 'production', csso()))
        .pipe(gulpif(process.env.NODE_ENV == 'production', postcss(productionProcessors), postcss(developmentProcessors)))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest(buildPath + config.path.style.dest))
        .pipe(connect.reload());
});

/* Misc task
 *
 * Copies misc files misc dest dir
 */
gulp.task('misc', function () {
    var files = config.path.misc.files,
        src   = config.path.source + config.path.misc.src,
        dest  = buildPath;

    // Iterate through files from the list
    // We need this because apparently there is a maximum number of files
    for (var i = 0, l = files.length; i < l; i++) {
        // Copy files
        gulp.src(files[i], {cwd: src})

            // Handle errors
            .pipe(plumber({
                errorHandler: handleError
            }))

            .pipe(gulp.dest(dest));
    }
});

/* Watch task
 *
 * Enters watch mode, automatically recompiling assets on source changes
 */
gulp.task('watch', function () {
    gulp.watch(config.path.source + '/*.html', function() {
        gulp.start('html');
    });

    gulp.watch(config.path.source + '/' + config.path.html.partials + '/**/*.partial.html', function() {
        gulp.start('html');
    });

    gulp.watch(config.path.source + config.path.font.src + '/**/*.{eot,otf,svg,ttf,woff}', function() {
        gulp.start('font');
    });

    gulp.watch(config.path.source + config.path.script.src + '/**/*.js', function() {
        gulp.start('script');
    });

    gulp.watch(config.path.source + config.path.sprite.src + '**/*.png', function(cb) {
        gulp.start('style');
    });

    gulp.watch(config.path.source + config.path.icon.src + '**/*.{jpg,png,svg}', function(cb) {
        gulp.start('icon');
    });

    gulp.watch(config.path.source + config.path.style.src + '/**/*.scss', function() {
        gulp.start('style');
    });

    gulp.watch(config.path.source + config.path.image.src + '/**/*.{jpg,png}', function() {
        gulp.start('image');
    });
});

/* Clean:font task
 *
 * Removes font dest folder
 */
gulp.task('clean:font', function (cb) {
    del(buildPath + config.path.font.dest, cb);
});

/* Clean:html task
 *
 * Removes html files from dest folder
 */
gulp.task('clean:html', function (cb) {
    del(buildPath + '*.html', cb);
});

/* Clean:image task
 *
 * Removes image dest folder
 */
gulp.task('clean:image', function (cb) {
    del(buildPath + config.path.image.dest, cb);
});

/* Clean:icon task
 *
 * Removes icons dest folder
 */
gulp.task('clean:icon', function (cb) {
    del(buildPath + config.path.icon.dest, cb);
});

/* Clean:script
 *
 * Clears script dest folder, except vendor subfolder
 */
gulp.task('clean:script', function (cb) {
    del(buildPath + config.path.script.dest, cb);
});

/* Clean:style task
 *
 * Removes style dest folder
 */
gulp.task('clean:style', function (cb) {
    del(buildPath + config.path.style.dest, cb);
});

/* Clean:misc task
 *
 * Removes misc files from dest folder
 */
gulp.task('clean:misc', function (cb) {
    // Clean all files and folders from the list
    del(config.path.misc.files, {
        read: false,
        cwd: buildPath + config.path.misc.dest
    }, cb);
});

/* Clean task
 *
 * Removes html dest folder
 */
gulp.task('clean', [
    'clean:font',
    'clean:html',
    'clean:image',
    'clean:icon',
    'clean:script',
    'clean:style',
    'clean:misc'
]);

/* Build task
 *
 * Compiles all files. Uglify depends on flag (production or development)
 */
gulp.task('build:dev', function(cb) {
    process.env.NODE_ENV = 'development';
    buildPath = config.path.development;
    gulpSequence('clean', ['font', 'html', 'icon', 'image', 'misc', 'style'], cb);
});

gulp.task('build', function(cb) {
    process.env.NODE_ENV = 'production';
    buildPath = config.path.production;
    gulpSequence('clean', ['font', 'html', 'icon', 'image', 'misc', 'style'], cb);
});

/* Default task
 *
 * Compiles all files. Uglify depends on flag (production or development)
 */
gulp.task('default', ['build:dev']);

/* Init task
 *
 * Loads and installs required vendor libraries via bower
 */
gulp.task('init', [
    'bower'
]);

/* Connect task
 *
 * Creates a web server with an index of all html files within html dest dir
 */
// gulp.task('connect', function() {
//     var serveStatic = require('serve-static'),
//         serveIndex  = require('serve-index');

//     var app = require('connect')()
//         .use(serveStatic(buildPath)) // serve files from within a given root directory
//         .use(serveIndex(buildPath)); // returns middlware that serves an index of the directory in the given path

//     require('http')
//         .createServer(app)
//         .listen(config.server.port)
//         .on('listening', function() {
//             console.log('Started connect web server on http://localhost:' + config.server.port);
//         });
// });

gulp.task('connect', function() {
    portfinder.basePort = config.server.port;

    portfinder.getPort(function (err, port) {
        connect.server({
            root: buildPath,
            livereload: false,
            port: port
        });
    });
});

gulp.task('connect:live', function() {
    portfinder.basePort = config.server.port;

    portfinder.getPort(function (err, port) {
        connect.server({
            root: buildPath,
            livereload: true,
            port: port
        });
    });
});

/* Server task
 *
 * Creates a web server and starts watching for any changes within src dir
 */
gulp.task('server', [
    'connect',
    'watch'
]);

/* Server task
 *
 * Creates a web server and starts watching for any changes within src dir
 */
gulp.task('server:live', [
    'connect:live',
    'watch'
]);


// Helper functions

/* Handle error function */
function handleError(errorObject, callback) {
    notify.onError(errorObject.toString().split(': ').join(': ')).apply(this, arguments);
    // Keep gulp from hanging on this task
    if (typeof this.emit === 'function') this.emit('end');
};

/* Get folders inside some diriectory function */
function getFolders(dir) {
    return fs.readdirSync(dir)
        .filter(function(file) {
            return fs.statSync(path.join(dir, file)).isDirectory();
        });
}



// Unused gulp tasks

/* Lint:style task
 *
 * Checks html files for unused css classes and vice versa
 */

// gulp.task('lint:style', /*['html', 'style'],*/ function () {
//     // Check unused css classes
//     gulp.src([config.path.style.dest + '/*.css', config.path.html.dest + '/*.html'])

//         // Handle errors
//         .pipe(plumber({
//             errorHandler: function (error) {
//                 console.log(error.message);
//                 this.emit('end');
//             }
//         }))

//         .pipe(checkCSS({
//             ignore: ['clearfix', /^col-/, /^icon-?/]
//         }));
// });


/* Lint task
 *
 * Uses all available linters
 */

// gulp.task('lint', [
//     'lint:style'
// ]);
