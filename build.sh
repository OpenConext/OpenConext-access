#!/bin/bash
#
# Setup env
nvm use 22
FLAVORS_ROOT="flavors"

# build default version
/opt/apache-maven-3.9.9/bin/mvn clean install -Ddir=target


# Check if the flavors need to be build
if [ ! -d "$FLAVORS_ROOT" ]; then
    echo "Directory '$FLAVORS_ROOT' not found. No flavours to be build"
    exit 0
fi

# Iterate through all items in the flavors directory
for d in "$FLAVORS_ROOT"/* ; do
    if [ -d "$d" ]; then
        FLAVOR_NAME=$(basename "$d")
        
        echo "Processing flavor directory: **$FLAVOR_NAME**"
        
        echo "Copying contents of '$d' to '..'"
        cp -r "$d"/. ..
        
        TARGET_DIR_NAME="target-$FLAVOR_NAME"
      
        /opt/apache-maven-3.9.9/bin/mvn clean install -Ddir=$TARGET_DIR_NAME
    fi
done





