# VCF.js

vcf.js is a small libary for parsing [VCF files](http://www.1000genomes.org/wiki/analysis/variant%20call%20format/vcf-variant-call-format-version-41).

The interface is simple, but, if you need it to be, extensible.

```javascript
vcf.parser()(vcfText);
// => {header: {..}, records: [..]}
```

`vcfText` is just the plaintext of a VCF; for a small example, see `/test/data/snv.vcf`.

### Extending the parser

But, just maybe, that's not all you want to do with the VCF. It's easy to
exhange the individual parsers for various sections of the VCF. For example, if
we want to append `chr` to all chromosomes in the CHROM column, we could do the
following:

```javascript
var parser = vcf.parser()
    .parseChrom(function(c) {
      if (c.indexOf('chr') > -1) return c;
      else return 'chr' + c;
    });

parser(vcfText); // => {...} ...
```

Similarly, there are the following methods which can be called on a parser
object to modify the behavior of the parser:


**parseChrom(fn)**

Set the CHROM in the record to the result of the function applied to the CHROM column.

**parsePos(fn)**

Set the POS in the record to the result of the function applied to the POS column.

**parseId(fn)**

Set the ID in the record to the result of the function applied to the ID column.

**parseRef(fn)**

Set the REF in the record to the result of the function applied to the REF column.

**parseAlt(fn)**

Set the ALT in the record to the result of the function applied to the ALT column.

**parseQual(fn)**

Set the QUAL in the record to the result of the function applied to the QUAL column.

**parseFilter(fn)**

Set the FILTER in the record to the result of the function applied to the FILTER column.

**parseInfo(fn)**

Set the INFO in the record to the result of the function applied to the INFO column.

**parseFormat(fn)**

Set the FORMAT in the record to the result of the function applied to the FORMAT column.

**parseSample(fn)**

Set the samples in the record to the result of the function applied to the samples columns.

**genKey(fn)**

Set the `__KEY__` attribute on the record. By default, this is `<CHROM>:<POS>(<REF>-><ALT>)`.
