#!/bin/bash -e
NEWHOST='"host":"'$HOST'"'

LOCALHOST='"host":"http://localhost:3000"'


for jsfile in /usr/share/nginx/html/*.chunk.js
do
   sed -i 's,'$LOCALHOST','$NEWHOST',g' $jsfile
done
