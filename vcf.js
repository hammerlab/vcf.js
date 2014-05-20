(function() {

// Example Usage:
//
// vcf().data("variants.vcf", function(vcf) {
//     window.data = vcf.data();
//     window.header = vcf.header();
// });


// TODO(ihodes): Add function that appends 1 to N more VCF records send from
//               server to the VCF.


function _vcf() {

    var data = {},
        header = [],
    // DEBUG(ihodes): remove this maybe--will be holding on to a big chunk of
    // data potentially.
        _rawVCF = null;

    function vfc() {
        return vcf;
    }

    vcf.header = function(_) {
        return header;
    };

    vcf.data = function(url, callback) {
        if (!arguments.length) return data;
        var request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.send(null)
        request.onreadystatechange = function() {
            // TODO(ihodes): catch errors more better and such etc.
            if (request.readyState == 4) {
                var ext = url.split('.'),
                    ext = ext[ext.length-1].toLowerCase();
                    _rawVCF = request.responseText;
                if (ext === 'vcf') {
                    var parsedVcf = parseVCF(_rawVCF);
                    data = parsedVcf.data;
                    header = parsedVcf.header;
                } else if (ext === 'json') {
                    // TODO(ihodes): Need a spec and correspondance between
                    //               Records and these (add __header -> header,
                    //               etc).
                    data = JSON.parse(_rawVCF).data;
                    header = JSON.parse(_rawVCF).header;
                } else {
                    throw TypeError("Extenstion '" +  ext + "' not recognized: use VCf or JSON.");
                }

                callback(vcf);
            }
        };
        return vcf;
    }

    // DEBUG(ihodes): c.f. above note on _rawVCF.
    vcf.__rawVCF = function() { return _rawVCF; }

    return vcf;
}

window.vcf = _vcf;

})();
