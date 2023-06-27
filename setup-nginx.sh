#!/bin/bash

# Define variables
SITE_NAME="astro-sqlite-tts-feed"
DOMAIN_NAME="tts-feed.larryhudson.io"
APP_PORT="3000"
NGINX_CONF_FILE_PATH="/etc/nginx/sites-available/${DOMAIN_NAME}"

# Create a new nginx configuration file for the site
sudo tee ${NGINX_CONF_FILE_PATH}  <<EOF
server {
    listen 80;
    server_name ${DOMAIN_NAME};

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable the new site
sudo ln -s ${NGINX_CONF_FILE_PATH} /etc/nginx/sites-enabled/

# Test the configuration and reload Nginx
sudo nginx -t && sudo systemctl reload nginx

# At this point, should wait for the site to start working

# Request a new SSL certificate using the nginx plugin
sudo certbot --nginx -d ${DOMAIN_NAME}
