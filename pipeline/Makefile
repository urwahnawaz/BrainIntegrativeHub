#----HOW TO USE:----
#Create input.yaml in /pipeline folder, typically input_example.yaml with minor changes

#----AUTOMATIC RUN:----
#make setup (once, some netlify-cli errors can be ignored)
#make all (run pipeline and upload to netlify)

#----MANUAL RUN:----
#make pipeline (each time data changes, takes 30mins - 1hr)
#make deploy (send data to netlify or switch netlify projects)
#make clean (optional, for now just empties cache)

#----BE WARNED:----
#Changes in metadata/data contents WILL reflect in the deployed site immediately - remove --prod or use two sites if you are unsure
#Changes to metadata.json (netlify project name changes, download tab, about tab) WILL NOT reflect in the deployed site until you git push.

all: pipeline deploy

setup: requirements.txt
	pip3 install -q -r requirements.txt
	npm install netlify-cli -g

pipeline: input.yaml
	python3 main.py

#	Use a simple python script to grab metadata and generate metadata.json
deploy: input.yaml
	$(eval helper := $(shell python3 make_helper.py input.yaml))
	$(eval output := $(word 1, ${helper}))
	$(eval project := $(word 2, ${helper}))
	$(eval count := $(word 3, ${helper}))
	$(eval export NETLIFY_AUTH_TOKEN := $(or $(word 4, ${helper}),$${NETLIFY_AUTH_TOKEN}))

	@if [ -z ${output} ]; then echo "error: output (i.e. output folder, ssd recommended) not defined in input.yaml"; exit 1; fi

	@if [ -z ${project} ]; then echo "error: project (i.e. netlify project name) not defined in input.yaml"; exit 1; fi

	@if [ -z ${NETLIFY_AUTH_TOKEN} ]; then echo "error: netlifyToken (i.e. https://app.netlify.com/user/applications/personal) not defined in NETLIFY_AUTH_TOKEN or input.yaml)"; exit 1; fi

#	Important settings so we can use partial GET requests on .matrix files
	cp -R -u -p ./data/netlify.toml "${output}"

#	Deploy
	@ cd "${output}";\
	echo | netlify sites:create -n "${project}";\
	echo | netlify deploy --site "${project}" --prod;\

clean:
	rm -rf __pycache__
