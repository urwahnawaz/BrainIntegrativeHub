function searchDeliminated(string, array, delim=",", keepOrder=false) {
    let terms = string.split(delim).map(v => v.trim()).filter(v => v);

    let aIndices = new Array(array.length);
    for (var i=0; i < array.length; ++i) aIndices[i] = i;
    aIndices.sort((a, b) => (array[a] > array[b] ? 1 : (array[b] > array[a] ? -1 : 0)));

    let tIndices;
    if(keepOrder) {
        tIndices = new Array(terms.length);
        for (var i=0; i < terms.length; ++i) tIndices[i] = i;
        tIndices.sort((a, b) => (terms[a] > terms[b] ? 1 : (terms[b] > terms[a] ? -1 : 0)));
    }

    terms.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'accent' }));

    let entries = [];
    let j=0;
    for(let i=0; i<array.length && j<terms.length;) {
        let cmp = array[aIndices[i]].localeCompare(terms[j], undefined, {sensitivity: 'accent'});
        if(cmp == 0) {
            entries.push({row: aIndices[i], label: array[aIndices[i]], original: terms[j]});
            ++i; ++j;
        } else if(cmp > 0) {
            entries.push({row: -1, label: terms[j]});
            ++j;
        } else {
            ++i;
        }
    }

    while(j<terms.length) entries.push({row: -1, label: terms[j++]});

    if(keepOrder) {
        let unsortedEntries = new Array(entries.length);
        for(let i of tIndices) unsortedEntries[tIndices[i]] = entries[i];
        return unsortedEntries;
    }
    
    return entries;
}