# PATHS
# -----
# www root path
http_path = "/dist/"

# css destination directory
css_dir = "dist/styles"

# scss source directory
sass_dir = "src/styles"

# sprite source directory
images_dir = "src/sprites"

# js destination directory
javascripts_dir = "dist/scripts"

# font destination directory
fonts_dir = "dist/fonts"

# image destination directory
generated_images_dir = "dist/images"

# SETTINGS
# --------
# css output style
output_style = (environment == :production) ? :compressed : :expanded

# enable relative assets
relative_assets = true

# disable line comments
line_comments = false
