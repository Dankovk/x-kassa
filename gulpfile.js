// Basic stuff we need
var exec   = require('child_process').exec,
    config = require('./barebones.json'),
    gulp   = require('gulp');

// Gulp plugins
var rename = require("gulp-rename"),
    clean  = require('gulp-clean'),

    cache    = require('gulp-cache'),
    imagemin = require('gulp-imagemin'),

    compass      = require('gulp-compass'),
    autoprefixer = require('gulp-autoprefixer'),
    minifycss    = require('gulp-minify-css'),

    uglify = require('gulp-uglify');

/* Project directory structure
 *
 * barebones
 * |
 * |- bower_components          [vendor]  libraries (via Bower)
 * |- dist                      [project] compiled files (html)
 * |  |- fonts                  [fonts]   compressed (eot, svg, ttf, woff)
 * |  |- images                 [images]  compressed (jpg, png) and sprites (png)
 * |  |- scripts                [scripts] combined and minified (min.js)
 * |  |  '- vendor              [scripts] vendor libraries (min.js)
 * |  '- styles                 [styles]  prefixed and minifed (min.css)
 * '- src                       [project] source files (html)
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
gulp.task('vendor', ['vendor:normalize', 'vendor:jquery', 'vendor:modernizr']);

/* Vendor:normalize subtask
 *
 * Copies normalize.scss to style vendor dir
 */
gulp.task('vendor:normalize', ['bower'], function () {
    gulp.src('bower_components/normalize-scss/_normalize.scss')
        .pipe(gulp.dest(config.path.style.vendor));
});

/* Vendor:jquery subtask
 *
 * Copies jquery to vendor dest dir
 */
gulp.task('vendor:jquery', ['bower'], function () {
    gulp.src('bower_components/jquery/dist/jquery.min.js')
        .pipe(rename('jquery-2.1.1.min.js'))
        .pipe(gulp.dest(config.path.script.vendor));
});

/* Vendor:modernizr subtask
 *
 * Copies modernizr to vendor dest dir
 */
gulp.task('vendor:modernizr', ['bower'], function () {
    gulp.src('bower_components/modernizr/modernizr.js')
        .pipe(uglify())
        .pipe(rename('modernizr-2.8.2.min.js'))
        .pipe(gulp.dest(config.path.script.vendor));
});

/* Font task
 *
 * Copies font files over to dest dir
 */
gulp.task('font', function () {
    gulp.src(config.path.font.src + '/**/*')
        .pipe(gulp.dest(config.path.font.dest));
});

/* Image task
 *
 * Copies compressed and optimized images over to dest dir
 */
gulp.task('image', function() {
  gulp.src(config.path.image.src + '/**/*')
      .pipe(cache(imagemin({
            optimizationLevel: 5,
            progressive: true,
            interlaced: true
      })))
      .pipe(gulp.dest(config.path.image.dest));
});

/* Compass task
 *
 * Compiles main.scss to main.min.css
 */
gulp.task('style', ['vendor:normalize'], function () {
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

/* Html task
 *
 * Copies html files over to dest dir
 */
gulp.task('html', function () {
    gulp.src(config.path.html.src + '/*.html')
        .pipe(gulp.dest(config.path.html.dest));
});

/* Watch task
 *
 * Enters watch mode, automatically recompiling assets on source changes
 */
gulp.task('watch', function () {
    gulp.watch(config.path.font.src + '/**/*', ['font']);
    gulp.watch(config.path.image.src + '/**/*', ['image']);
    gulp.watch([
        config.path.style.src + '/*.scss',
        config.path.sprite.src + '/**/*'
    ], ['style']);
    gulp.watch(config.path.html.src + '/*.html', ['html']);
});

/* Clean task
 *
 * Removes html dest folder
 */
gulp.task('clean', function () {
    gulp.src([config.path.html.dest], {read: false})
        .pipe(clean());
});

/* Clean:font task
 *
 * Removes font dest folder
 */
gulp.task('clean:font', function () {
     gulp.src([config.path.font.dest], {read: false})
         .pipe(clean());
});

/* Clean:image task
 *
 * Removes image dest folder
 */
gulp.task('clean:image', function () {
     gulp.src([config.path.image.dest], {read: false})
         .pipe(clean());
});

/* Clean:style task
 *
 * Removes style dest folder
 */
gulp.task('clean:style', function () {
    gulp.src([config.path.style.dest], {read: false})
        .pipe(clean());
});

/* Default task
 *
 * Compiles dev version (uncompressed css and js)
 */
gulp.task('default', ['bower', 'font', 'image', 'style', 'html', 'vendor']);

/* Dev task
 *
 * Enters dev mode: compiles all resources and starts watching for changes
 */
gulp.task('dev', ['bower', 'font', 'image', 'style', 'html', 'vendor', 'watch']);

// validation
