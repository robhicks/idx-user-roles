App.controller('HyperCtrl', ['$scope', '$http', function($scope, $http){
  var self = this;

  self.search = function(){
    $http.post('/search', {sessionId: self.sessionId, searchTerms: self.searchTerms})
        .success(function(data){
          console.log(data);
        })
  }
}]);