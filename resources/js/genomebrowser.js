class GenomeBrowser {
    constructor(root) {
        this.browser = new Browser({
            pageName: root,
            chr: '22',
            viewStart: 30700000,
            viewEnd: 30900000,

            noOptions: true,
            noHelp: true,
            disableDefaultFeaturePopup: true,
            noTrackAdder: true,
            noTrackEditor: true,
            noOptionsnoHelp: true,

            coordSystem: {
                speciesName: 'Human',
                taxon: 9606,
                auth: 'GRCh',
                version: '38',
                ucscName: 'hg38'
            },

            sources: [{
                  name: 'Genome',
                  twoBitURI: '//www.biodalliance.org/datasets/hg38.2bit',
                  tier_type: 'sequence'
            },
            {
                name: 'GENCODE',
                desc: 'Gene structures from GENCODE 21',
                bwgURI: '//www.biodalliance.org/datasets/GRCh38/gencode.v21.annotation.bb',
                stylesheet_uri: '//www.biodalliance.org/stylesheets/gencode2.xml',
                collapseSuperGroups: true,
                trixURI: '//www.biodalliance.org/datasets/GRCh38/gencode.v21.annotation.ix'
            },{
                name: 'Repeats',
                desc: 'Repeat annotation from UCSC', 
                bwgURI: '//www.biodalliance.org/datasets/GRCh38/repeats.bb',
                stylesheet_uri: '//www.biodalliance.org/stylesheets/bb-repeats2.xml'
            }],
        });
        this.browser.addInitListener(() => $(".powered-by").first().remove());
    }

    setPosition(chr, start, end) {
        this.browser.setLocation(chr, start, end);
    }
}