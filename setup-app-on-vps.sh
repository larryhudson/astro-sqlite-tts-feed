#!/bin/bash

# Define variables
echo "Enter app name for PM2"
APP_NAME=$(gum input --placeholder "astro-sqlite-tts-feed")
APP_START_FILE="$PWD/dist/server/entry.mjs"

gum spin --spinner dot --title "Installing dependencies" -- npm install

# Run build script
gum spin --spinner dot --title "Running build command" -- npm run build

# Add app to pm2
gum spin --spinner dot --title "Adding app to pm2" -- pm2 start $APP_START_FILE --name $APP_NAME

# Save pm2 configuration
gum spin --spinner dot --title "Saving pm2 config" -- pm2 save
