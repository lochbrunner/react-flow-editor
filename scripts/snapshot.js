var page = require('webpage').create();
page.open('http://localhost:3000/index.html', function() {
  page.render('./docs/snapshot.png');
  phantom.exit();
});