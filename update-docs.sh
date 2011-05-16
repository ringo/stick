#!/bin/bash

rm -rf docs/api/; ringo-doc --file-urls -s lib/ -d docs/api/ -n "Stick API"
