async function loadDB(success) {
    var initSqlJs = window.initSqlJs;
    const SQL = await initSqlJs({
        locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.1.0/dist/${file}`
    });

    var xhr = new XMLHttpRequest();
    xhr.open('GET', window.location.href + "resources/data/out.db.gz", true);
    xhr.responseType = 'arraybuffer';

    xhr.onload = function(e) {
        var uInt8Array = pako.inflate(this.response);
        success(new SQL.Database(uInt8Array));
    }
    xhr.send();
}