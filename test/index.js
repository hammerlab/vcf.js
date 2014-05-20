(function() {

  var request = new XMLHttpRequest();
  request.open('GET', 'ss.vcf', true);
  request.send(null)

  request.onreadystatechange = function() {
    if (request.readyState == 4) {
      var data = vcf().data(request.responseText);
      window.data = data;
      console.log("Done.");
    }
  };

})();
