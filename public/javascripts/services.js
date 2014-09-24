App.factory('AuthorizationService', [function(){
  var srvc = {};

  srvc.sessionId = '';

  srvc.addSessionId = function(sessionId) {
    srvc.sessionId = sessionId;
  }
}]);