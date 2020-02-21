#!/bin/bash
composer dump-autoload
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear 
php artisan module:optimize