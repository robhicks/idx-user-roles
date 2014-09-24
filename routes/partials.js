var express = require('express');
var router = express.Router();


/* GET users listing. */
router.get('name', function(req, res){
  res.render('/partials/:name' + 'partials/' + req.params.name);
});

module.exports = router;
