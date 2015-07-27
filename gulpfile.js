// Basic stuff we need
var exec    = require('child_process').exec,
    del     = require('del'),
    config  = require('./barebones.json'),
    gulp    = require('gulp');

// Gulp plugins
var rename       = require('gulp-rename'),
    filter       = require('gulp-filter'),
    plumber      = require('gulp-plumber'),
    gulpSequence = require('gulp-sequence'),
    watch        = require('gulp-watch'),
    notify       = require("gulp-notify"),

    cache        = require('gulp-cache'),
    imagemin     = require('gulp-imagemin'),
    fileinclude  = require('gulp-file-include'),

    sourcemaps   = require('gulp-sourcemaps'),
    spritesmith  = require('gulp.spritesmith'),
    merge        = require('merge-stream'),

    sass         = require('gulp-sass'),
    postcss      = require('gulp-postcss'),
    autoprefixer = require('autoprefixer'),
    sprites      = require('postcss-sprites'),
    mqpacker     = require('css-mqpacker'),
    csswring     = require('csswring'),

    useref       = require('gulp-useref'),
    uglify       = require('gulp-uglify');

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
    gulp.src(config.path.font.src + '/**/*.{eot,otf,svg,ttf,woff}')

        // Handle errors
        .pipe(plumber({
            errorHandler: handleError
        }))

        .pipe(gulp.dest(config.path.font.dest));
});

/* Html task
 *
 * Copies html files over to dest dir
 */
gulp.task('html', function () {
    var assets  = useref.assets(),
        jsfiles = filter("**/*.js");

    gulp.src(config.path.html.src + '/*.html')

        // Handle errors
        .pipe(plumber({
            errorHandler: handleError
        }))

        // Include partials
        .pipe(fileinclude({
            prefix: config.partials.prefix,
            suffix: config.partials.suffix,
            basepath: config.path.html.partials + '/',
            context: config.partials.context
        }))

        // Include all available assets
        .pipe(assets)

        // Concatenate and minify javascripts
        .pipe(jsfiles)
        .pipe(uglify())
        .pipe(jsfiles.restore())

        // Restore html stream and write concatenated js file names
        .pipe(assets.restore())
        .pipe(useref())
        .pipe(gulp.dest(config.path.html.dest));
});

/* Image task
 *
 * Copies compressed and optimized images over to dest dir
 */
gulp.task('image', function() {
    gulp.src(config.path.image.src + '/**/*.{jpg,png}')

        // Handle errors
        .pipe(plumber({
            errorHandler: handleError
        }))

        .pipe(cache(imagemin({
            optimizationLevel: 5,
            progressive: true,
            interlaced: true
        })))
        .pipe(gulp.dest(config.path.image.dest));
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
    gulp.src(config.path.style.src + '/*.scss')

        // Handle errors
        .pipe(plumber({
            errorHandler: handleError
        }))
        .pipe(sourcemaps.init())
        .pipe(sass({outputStyle: 'compressed'}))
        .pipe(postcss([
            autoprefixer({
                browsers: ['last 2 version']
            }),
            mqpacker,
            csswring
        ]))
        .pipe(rename({suffix: '.min'}))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest(config.path.style.dest));
});

/* Sprite task
 *
 * Creates sprite from icons in /sprites folder, 
 * copies it to the dest folder, and creates _sprite.scss 
 * into src/styles folder before 'styles' task begins
 */
gulp.task('sprite', function () {
    // Generate our spritesheet
    var spriteData = gulp.src(config.path.sprite.src + '/**/*.png')
        .pipe(spritesmith({
            imgName: 'sprite.png',
            cssName: '_sprite.scss',
            imgPath: '../images/sprite.png'
        }));

    // Pipe image stream through image optimizer and onto disk
    var imgStream = spriteData.img
        .pipe(gulp.dest(config.path.image.dest));

    // Pipe CSS stream through CSS optimizer and onto disk
    var scssStream = spriteData.css
        .pipe(gulp.dest(config.path.style.src + '/generated'));

    return merge(imgStream, scssStream);
});

