# Barebones HTML project
Barebones HTML project is a set of defaults for a headstart in HTML project
development. It provides developers with common tools to make HTML markup
creation faster and easier.

Unlike most other project templates, Barebones is highly preferential: it makes
a lot of choices for the user right from the beginning:

- It includes a default build system -- [Gulp](http://gulpjs.com/) -- with a set
  of default build instructions in `gulpfile.js`
- It uses [Bower](http://bower.io/) to download third-party libraries for your
  project
- It includes infrastructure for [Compass](http://compass-style.org/) --
  a [SASS](http://sass-lang.com/) framework
- It includes a complete scss stylesheet with a lot of predefined elements
- It includes preferences for [Sublime Text](http://www.sublimetext.com/) --
  an awesome text editor for code and markup

You can, of course, use a different builder, a different (or none at all) CSS
preprocessor or a different editor. But a very specific default choice allows
you to start working sooner. No need to setup build instructions, no need to
download vendor libraries, no need to create a style structure. Unless you want
to change the defaults, that is :)

## Features
Barebones is built for development in Sublime Text. That is why Barebones
provides a default `.sublime-project` file. This file provides the editor with
a list of files and folders to ignore, a default set of formatting settings
for the project, and a build system configuration for Gulp.

Barebones also contains an [.editorconfig](http://editorconfig.org/) file,
which is the preferred way of defining formatting options for the project. To
use it, you must install an [editorconfig plugin](http://editorconfig.org/#download)

## Installation
1. Copy all files from Barebones repository to project directory.
2. Install node dependencies with npm by running:

```npm install```

3. Rename `Barebones.sublime-project` to match your project name
4. Edit `package.json` to match your project information
5. Optionally, edit source and destination build paths in `barebones.json`

## Usage
Barebones contains some default build instructions, including a custom server
task. Before you can start working, you need to download and set up all vendor
dependencies:

```gulp init```

After that you can just run the server task, and it will rebuild your resources
every time you save changes in the source files:

```gulp server```

**Note:** shortly after running the server task, gulp will report that the task
is finished. The server itself will continue to run. To stop the server task,
press Ctrl+C (or Cmd+C) in the console.

You can also initiate rebuild from within Sublime Text by pressing Ctrl+B (or Cmd+B).
To use this shortcut, you must select "Barebones Gulp" in Sublime's
"Tools" > "Build System" menu.

## License
Copyright (c) 2014 Anton Suprun
Licensed under the MIT license

This software uses parts of HTML5 Boilerplate licensed under the MIT license
and its source can be downloaded [here](https://github.com/h5bp/html5-boilerplate).
