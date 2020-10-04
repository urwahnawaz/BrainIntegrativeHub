async function loadMetadata() {
    var metaIndexObj = undefined;
    let dir = window.location.origin + "/resources/data/";

    //Inline function to parse CSV files
    function loadCSV(path) {
        return new Promise(function (complete, error) {
            fetch(path).then(r => r.blob()).then(function (file) {
                Papa.parse(file, {
                    dynamicTyping: true,
                    complete: function (results) {
                        complete(results.data)
                    }
                });
            });
        });
    }

    await fetch(dir + "meta.json", {headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }}).then(r => r.json()).then(async function (obj) {
        metaIndexObj = obj;

        //Download all files
        let promises = [];
        for(let group of Object.keys(obj)) {
            for(let entry of Object.keys(obj[group])) {
                console.log(entry);
                promises.push(loadCSV(dir + obj[group][entry].metadata).then(o => obj[group][entry].metadataObj = o));
                for(let matrix of Object.keys(obj[group][entry].matrices)) {
                    console.log(matrix);
                    promises.push(loadCSV(dir + obj[group][entry].matrices[matrix]).then(o => obj[group][entry].matrices[(matrix + "Obj")] = o));
                }
            }
        }
        
        await Promise.all(promises);
    });
    return metaIndexObj;
}