/* Misc task
 *
 * Copies misc files misc dest dir
 */
gulp.task('misc', function () {
    var files = config.path.misc.files,
        src   = config.path.misc.src,
        dest  = config.path.misc.dest;

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
    watch(config.path.html.src + '/*.html', function() { 
        gulp.start('html')
    });

    watch(config.path.html.partials + '/**/*.partial.html', function() { 
        gulp.start('html')
    });

    watch(config.path.font.src + '/**/*.{eot,otf,svg,ttf,woff}', function() { 
        gulp.start('font')
    });

    watch(config.path.script.src + '/**/*.js', function() { 
        gulp.start('script')
    });

    watch(config.path.sprite.src + '**/*.png', function(cb) { 
        gulp.start('sprite')
    });

    watch(config.path.style.src + '/**/*.scss', function() { 
        gulp.start('style')
    });

    watch(config.path.image.src + '/**/*.{jpg,png}', function() { 
        gulp.start('image')
    });
});

/* Clean:font task
 *
 * Removes font dest folder
 */
gulp.task('clean:font', function (cb) {
    del(config.path.font.dest, cb);
});

/* Clean:html task
 *
 * Removes html files from dest folder
 */
gulp.task('clean:html', function (cb) {
    del(config.path.html.dest + '/*.html', cb);
});

/* Clean:image task
 *
 * Removes image dest folder
 */
gulp.task('clean:image', function (cb) {
    del(config.path.image.dest, cb);
    gulp.src(config.path.image.src + '/**/*.{jpg,png}')

        // Handle errors
        .pipe(plumber({
            errorHandler: handleError
        }))

        .pipe(cache.clear());
});

/* Clean:sprite task
 *
 * Removes sprite.png from dest folder
 */
gulp.task('clean:sprite', function (cb) {
    del(config.path.image.dest, cb);
    gulp.src(config.path.image.src + '/sprite.png')

        // Handle errors
        .pipe(plumber({
            errorHandler: handleError
        }))

        .pipe(cache.clear());
});

/* Clean:script
 *
 * Clears script dest folder, except vendor subfolder
 */
gulp.task('clean:script', function (cb) {
    del(config.path.script.dest, cb);
});

/* Clean:style task
 *
 * Removes style dest folder
 */
gulp.task('clean:style', function (cb) {
    del(config.path.style.dest, cb);
});

/* Clean:misc task
 *
 * Removes misc files from dest folder
 */
gulp.task('clean:misc', function (cb) {
    // Clean all files and folders from the list
    del(config.path.misc.files, {
        read: false,
        cwd: config.path.misc.dest
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
    'clean:sprite',
    'clean:script',
    'clean:style',
    'clean:misc'
]);

/* Default task
 *
 * Compiles all files
 */
gulp.task('default', function(cb) {
    gulpSequence('clean', ['font', 'html', 'sprite', 'image', 'misc'], ['style'], cb);
});

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
gulp.task('connect', function() {
    var serveStatic = require('serve-static'),
        serveIndex  = require('serve-index');

    var app = require('connect')()
        .use(serveStatic(config.path.html.dest)) // serve files from within a given root directory
        .use(serveIndex(config.path.html.dest)); // returns middlware that serves an index of the directory in the given path

    require('http')
        .createServer(app)
        .listen(config.server.port)
        .on('listening', function() {
            console.log('Started connect web server on http://localhost:' + config.server.port);
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



/* Handle error function */
function handleError(errorObject, callback) {
    notify.onError(errorObject.toString().split(': ').join(': ')).apply(this, arguments);
    // Keep gulp from hanging on this task
    if (typeof this.emit === 'function') this.emit('end');
};



/* Unused gulp tasks */

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
