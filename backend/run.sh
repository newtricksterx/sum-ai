#!/bin/sh
set -e
gunicaorn backend.wsgi --log-file -