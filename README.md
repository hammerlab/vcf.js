# VCF.js

VCF.js is a library that can remotely load and parse VCF files, or JSON
representations of them. It is used to manipulate and analyse genotype calls.

## Documentation

Documentation on the way. Code is fully-documented.

## Using it

Example usage in `test/` directory, just start a server in the root directory
(e.g. `python -m SimpleHTTPServer`) and open `index.html`, then open a dev
console and look at the `data` object, for example.

[![](https://nodei.co/npm/vcf.js.png)]((https://nodei.co/npm/loch/))

### TODO
1. Make sure this works seamlessly client-side and in the browser, and plays
   well with npm.
2. Define schema for loading JSON VCF records.
3. Enable adding to/streaming VCF records from the server to the vcf object.
4. Make a VCF writer.
