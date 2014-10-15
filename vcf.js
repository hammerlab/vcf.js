(function(root) {
"use strict";

if (typeof _ === 'function') {
  var U = _;
} else if (typeof require === 'function') {
  var U = require('underscore');
} else {
  throw Error("Cannot find or require underscore.js (as '_')");
}


  //////////////////////////
 //   Parsing VCF Files  //
//////////////////////////

// Versions we know we can parse
var ALLOWED_VERSIONS = ['VCFv4.0', 'VCFv4.1', 'VCFv4.2'];

// There are 9 columns before samples are listed.
var NUM_STANDARD_HEADER_COLUMNS = 9;

var BASES = ['A', 'C', 'T', 'G'];

// Console prints messages when deriving undefined types.
var WARN = false;

// VCF values can be comma-separated lists, so here we want to convert them into
// lists of the proper type, else return the singleton value of that type. All
// values are also nullable, signified with a '.', we want to watch out for
// those as well.
function maybeMapOverVal(fn, val) {
  var vals = val.split(',');
  if (vals.length > 1) {
    return U.map(vals, function(v) { return v == '.' ? null : fn(v); });
  }
  return val == '.' ? null : fn(val);
}

// Set radix to 10 to prevent problems in strangely-formed VCFs. Otherwise we
// may end up parsing octal, for example, if the int starts with a 0.
// c.f. http://stackoverflow.com/questions/7818903/jslint-says-missing-radix-parameter-what-should-i-do
var _parseInt = function(i) { return parseInt(i, 10); };

// This map associates types with functions to parse from strings the associated
// JS types.
var HEADER_TYPES = {'Integer': U.partial(maybeMapOverVal, _parseInt),
                    'Float': U.partial(maybeMapOverVal, parseFloat),
                    'Flag': U.constant(true),
                    'Character': U.partial(maybeMapOverVal, U.identity),
                    'String': function(v) { return v == '.' ? null : v; }}

function deriveType(val) {
  // Returns the derived type, falling back to String if nothing else works.
  //
  // Attempts to guess the type of a value when the type isn't specicifed in
  // the header. NB: Currently the only numeric type returned is Float (not
  // Integer).

  // TODO(ihodes): Derive Integer type separately from Float.
  var type;
  if (!val || val.length === 0) {
    type = 'Flag';
  } else if (!U.isNaN(parseFloat(val))) {
    type = 'Float';
  } else {
    type = 'String';
  }
  return type;
}


  ////////////////////////////////////////////////////////
 // Below: parsing the header metadata of a VCF file.  //
////////////////////////////////////////////////////////

function parseHeader(headers) {
  // Returns a header object with keys header line types (.e.g format, info,
  // sample) and values arrays of objects containing the key-value information
  // stored therein.
  var header = {};
  header.__RAW__ = headers;
  // VCF header lines always start with either one or two # signs.
  headers = U.map(headers, function(h) { return h.replace(/^##?/, ""); });

  header.columns = headers[headers.length-1].split('\t');
  header.sampleNames = header.columns.slice(NUM_STANDARD_HEADER_COLUMNS);

  // TODO(ihodes): parse other, less frequently used, header lines like
  //               'assembly', 'contig', 'PEDIGREE'
  header.VERSION = parseVCFVersion(headers);
  header.ALT = parseHeadersOf('ALT', headers);
  header.INFO = parseHeadersOf('INFO', headers);
  header.FORMAT = parseHeadersOf('FORMAT', headers);
  header.SAMPL = parseHeadersOf('SAMPLE', headers);

  return header;
}

function headersOf(type, lines) {
  // Returns the header lines out of `lines` matching `type`.
  return U.filter(lines, function(h) {
    return h.substr(0, type.length) == type;
  });
}

function parseHeaderLines(lines) {
  // Returns a list of parsed header lines.
  //
  // `lines` - an array of header strings (stripped of "##").
  return U.reduce(lines, function(headers, line) {
    var specRe = /<(.*)>/,
        descriptionRe = /.*?(Description="(.*?)",?).*?/,
        spec = specRe.exec(line)[1],
        description = descriptionRe.exec(spec)[2];

    spec = spec.replace(/Description=".*?",?/, '');

    var kvs = U.map(spec.split(','), function(kv) {
      return kv.split('=');
    });

    if (description)  kvs.push(['Description', description]);

    headers.push(U.reduce(kvs, function(acc, kv){
      var val = kv[1],
          key = kv[0];
      if (key.length <= 0)  return acc;

      if (val === '.')  val = null;
      else if (key === 'Number')  val = parseInt(val);
      acc[key] = val;
      return acc;
    }, {}))
    return headers;
  }, []);
}

function parseVCFVersion(headers) {
  // Returns the version of the VCF file. Hacky.
  var version = headers[0].split('=')[1];
  if (!U.contains(ALLOWED_VERSIONS, version)) {
    throw Error("VCF version must be 4.2, 4.1, or 4.0.");
  }
  return '4.1';
}

function parseHeadersOf(type, headers) {
  // Returns a list of parsed headers for a given type.
  //
  // `type` - String, type (e.g. ALT) of header line.
  // `headers` - List of split header strings.
  return parseHeaderLines(headersOf(type, headers));
}


  ////////////////////////////////////////////////////////
 // Below: parsing columns of individual VCF records.  //
////////////////////////////////////////////////////////
function _parseChrom(chrom, header) {
  return chrom;
}

function _parsePos(pos, header) {
  return parseInt(pos);
}

function _parseId(id, header) {
  return id.split(';');
}

function _parseRef(ref, header) {
  return ref;
}

function _parseAlt(alt, header) {
  return alt.split(',');
}

function _parseQual(qual, header) {
  return parseFloat(qual);
}

function _parseFilter(filters, header) {
  return filters.split(';');
}

function _parseInfo(info, header) {
  return U.reduce(info.split(';'), function(acc, kv) {
    kv = kv.split('=')
    var key = kv[0],
        val = kv[1],
        headerSpec = U.findWhere(header.info, {ID: key}),
        type;

    if (headerSpec && headerSpec.Type) {
      type = headerSpec.Type;
      val = HEADER_TYPES[type](val);
    } else {
      type = deriveType(val);
      val = HEADER_TYPES[type](val);
      if (WARN) {
        console.warn("INFO type '" + key + "' is not defined in header. (Value = '" + val + "'). Derived type as '" + type + "'.");
      }
    }

    acc[key] = val;
    return acc;
  }, {});
}

function _parseFormat(format, header) {
  // Returns a list of format tags.
  return format.split(':');
}

function _parseSample(sample, format, header) {
  sample = sample.split(':');
  return U.reduce(sample, function(sample, val, idx) {
    var key = format[idx],
    headerSpec = U.findWhere(header.format, {ID: key}),
    type;

    if (headerSpec && headerSpec.Type) {
      type = headerSpec.Type;
      val = HEADER_TYPES[type](val);
    } else {
      // No type defined in header: we'll try to derive it, and fall back
      // to String.
      type = deriveType(val);
      val = HEADER_TYPES[type](val);
      if (WARN) {
        console.warn("INFO type '" + key + "' is not defined in header. (Value = '" + val + "'). Derived type as '" + type + "'.");
      }
    }

    sample[key] = val;
    return sample;
  }, {});
}

function _genKey(record) {
  return record.CHROM + ':' + record.POS + "(" + record.REF + "->" + record.ALT + ")";
}


function parser() {
  var data = {},
      header = [],
      parseChrom = _parseChrom,
      parsePos = _parsePos,
      parseId = _parseId,
      parseRef = _parseRef,
      parseAlt = _parseAlt,
      parseQual = _parseQual,
      parseFilter = _parseFilter,
      parseInfo = _parseInfo,
      parseFormat = _parseFormat,
      parseSample = _parseSample,
      genKey = _genKey;


  function _parser(text) {
    var parsedVcf = parseVCF(text);
    return {records: parsedVcf.data,
            header: parsedVcf.header};
  };

    //////////////////////////////////////////////////////////////////////
   // Below: initializing Records and parsing their constituent data.  //
  //////////////////////////////////////////////////////////////////////

  function initializeRecord(vals, header) {
    return U.reduce(header.columns, function(record, colname, idx) {
      // null if val is '.' (VCF null string type), else the trimmed value.
      var val = vals[idx] ? vals[idx].trim() : null;
      record[colname] = val === '.' ? null : val;
      return record;
    }, {__HEADER__: header});
  }

  function Record(line, header) {
    // Returns a VCF record.
    //
    // `line` - a line of the VCF file that represents an individual record.
    // `header` - the parsed VCF header.
    var vals = line.split('\t');
    var initVals = initializeRecord(vals, header);
    for (var k in initVals) {
      this[k] = initVals[k];
    }

    if (this.CHROM)   this.CHROM = parseChrom(this.CHROM, header);
    if (this.POS)     this.POS = parsePos(this.POS, header);
    if (this.ID)      this.ID = parseId(this.ID, header);
    if (this.REF)     this.REF = parseRef(this.REF, header);
    if (this.ALT)     this.ALT = parseAlt(this.ALT, header);
    if (this.QUAL)    this.QUAL = parseQual(this.QUAL, header);
    if (this.FILTER)  this.FILTER = parseFilter(this.FILTER, header);
    if (this.INFO)    this.INFO = parseInfo(this.INFO, header);
    if (this.FORMAT)  this.FORMAT = parseFormat(this.FORMAT, header);
    this.__KEY__ = genKey(this, header);

    U.each(header.sampleNames, function(sampleName) {
      var sample = this[sampleName];
      if (sample) {
        this[sampleName] = parseSample(sample, this.FORMAT, header);
      }
    }.bind(this));
  }

  Record.prototype.variantType = function() {
    if (this.isSnv()) return 'SNV';
    if (this.isSv()) return 'SV';
    if (this.isIndel()) return 'INDEL';
    return null;
  }

  Record.prototype.isSnv = function() {
    var isSnv = true;
    if (this.REF && this.REF.length > 1) isSnv = false;
    U.each(this.ALT, function(alt) {
      if (alt && !U.contains(BASES, alt)) isSnv = false;
    });
    return isSnv;
  }

  Record.prototype.isSv = function() {
    if (this.INFO && this.INFO.SVTYPE) return true;
    return false;
  }

  Record.prototype.isCnv = function() {
    if (this.INFO && this.INFO.SVTYPE === 'CNV') return true;
    return false;
  }

  Record.prototype.isIndel = function() {
    return this.isDeletion() || this.isInsertion();
  }

  Record.prototype.isDeletion = function() {
    if (this.isSv()) return false;
    if (this.ALT && this.ALT.length > 1) return false;
    if (this.REF && this.ALT && this.ALT.length <= 1) {
      if (this.REF.length > this.ALT[0].length) return true;
    }
    return false;
  }

  Record.prototype.isInsertion = function() {
    if (this.isSv()) return false;
    if (this.REF && this.ALT && this.ALT.length >= 1) {
      if (this.REF.length < this.ALT[0].length) return true;
    }
    return false;
  }


  // Returns a parsed VCF object, with attributed `data` and `header`.
  //    `data` - a list of VCF Records.
  //    `header` - an object of the metadata parsed from the VCF header.
  //
  // `text` - VCF plaintext.
  function parseVCF(text) {
    var lines = U.reject(text.split('\n'), function(line) {
      return line === '';
    })

    var partitions = U.partition(lines, function(line) {
      return line[0] === '#';
    });
    if (partitions[0].length == 0) {
      throw "Invalid VCF file: missing header";
    }

    var header = parseHeader(partitions[0]),
        data = U.map(partitions[1], function(line) {
          return new Record(line, header);
        });

    return {header: header, data: data};
  }


    ///////////////////////////
   //   Primary VCF.js API  //
  ///////////////////////////

  _parser.parseChrom = function(_) {
    if (!arguments.length) return parseChrom;
    parseChrom = _;
    return _parser;
  };
  _parser.parsePos = function(_) {
    if (!arguments.length) return parsePos;
    parsePos = _;
    return _parser;
  };
  _parser.parseId = function(_) {
    if (!arguments.length) return parseId;
    parseId = _;
    return _parser;
  };
  _parser.parseRef = function(_) {
    if (!arguments.length) return parseRef;
    parseRef = _;
    return _parser;
  };
  _parser.parseAlt = function(_) {
    if (!arguments.length) return parseAlt;
    parseAlt = _;
    return _parser;
  };
  _parser.parseQual = function(_) {
    if (!arguments.length) return parseQual;
    parseQual = _;
    return _parser;
  };
  _parser.parseFilter = function(_) {
    if (!arguments.length) return parseFilter;
    parseFilter = _;
    return _parser;
  };
  _parser.parseInfo = function(_) {
    if (!arguments.length) return parseInfo;
    parseInfo = _;
    return _parser;
  };
  _parser.parseFormat = function(_) {
    if (!arguments.length) return parseFormat;
    parseFormat = _;
    return _parser;
  };
  _parser.parseSample = function(_) {
    if (!arguments.length) return parseSample;
    parseSample = _;
    return _parser;
  };
  _parser.genKey = function(_) {
    if (!arguments.length) return genKey;
    genKey = _;
    return _parser;
  };
  _parser.warn = function() {
    if (!arguments.length) return WARN;
    WARN = _;
    return _parser;
  };

  return _parser;
}


/**
 * Return list of records which fall between (or, in the case of a SNV, overlap)
 * start and end.
 *
 * O(N) time.
 */
function fetch(records, chromosome, start, end) {
  // TODO(ihodes): Add sorted option to get O(lnN), fallback to O(N).
  return U.filter(records, function(record) {
    if (record.CHROM === chromosome && record.POS < end) {
      if (record.POS >= start)
        return true;
      if (record.INFO && record.INFO.END && record.INFO.END >= start)
        return true;
    }
    return false;
  });
};


  ///////////////////////
 // Exporting the API //
///////////////////////

var exports = {
  parser: parser,
  fetch: fetch
};

if (typeof define === "function" && define.amd) {
  define(exports);
} else if (typeof module === "object" && module.exports) {
  module.exports = exports;
} else {
  root.vcf = exports;
}

})(this);
