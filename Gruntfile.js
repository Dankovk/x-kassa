module.exports = function (grunt) {
    'use strict';

    grunt.util.linefeed = '\n';

    // Project config
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        banner: '/*!\n' +
                ' * <%= pkg.name %> v<%= pkg.version %>\n' +
                ' * Copyright 2014 <%= pkg.author %>\n' +
                ' * Licensed under <%= pkg.license.type %> (<%= pkg.license.url %>)\n' +
                '*/\n',

        // Path config
        // -----------
        path: {
            vendor: {
                src: "bower_components",
                dest: "<%= path.script.dest %>/vendor"
            },
            script: {
                src: "src/scripts",
                dest: "scripts"
            },
            style: {
                src: "src/styles",
                dest: "styles"
            },
            image: {
                src: "src/images",
                dest: "images"
            },
            font: "fonts",
            http: "/",
            temp: "temp"
        },

        // Task config
        // -----------
        clean: {
            normalize: '<%= path.style.src %>/base/_normalize.scss',
            temp: '<%= path.temp %>',
            vendor: ['<%= path.vendor.dest %>/jquery-2.1.1.min.js', '<%= path.vendor.dest %>/modernizr-2.8.2.min.js']
        },

        compass: {
            // Compass config as it appears in config.rb
            options: {
                sassDir: '<%= path.style.src %>',
                cssDir: '<%= path.style.dest %>',
                imagesDir: '<%= path.image.src %>',
                javascriptsDir: '<%= path.script.dest %>',
                fontsDir: '<%= path.font %>',
                generatedImagesDir: '<%= path.image.dest %>',
                httpPath: '<%= path.http %>',
                noLineComments: true,
                relativeAssets: true
            },

            clean: {
                options: {
                    clean: true
                }
            },
            dev: {
                options: {
                    environment: 'development'
                }
            },
            dist: {
                options: {
                    environment: 'production',
                    force: true
                }
            }
        },

        concat: {
            options: {
                banner: '<%= banner %>',
                stripBanners: true
            }
        },

        copy: {
            jquery: {
                src: '<%= path.vendor.src %>/jquery/dist/jquery.min.js',
                dest: '<%= path.vendor.dest %>/jquery-2.1.1.min.js'
            },
            normalize: {
                src: '<%= path.vendor.src %>/normalize-scss/_normalize.scss',
                dest: '<%= path.style.src %>/base/_normalize.scss'
            }
        },

        exec: {
            'bower-install': {
                command: 'bower install'
            }
        },

        uglify: {
            modernizr: {
                options: {
                    stripBanners: false
                },
                src: '<%= path.vendor.src %>/modernizr/modernizr.js',
                dest: '<%= path.vendor.dest %>/modernizr-2.8.2.min.js'
            }
        },

        validation: {
            options: {
                charset: 'utf-8',
                doctype: 'HTML5',
                failHard: true,
                reset: true,
                relaxerror: [
                    'Bad value X-UA-Compatible for attribute http-equiv on element meta.'
                ]
            },
            src: '**.html'
        },

        watch: {
            compass: {
                files: '<%= path.style.src %>/**.scss',
                tasks: ['copy:normalize', 'compass:dev']
            },
            html: {
                files: '**.html',
                tasks: 'validation'
            }
        }
    });

    // Load tasks
    require('load-grunt-tasks')(grunt, {scope: 'devDependencies'});
    require('time-grunt')(grunt);

    // Task shortcuts
    grunt.registerTask('bower:install', 'exec:bower-install');

    grunt.registerTask('copy:vendor', ['copy:jquery', 'uglify:modernizr']);
    grunt.registerTask('compile:compass-dev', ['copy:normalize', 'compass:dev', 'clean:normalize']);
    grunt.registerTask('compile:compass-dist', ['copy:normalize', 'compass:dist', 'clean:normalize']);

    grunt.registerTask('dev', ['bower:install', 'compile:compass-dev', 'copy:vendor']);
    grunt.registerTask('dist', ['bower:install', 'compile:compass-dist', 'copy:vendor']);

    // Default task
    grunt.registerTask('default', 'dev');

};
