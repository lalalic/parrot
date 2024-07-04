#!/bin/bash

ios_dir="$1"
PATCHES_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

PODS_DIR="$ios_dir/Pods"


echo 'patch pod boost...'
cp -r "$PATCHES_DIR/boost/." "$PODS_DIR/boost"

echo '----end pod-patches---'

