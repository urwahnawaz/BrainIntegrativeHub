function searchDeliminated(string, array, delim=/\r,/, keepOrder=false) {
    let entries = [];
    if(delim.test(string)) {
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
    } else {
        let lowerSearchTerm = searchTerm.trim().toLowerCase();
        for(let i=0; i<array.length; ++i) {
            if(array[i].trim().toLowerCase().includes(lowerSearchTerm)) {
                entries.push({row: i, label: searchTerm});
            }
        }
    }
    return entries;
}

function searchDeliminatedMultiple(string, arrays, delim=/,/) {
    let entries = [];
    let isMultiSearch = delim.test(string)
    if(isMultiSearch) {
        let terms = string.split(delim).map(v => v.trim()).filter(v => v);

        let aIndices = [];
        for(let i=0; i<arrays.length; ++i) {
            for(let j=0; j<arrays[i].length; ++j) {
                aIndices.push({i: i, j: j});
            }
        }
        aIndices.sort((a, b) => (arrays[a.i][a.j] > arrays[b.i][b.j] ? 1 : (arrays[b.i][b.j] > arrays[a.i][a.j] ? -1 : 0)));

        terms.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'accent' }));

        let j=0;
        for(let i=0; i<aIndices.length && j<terms.length;) {
            let aIndex = aIndices[i];
            let cmp = arrays[aIndex.i][aIndex.j].localeCompare(terms[j], undefined, {sensitivity: 'accent'});
            if(cmp == 0) {
                entries.push({row: aIndex.j, label: arrays[0][aIndex.j], original: terms[j]});
                ++i; ++j;
            } else if(cmp > 0) {
                entries.push({row: -1, label: terms[j]});
                ++j;
            } else {
                ++i;
            }
        }

        while(j<terms.length) entries.push({row: -1, label: terms[j++]});
    } else {
        //Single gene was searched for
        let lowerSearchTerm = searchTerm.trim().toLowerCase();
        for(let j=0; j<arrays[0].length; ++j) {
            for(let i=0; i<arrays.length; ++i) {
                let lowerCurr = arrays[i][j].trim().toLowerCase();
                if(lowerCurr.includes(lowerSearchTerm)) {
                    if(lowerCurr == lowerSearchTerm) {
                        //Exact match, put at start
                        entries.unshift({row: j, label: lowerCurr, exact: true})
                    } else {
                        entries.push({row: j, label: lowerCurr});
                    }
                }
            }
        }
    }
    return [entries, isMultiSearch];
}