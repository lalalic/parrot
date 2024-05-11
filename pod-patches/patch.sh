#!/bin/bash

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

echo '----pod-patches---'

echo 'boost hash.hpp'
# Replace the file within the pod's directory
cp "$SCRIPT_DIR/hash.hpp" "$SCRIPT_DIR/../ios/Pods/boost/boost/container_hash/hash.hpp"

echo '----end pod-patches---'

