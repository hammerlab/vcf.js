var assert = require("assert"),
    fs = require("fs"),
    vcf = require("../vcf.js");


describe('VCF.js', function() {
  describe('#parser', function() {
    it('should parse, without error, a VCF', function() {
      // TODO(ihodes): speed up VCF.js and parse a Mutect and other callers' VCFs.
      var failed = false;
      try {
        vcf.parser()(fs.readFileSync('test/data/snv.vcf', {encoding: 'utf8'}));
      } catch (e) {
        failed = true;
      }
      assert(!failed);
    });
    it('should parse all 10 rows of a VCF', function() {
      var failed = false,
          data = [];
      try {
        data = vcf.parser()(String(fs.readFileSync('test/data/snv.vcf')));
      } catch (e) {
        failed = true;
      }
      assert(!failed && data.records.length == 10);
    });
    it('should parse VCF files containing PEDIGREE headers', function() {
      var failed = false,
          data = [];
      try {
        data = vcf.parser()(String(fs.readFileSync('test/data/snv.vcf')));
      } catch (e) {
        failed = true;
      }
      assert(!failed)
      assert(data.records.length == 10);
      assert(data.header.PEDIGREE);
      assert(data.header.PEDIGREE[0].Father === 'FatherId');
      assert(data.header.PEDIGREE[0].Mother === 'MotherId');
    });
    it('should throw on parsing a VCF of unrecognized version', function() {
      var failed = false;
      try {
        vcf.parser()(String(fs.readFileSync('test/data/bad-version.vcf')));
      } catch (e) {
        if (e.message.indexOf("version") > -1) {
          failed = true;
        }
      }
      assert(failed);
    });
  });
});
