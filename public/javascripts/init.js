var App = angular.module('App', ['ui.router']);

App.config(['$httpProvider', '$stateProvider', '$urlRouterProvider',
  function ($httpProvider, $stateProvider, $urlRouterProvider) {
    $httpProvider.interceptors.push('SpinnerInterceptor');
    $urlRouterProvider.otherwise("/roles");
    $stateProvider
        .state('auth', {
          url: "/authorization",
          templateUrl: "/partials/auth",
          controller: "AuthCtrl as AC"
        })
        .state('users', {
          url: "/users",
          templateUrl: "/partials/users",
          controller: "UsersCtrl as UC"
        })
        .state('roles', {
          url: "/roles",
          templateUrl: "/partials/roles",
          controller: "RolesCtrl as RC"
        })
        .state('projects', {
          url: "/projects",
          templateUrl: "/partials/projects",
          controller: "ProjectsCtrl as PC"
        })
        .state('hyper', {
          url: "/hypermedia_searcher",
          templateUrl: "/partials/hyper",
          controller: "HyperCtrl as HC"
        })
  }]);
