var HypermediaClient = require('./HypermediaClient');

var serviceMetaUrl = 'https://beta.familysearch.org/indexing-service/discovery/.well-known/service-meta';
var userMetaUrl = 'https://beta.familysearch.org/indexing-service/discovery/.well-known/user-meta';

module.exports = {
  getDiscoveryServiceMeta : function () {
    return fetchDiscoveryServiceMeta();
  },


  getDiscoveryUserMeta : function () {
    return fetchDiscoveryUserMeta();
  }
};


function fetchDiscoveryServiceMeta() {
  return hypermediaClient.httpGet(serviceMetaUrl)['catch'](function (data) {
    $log.error("[DiscoveryService.fetchDiscoveryServiceMeta] Could not fetch service meta for " + serviceMetaURI + " because of " + data);
    data = data  || {};
    data.messageCode = "SERVICE-LOOKUP";
    data.reportable = false;
    return $q.reject(data);
  });
}

function fetchDiscoveryUserMeta() {
  var promise;
  if (FS.showEx('userMetaRedirectionEx')) {
    promise = hypermediaClient.httpGet(userServicesUrl + "/users/authenticated").then(function (data) {
      return hypermediaClient.httpGet(new HypermediaLink(userMetaUrl), {"userUUID": data.uuid});
    })['catch'](function (data) {
      $log.error("[DiscoveryService.fetchDiscoveryUserMeta] Could not fetch user meta for " + userMetaUrl + " because of " + JSON.stringify(data));
      data = data || {};
      data.messageCode = "SERVICE-LOOKUP";
      data.reportable = false;
      return $q.reject(data);
    });

  } else {
    promise = hypermediaClient.httpGet(userMetaUrl);

    promise['catch'](function (data) {
      $log.error("[DiscoveryService.fetchDiscoveryUserMeta] Could not fetch user meta for " + userMetaUrl + " because of " + JSON.stringify(data));
      data = data || {};
      data.messageCode = "SERVICE-LOOKUP";
      data.reportable = false;
      return $q.reject(data);
    });
  }
}
