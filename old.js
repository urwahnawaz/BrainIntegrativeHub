function createDBPageURL(db, pageCurr = 0, pageSize = 100) {
    let rangeStart = pageCurr * pageSize
    let rangeEnd = rangeStart = pageSize
    var contents = db.exec("SELECT * FROM circrna LIMIT " + rangeStart + ", " + rangeEnd)[0];
    ret = { total: contents.values.length, rows: new Array(contents.values.length) }
    for (let i = 0; i < contents.values.length; ++i) {
        for (let j = 0; j < contents.headings.length; ++j) {
            ret.rows[contents.headings[j]] = contents.values[i][j];
        }
    }
    let blob = new Blob([JSON.stringify(ret)], { type: 'text/json' });
    return URL.createObjectURL(blob)
}

function destroyDBPageURL(url) {
    URL.revokeObjectURL(url)
}