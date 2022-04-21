#Install (do this yourself in a virtual env if you want)
pip install -r requirements.txt
npm install netlify-cli -g

#Login now so it will upload automatically
netlify login

#Run pipeline (CAN TAKE OVER 30 MINS)
python main.py

#Netlify project (hard-coded inside resources/js/metaPanel.js)
publishProject="hopeful-austin-9ca901"

#Get the output directory from input.yaml
publishDir="./output"
output=$(head -n 1 input.yaml)
regex="output:[ \"\']*([^#\"\']*)"
if [[ $output =~ $regex ]]
then
    publishDir="${BASH_REMATCH[1]}"
fi

#Convert to unix path if we are in WSL
if [[ -n "$IS_WSL" || -n "$WSL_DISTRO_NAME" ]]; then
    publishDir=$(wslpath -a "$publishDir")
fi

#Important settings so we can use partial GET requests on .matrix files
cp -R -u -p ./data/netlify.toml "$publishDir"

cd "$publishDir"

#Deploy
echo | netlify sites:create -n $publishProject
echo | netlify deploy --site $publishProject

