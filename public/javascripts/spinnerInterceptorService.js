

App.factory('SpinnerInterceptor', ['$q', '$rootScope', '$log',
  function ($q, $rootScope, $log) {

  var numLoadings = 0;

  return {
    request: function (config) {
      numLoadings++;

      // Show loader
      $rootScope.$broadcast("show_loader");
      return config || $q.when(config)

    },
    response: function (response) {
      --numLoadings;

      if ((numLoadings) === 0) {
        $rootScope.$broadcast("hide_loader");
      }

      return response || $q.when(response);

    },
    responseError: function (response) {

      if (!(--numLoadings)) {
        $rootScope.$broadcast("hide_loader");
      }

      return $q.reject(response);
    }
  };
}]);