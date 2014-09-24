App.controller('RolesCtrl', ['$scope', '$http', '$timeout', '$q', function ($scope, $http, $timeout, $q) {

  $scope.model = {};
  $scope.model.user = {};
  $scope.model.user.sessionId = '';
  $scope.model.roles = [
    {id: 50, selected: false, name: 'Super Admin'},
    {id: 75, selected: false, name: 'HQ Admin'},
    {id: 70, selected: false, name: 'FH Support'},
    {id: 53, selected: false, name: 'Project Admin'},
    {id: 54, selected: false, name: 'INDEXER'},
    {id: 57, selected: false, name: 'INDEXING_REVIEWER'},
    {id: 88, selected: false, name: 'INDEXING_ARBITRATOR'},
    {id: 66, selected: false, name: 'BATCHER'},
    {id: 69, selected: false, name: 'BATCH_REVIEWER'},
    {id: 84, selected: false, name: 'Project Tester'}
  ];
  $scope.model.usernames = '';
  $scope.model.users = [];
  $scope.view = {};
  $scope.view.users = [];
  $scope.view.showData = false;

  $scope.setRoles = function () {
    genList().then(function () {
      $http.post('/setRoles', {data: $scope.model})
          .success(function (data) {
            showData(data);
          })
          .error(function (err) {
            setError(err);
          });
    })
  };

  $scope.addRoles = function () {
    genList().then(function () {
      $http.post('/addRoles', {data: $scope.model})
          .success(function (data) {
            showData(data);
          })
          .error(function (err) {
            setError(err);
          });
    })
  };

  $scope.checkAccountsAndRoles = function () {
    genList().then(function () {
      $http.post('/checkAccountsAndRoles', {data: $scope.model})
          .success(function (data) {
            showData(data);
          })
          .error(function (err) {
            setError(err);
          });
    });

  };

  $scope.clearForm = function () {
    angular.forEach($scope.model.roles, function (role) {
      role.selected = false;
    });
    $scope.model.usernames = '';
    $scope.model.emails = '';
    $scope.model.users = [];
  };

  function showData(data) {
    $scope.view.users = [];
    angular.forEach(data.users, function (user) {
      var roles = [];
      angular.forEach(user.roles, function (role) {
        roles.push(role.name);
      });
      user.roles = roles.join(", ");
      $scope.view.users.push(user)
    });
    $scope.view.showData = true;
  }

  function setError(err) {
    $scope.showError = true;
    $timeout(function () {
      $scope.showError = false;
      $scope.error = err;
    }, 3000);
  }

  function genList() {
    var d = $q.defer();
    $scope.model.users = [];
    if ($scope.model.usernames) {
      $scope.model.usernames = $scope.model.usernames.normalize();
      var usernames = $scope.model.usernames.split(/\n|\n\r/);
      usernames.forEach(function(username){
        $scope.model.users.push({username: username});
      });
    }
    if ($scope.model.emails) {
      var emails = $scope.model.emails.normalize().split(/\n|\n\r/);
      angular.forEach(emails, function (email) {
        $scope.model.users.push({email: email});
      });
    }
    d.resolve();
    return d.promise;
  }

}]);

String.prototype.normalize = function(){
  return this.toLowerCase().replace(/^\s\s*/mg, '').replace(/",$/gm,"").replace(/"/g,"").replace(/\s\s*$/, '');
};


