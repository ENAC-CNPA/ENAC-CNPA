#!/bin/bash -e
NEWHOST='"host":"'$HOST'"'

LOCALHOST='"host":"http://localhost:3000"'
LOCALHOST1='"host":"https://api.swissdata.io/prod"'

for jsfile in /usr/share/nginx/html/*.chunk.js
do
   sed -i 's,'$LOCALHOST','$NEWHOST',g' $jsfile
done


for jsfile in /usr/share/nginx/html/*.chunk.js
do
   sed -i 's,'$LOCALHOST1','$NEWHOST',g' $jsfile
done
