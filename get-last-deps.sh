
echo "Moving directory to aurelia-three plugin"
cd ../
cd aurelia-three
# READ LAST COMMIT HASH
read -r athash<.git/refs/heads/master
echo "Latest aurelia-three git hash: $athash"

echo "Moving directory to aurelia-bcf plugin"
cd ../
cd aurelia-bcf
# READ LAST COMMIT HASH
read -r abcfhash<.git/refs/heads/master
echo "Latest aurelia-bcf git hash: $abcfhash"

echo "Moving directory to bimetat-app directory"
cd ../bimetat-app

echo "Updating package.json with latest git hash of aurelia-three"
search='("aurelia-three": ")(.*)#([a-z0-9]*)(")'
replace="\1\2#${athash}\4"
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i "" -E "s/${search}/${replace}/g" "package.json"
else
  sed -i -E "s/${search}/${replace}/g" "package.json"
fi

echo "Updating package.json with latest git hash of aurelia-bcf"
search='("aurelia-bcf": ")(.*)#([a-z0-9]*)(")'
replace="\1\2#${abcfhash}\4"
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i "" -E "s/${search}/${replace}/g" "package.json"
else
  sed -i -E "s/${search}/${replace}/g" "package.json"
fi


sleep 1
echo "npm install to pull in the latest version of plugins"
rm -rf node_modules/aurelia-resources
rm -rf node_modules/aurelia-deco
rm -rf node_modules/aurelia-three
rm -rf node_modules/aurelia-bcf
rm package-lock.json
npm install
git add package.json package-lock.json
