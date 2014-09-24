App.directive("spinner", ['$rootScope', function ($rootScope) {
  return function ($scope, $element, attrs) {
    $scope.$on("show_loader", function () {
      return $element.removeClass('hide');
    });
    return $scope.$on("hide_loader", function () {
      return $element.addClass('hide');
    });
  };
}]);