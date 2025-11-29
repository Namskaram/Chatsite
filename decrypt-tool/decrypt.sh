#!/bin/bash

if [ -z "$1" ]; then
    echo "Usage: ./decrypt.sh <encrypted-json-file>"
    exit 1
fi

export ENCRYPTION_KEY="<YOUR_BASE64_KEY>"

node decrypt.js "$1"
