#!/bin/bash

rm -rf docs/api/; ringo-doc -s lib/ -d docs/api/ -n "Stick API"
