var assert = require("assert"),
    fs = require("fs"),
    vcf = require("../vcf.js"),
    Benchmark = require('benchmark');


var suite = new Benchmark.Suite;

var vcfText = fs.readFileSync('test/data/snv.vcf', {encoding: 'utf8'});

suite
.add('parse a small VCF', function() {
  var data = vcf.parser()(vcfText);
})
.on('cycle', function(event) {
  console.log(String(event.target));
})
.on('complete', function() {
  console.log('Fastest is ' + this.filter('fastest').pluck('name'));
})
.run({ 'async': true });
