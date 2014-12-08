# Read barebones.json
# -------------------
begin
    require 'open-uri'
    require 'json'

    data   = File.read('barebones.json')
    config = JSON.parse(data)
rescue
    abort("Error trying to read 'barebones.json'. Make sure it exists and is a valid JSON file")
end

# PATHS
# -----
http_path  = config['path']['http']
css_dir    = config['path']['style']['dest']
sass_dir   = config['path']['style']['src']
images_dir = config['path']['sprite']['src']
fonts_dir  = config['path']['font']['dest']

javascripts_dir      = config['path']['script']['dest']
generated_images_dir = config['path']['sprite']['dest']

# SETTINGS
# --------
output_style = :expanded # the css is compiled after autoprefixer is done with it
relative_assets = true
line_comments = false # disable line comments
