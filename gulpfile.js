// Basic stuff we need
var exec   = require('child_process').exec,
    config = require('./barebones.json'),
    gulp   = require('gulp');

// Gulp plugins
var rename = require("gulp-rename"),
    rimraf = require('gulp-rimraf'),
    filter = require('gulp-filter'),

    cache    = require('gulp-cache'),
    imagemin = require('gulp-imagemin'),

    compass      = require('gulp-compass'),
    autoprefixer = require('gulp-autoprefixer'),
    minifycss    = require('gulp-minify-css'),

    useref = require('gulp-useref'),
    uglify = require('gulp-uglify');

/* Project directory structure
 *
 * barebones
 * |
 * |- bower_components          [vendor]  libraries (via Bower)
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
 *    '- styles                 [styles]  uncompiled source (scss)
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

/* Vendor task
 *
 * Copies all vendor dependencies into their respective locations
 */
gulp.task('vendor', ['vendor:normalize', 'vendor:modernizr', 'vendor:jquery', 'vendor:bootstrap', 'vendor:jquery-mousewheel', 'vendor:jquery-touchswipe']);

/* Vendor:normalize subtask
 *
 * Copies normalize.scss to style vendor dir
 */
gulp.task('vendor:normalize', ['bower'], function () {
    gulp.src('bower_components/normalize-scss/_normalize.scss')
        .pipe(gulp.dest(config.path.style.vendor));
});

/* Vendor:modernizr subtask
 *
 * Copies modernizr to js vendor dir
 */
gulp.task('vendor:modernizr', ['bower'], function () {
    gulp.src('bower_components/modernizr/modernizr.js')
        .pipe(gulp.dest(config.path.script.vendor));
});

/* Vendor:jquery subtask
 *
 * Copies jquery to dest js vendor dir
 */
gulp.task('vendor:jquery', ['bower'], function () {
    gulp.src('bower_components/jquery/dist/jquery.min.js')
        .pipe(rename('jquery-2.1.1.min.js'))
        .pipe(gulp.dest(config.path.script.dest + '/vendor'));
});

/* Vendor:bootstrap task
 *
 * Copies bootstrap js files to js vendor dir
 */
gulp.task('vendor:bootstrap', ['bower'], function () {
    gulp.src('bower_components/bootstrap/js/*.js')
        .pipe(rename({prefix: 'bootstrap-'}))
        .pipe(gulp.dest(config.path.script.vendor));
});

/* Vendor:jquery-mousewheel task
 *
 * Copies jquery-mousewheel js file to js vendor dir
 */
gulp.task('vendor:jquery-mousewheel', ['bower'], function () {
    gulp.src('bower_components/jquery-mousewheel/jquery.mousewheel.js')
        .pipe(rename('jquery-mousewheel.js'))
        .pipe(gulp.dest(config.path.script.vendor));
});

/* Vendor:jquery-touchswipe task
 *
 * Copies jquery-touchswipe js file to js vendor dir
 */
gulp.task('vendor:jquery-touchswipe', ['bower'], function () {
    gulp.src('bower_components/jquery-touchswipe/jquery.touchSwipe.js')
        .pipe(rename('jquery-touchswipe.js'))
        .pipe(gulp.dest(config.path.script.vendor));
});

/* Font task
 *
 * Copies font files over to dest dir
 */
gulp.task('font', function () {
    gulp.src(config.path.font.src + '/**/*.{eot,otf,svg,ttf,woff}')
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
        .pipe(compass({
            config_file: 'config.rb',
            css: config.path.style.dest,
            sass: config.path.style.src,
            style: 'expanded'
        }))
        .on('error', function (err) {}) // Error message is output by the plugin
        .pipe(autoprefixer("> 1%", "last 2 version"))
        .pipe(gulp.dest(config.path.style.dest))
        .pipe(rename({suffix: '.min'}))
        .pipe(minifycss())
        .pipe(gulp.dest(config.path.style.dest));
});

/* Misc task
 *
 * Copies misc files misc dest dir
 */
gulp.task('misc', function () {
    // Compile a list of all paths
    var files = config.path.misc.files || [],
        src   = config.path.misc.src,
        dest  = config.path.misc.dest,
        paths = [];

    // Compile a list of files
    for (var i = 0, l = files.length; i < l; i++) {
        paths.push(src + '/' + files[i]);
    }

    // Copy all files from the list
    gulp.src(paths)
        .pipe(gulp.dest(dest));
});

/* Watch task
 *
 * Enters watch mode, automatically recompiling assets on source changes
 */
gulp.task('watch', function () {
    gulp.watch(config.path.font.src + '/**/*.{eot,otf,svg,ttf,woff}', ['font']);
    gulp.watch(config.path.html.src + '/*.html', ['html']);
    gulp.watch(config.path.image.src + '/**/*.{jpg,png}', ['image']);
    gulp.watch(config.path.script.src + '/**/*.js', ['script']);
    gulp.watch([
        config.path.style.src + '/**/*.scss',
        config.path.sprite.src + '/**/*.png' // TODO: check if sprites support jpegs
    ], ['style']);
});

/* Clean:font task
 *
 * Removes font dest folder
 */
gulp.task('clean:font', function () {
    gulp.src(config.path.font.dest, {read: false})
        .pipe(rimraf());
});

/* Clean:html task
 *
 * Removes html files from dest folder
 */
gulp.task('clean:html', function () {
    gulp.src(config.path.html.dest + '/*.html', {read: false})
        .pipe(rimraf());
});

/* Clean:image task
 *
 * Removes image dest folder
 */
gulp.task('clean:image', function () {
    gulp.src(config.path.image.dest, {read: false})
        .pipe(rimraf())
        .pipe(cache.clear());
});

/* Clean:script
 *
 * Clears script dest folder, except vendor subfolder
 */
gulp.task('clean:script', function () {
    gulp.src([
        config.path.script.dest + '/**/*',
        '!' + config.path.script.dest + '/vendor',
        '!' + config.path.script.dest + '/vendor/**/*.js'
    ], {read: false})
        .pipe(rimraf());
});

/* Clean:style task
 *
 * Removes style dest folder
 */
gulp.task('clean:style', function () {
    gulp.src(config.path.style.dest, {read: false})
        .pipe(rimraf());
});

/* Clean:misc task
 *
 * Removes misc files from dest folder
 */
gulp.task('clean:misc', function () {
    // Compile a list of all paths
    var files = config.path.misc.files || [],
        dest  = config.path.misc.dest,
        paths = [];

    // Compile a list of files
    for (var i = 0, l = files.length; i < l; i++) {
        paths.push(dest + '/' + files[i]);
    }

    // Clean all files and folders from the list
    gulp.src(paths, {read: false})
        .pipe(clean());
});

/* Clean task
 *
 * Removes html dest folder
 */
gulp.task('clean', ['clean:font', 'clean:html', 'clean:image', 'clean:script', 'clean:style', 'clean:misc']);

/* Default task
 *
 * Compiles all files
 */
gulp.task('default', ['font', 'html', 'image', 'script', 'style', 'misc']);

/* Init task
 *
 * Loads and installs required vendor libraries via bower
 */
gulp.task('init', ['bower', 'vendor']);

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
gulp.task('server', ['connect', 'watch']);

// validation
