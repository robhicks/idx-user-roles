var CommunicationAgent = require('./CommunicationAgent');
var AtomFeed = require('./AtomFeed');
var AtomFeed = require('./AtomFeed');
var when = require('when');
'use strict';

function CommunicationAgent(){

}

CommunicationAgent.prototype.request = function(){

};

CommunicationAgent.request.prototype.get = function(){

};



idxClientMod.factory('HypermediaClient', ['CommunicationAgent', '$injector', '$q', '$log', function (_communicationAgent_, _$injector_, _$q_, _$log_) {

  /*
   * ---------------------------------------------------------------------------------------------------
   * PRIVATE
   * ---------------------------------------------------------------------------------------------------
   */

  var urlTemplate, communicationAgent, $injector, HypermediaLink, $q, defaultHttpHeaders, $log;

  communicationAgent = _communicationAgent_;
  $injector = _$injector_;
  $q = _$q_;
  $log = _$log_;
  defaultHttpHeaders = {'Authorization' : "Bearer " + FS.Cookie.getCookie('fssessionid')};
  urlTemplate = new UrlTemplate();

  function isHypermediaLink(obj) {
    if (!HypermediaLink) {
      HypermediaLink = $injector.get('HypermediaLink');
    }
    return obj instanceof HypermediaLink;
  }

  /**
   * Expands rfc6570 URL template from Hypermedia resource with given urlParam
   * @param {(string|HypermediaLink)} url - rfc6570 url template or a normal URL.
   * @param {Object} [urlParam] - Object Map which is used for replacing placeholders in the url template
   * @returns {string} url with all the placeholder replaced
   */
  function processURL(url, urlParam) {
    if (!urlParam) {
      urlParam = {};
    }

    if (isHypermediaLink(url)) {
      url = url.getLinkUrl();
    }

    return urlTemplate.parse(url).expand(urlParam);
  }

  /**
   * safely calls callback methods making sure exception from {@link IdxClient~errorCallBack} and
   * {@link IdxClient~successCallBack} are handled and log.
   * @param callBackMethod
   * @param data
   * @returns {*}
   */
  function safeCall(callBackMethod, data) {

    var callResult;
    try {
      if (_.isFunction(callBackMethod)) {
        callResult = callBackMethod(data);
      } else {
        callResult = data;
      }
    } catch (err) {
      $log.error("[HypermediaClient.safeCall] ERROR: " + err);
    }
    return callResult;
  }


  /**
   * Creates an Atom Feed object for response which contains feeds
   * @param data
   * @returns {AtomFeed}
   */
  function createAtomFeed(data) {
    var AtomFeed = $injector.get('AtomFeed');
    return new AtomFeed(data);
  }

  /**
   * Create a HypermediaResource for response which has links
   * @param data
   * @returns {HypermediaResource}
   */
  function createHypermediaResource(data) {
    var HypermediaResource = $injector.get('HypermediaResource');
    return new HypermediaResource(data);
  }

  /**
   * Create FeedEntry from data
   * @param {Object} data - data to be converted to FeedEntry
   * @returns {FeedEntry}
   */
  function createFeedEntry(data) {
    var FeedEntry = $injector.get('FeedEntry');
    return new FeedEntry(data);
  }

  function addHypermediaObject(data){
//    console.log('data passed into addHypermediaObject', data);
    var d = $q.defer();
//    console.log('data passed form addHypermediaObject', createHypermediaObject(data));
    d.resolve(createHypermediaObject(data.data));
    return d.promise;
  }

  /**
   * Create HypermediaObject if possible
   * @param data
   * @returns {HypermediaResource|AtomFeed|*}
   */
  function createHypermediaObject(data) {
//    console.log('data passed in to createHypermediaObject', data);
//    console.log(typeOfHypermediaObject(data));
    if (!data) return null;
    if (typeOfHypermediaObject(data) === 'feed') return createAtomFeed(data);
    if (typeOfHypermediaObject(data) === 'entry') return createFeedEntry(data);
    if (typeOfHypermediaObject(data) === 'resource') return createHypermediaResource(data);
    return data;
  }

  function typeOfHypermediaObject(obj) {
    if (obj) {
      if (obj.feed) return 'feed';
      if (obj.content) return 'entry';
      if (obj.links) return 'resource';
      if (obj.getLinkUrl) return 'link';
      return undefined;
    }
    return null;
  }

  /**
   * determine the url from the given resource and relationship
   * @param {HypermediaObjects} resource - resource supporting hypermedia links
   * @param {string} rel relation - relation for which url needs to be search in resource
   * @returns {*}
   */
  function determineURL(resource, rel) {
    var url;

    if (isHypermediaLink(resource)) {
      url = resource;
    } else if (resource.url) {
      url = resource.url;
    } else {
      if (_.isFunction(resource.getLink)) {
        url = resource.getLink(rel);
      } else {
        url = createHypermediaObject(resource).getLink(rel);
      }
    }

    return url;
  }

  /**
   * Search Hypermedia object for the relationship and determines the url for loading next state.
   * @param {HypermediaObjects} resource - resource supporting hypermedia links
   * @param {string} rel relation - relation for which url needs to be search in resource
   * @param {Object} urlParam - Object Map which is used for replacing placeholders in the url template
   * @returns {HttpConfig}
   */
  function processHypermediaArgument(resource, rel, urlParam) {
    var url;

    url = determineURL(resource, rel);
    url = processURL(url, urlParam);
    return {
      url : url
    };
  }

  /**
   * Initialize default http header
   * @param {HttpConfig} httpConfig
   */
  function initDefaultHeaders(httpConfig) {
    if (_.isObject(httpConfig.headers)) {
      _.extend(httpConfig.headers, defaultHttpHeaders);
    } else {
      httpConfig.headers = defaultHttpHeaders;
    }
  }

  /**
   * Helper method to process arguments to {@link HypermediaClient#httpGet} in following order
   * <ol>
   *   <li> HypermediaObjects - A URL string or @see {@link HypermediaObjects} </li>
   *   <li> relation - relation for which url needs to be search in HypermediaObjects. This param is optional and is
   *   used along with getLink, getLinkUrl, url method/properties to determine the link in Hypermedia.
   *   In case first parameter is a url then this param should not be passed</li>
   *   <li>urlParam - Object Map which is used for replacing placeholders in the url template</li>
   *   <li>{@link HttpConfig} - Angular $http compatible config object </li>
   *   <li>{@link IdxClient~successCallBack} - Success callback method for HTTP interaction</li>
   *   <li>{@link IdxClient~successCallBack} - Error callback method for HTTP interaction</li>
   * </ol>
   * @param args
   * @returns {HttpConfig}
   */
  function processGETArguments(args) {
    var processedArg, argsIndex, resource, rel, urlParam, hypermediaArg;

    argsIndex = 0;
    processedArg = {};

    if (_.isString(args[argsIndex])) {
      processedArg.url = args[argsIndex];
      argsIndex += 1;
    } else if (_.isObject(args[argsIndex])) {
      resource = args[argsIndex];
      argsIndex += 1;
      if (_.isString(args[argsIndex])) {
        rel = args[argsIndex];
        argsIndex += 1;
      }
      if (_.isObject(args[argsIndex]) && !_.isFunction(args[argsIndex])) {
        urlParam = args[argsIndex];
        argsIndex += 1;
      }

      hypermediaArg = processHypermediaArgument(resource, rel, urlParam);

      _.extend(processedArg, hypermediaArg);

    } else {
      throw 'Argument at ' + argsIndex + ' should be either URL or Hypermedia resource';
    }

    if (_.isObject(args[argsIndex]) && !_.isFunction(args[argsIndex])) {
      _.extend(processedArg, args[argsIndex]);
      argsIndex += 1;
    }

    if (_.isFunction(args[argsIndex])) {
      processedArg.successCB = args[argsIndex];
      argsIndex += 1;
      if (_.isFunction(args[argsIndex])) {
        processedArg.errorCB = args[argsIndex];
      }
    }
    initDefaultHeaders(processedArg);
    return processedArg;
  }

  /**
   * Helper method to process arguments to {@link HypermediaClient#httpPost} in following order
   * <pre>
   *   <ol>
   *      <li> HypermediaObjects - A URL string or @see {@link HypermediaObjects} </li>
   *      <li> relation - relation for which url needs to be search in HypermediaObjects. This param is optional and is
   *   used along with getLink, getLinkUrl, url method/properties to determine the link in Hypermedia.
   *   In case first parameter is a url then this param should not be passed</li>
   *      <li>urlParam - Object Map which is used for replacing placeholders in the url template</li>
   *      <li>postBody</li> - Post Request body
   *      <li>{@link HttpConfig} - Angular $http compatible config object </li>
   *      <li>{@link successCallBack} - Success callback method for HTTP interaction</li>
   *      <li>{@link errorCallBack} - Error callback method for HTTP interaction</li>
   *   </ol>
   * </pre>
   * @param args
   * @returns {HttpConfig}
   */
  function processPostArguments(args) {

    var argsIndex, processedArg, resource, rel, urlParam, hypermediaArg;
    argsIndex = 0;
    processedArg = {};

    if (_.isString(args[argsIndex])) {
      processedArg.url = args[argsIndex];
      argsIndex += 1;
    } else if (_.isObject(args[argsIndex])) {

      resource = args[argsIndex];
      argsIndex += 1;
      if (_.isString(args[argsIndex])) {
        rel = args[argsIndex];
        argsIndex += 1;
      }
      if (_.isObject(args[argsIndex]) && !_.isFunction(args[argsIndex])) {
        urlParam = args[argsIndex];
        argsIndex += 1;
      }

      hypermediaArg = processHypermediaArgument(resource, rel, urlParam);

      _.extend(processedArg, hypermediaArg);

    } else {
      throw 'Argument at ' + argsIndex + ' should be either URL or Hypermedia resource';
    }

    if (_.isObject(args[argsIndex]) && !_.isFunction(args[argsIndex])) {
      processedArg.data = args[argsIndex];
      argsIndex += 1;
    } else if (angular.isUndefined(args[argsIndex])) {
      argsIndex += 1;
    }

    if (_.isObject(args[argsIndex]) && !_.isFunction(args[argsIndex])) {
      _.extend(processedArg, args[argsIndex]);
      argsIndex += 1;
    }

    if (_.isFunction(args[argsIndex])) {
      processedArg.successCB = args[argsIndex];
      argsIndex += 1;
      if (_.isFunction(args[argsIndex])) {
        processedArg.errorCB = args[argsIndex];
      }
    }
    initDefaultHeaders(processedArg);
    return processedArg;
  }

  /**
   * Helper method to process arguments to {@link HypermediaClient#httpPost} in following order
   * <pre>
   *   <ol>
   *      <li> HypermediaObjects - A URL string or @see {@link HypermediaObjects} </li>
   *      <li> relation - relation for which url needs to be search in HypermediaObjects. This param is optional and is
   *   used along with getLink, getLinkUrl, url method/properties to determine the link in Hypermedia.
   *   In case first parameter is a url then this param should not be passed</li>
   *      <li>urlParam - Object Map which is used for replacing placeholders in the url template</li>
   *      <li>postBody</li> - Post Request body
   *      <li>{@link HttpConfig} - Angular $http compatible config object </li>
   *      <li>{@link successCallBack} - Success callback method for HTTP interaction</li>
   *      <li>{@link errorCallBack} - Error callback method for HTTP interaction</li>
   *   </ol>
   * </pre>
   * @param args
   * @returns {HttpConfig}
   */
  function processPutArguments(args) {

    var argsIndex, processedArg, resource, rel, urlParam, hypermediaArg;
    argsIndex = 0;
    processedArg = {};

    if (_.isString(args[argsIndex])) {
      processedArg.url = args[argsIndex];
      argsIndex += 1;
    } else if (_.isObject(args[argsIndex])) {

      resource = args[argsIndex];
      argsIndex += 1;
      if (_.isString(args[argsIndex])) {
        rel = args[argsIndex];
        argsIndex += 1;
      }
      if (_.isObject(args[argsIndex]) && !_.isFunction(args[argsIndex])) {
        urlParam = args[argsIndex];
        argsIndex += 1;
      }

      hypermediaArg = processHypermediaArgument(resource, rel, urlParam);

      _.extend(processedArg, hypermediaArg);

    } else {
      throw 'Argument at ' + argsIndex + ' should be either URL or Hypermedia resource';
    }

    if (_.isObject(args[argsIndex]) && !_.isFunction(args[argsIndex])) {
      processedArg.data = args[argsIndex];
      argsIndex += 1;
    } else if (angular.isUndefined(args[argsIndex])) {
      argsIndex += 1;
    }

    if (_.isObject(args[argsIndex]) && !_.isFunction(args[argsIndex])) {
      _.extend(processedArg, args[argsIndex]);
      argsIndex += 1;
    }

    if (_.isFunction(args[argsIndex])) {
      processedArg.successCB = args[argsIndex];
      argsIndex += 1;
      if (_.isFunction(args[argsIndex])) {
        processedArg.errorCB = args[argsIndex];
      }
    }
    initDefaultHeaders(processedArg);
    return processedArg;
  }

  /**
   * Helper method to process arguments to {@link HypermediaClient#loadContent} in following order
   * @param resource
   * @param rel
   * @param urlParam
   * @param reqBody
   * @param httpConfig
   * @returns {{url: string, method: string}}
   */
  function processGenericArguments(resource, rel, urlParam, reqBody, httpConfig) {
    var link, url, processedArg;
    link = determineURL(resource, rel);
    url = processURL(link, urlParam);
    processedArg = {
      "url" : url,
      "method" : link.getLinkMethod()
    };

    if (httpConfig) {
      _.extend(processedArg, httpConfig);
    }

    if (reqBody) {
      processedArg.data = reqBody;
    }

    initDefaultHeaders(processedArg);

    return processedArg;
  }

  /*
   * ---------------------------------------------------------------------------------------------------
   * PUBLIC
   * ---------------------------------------------------------------------------------------------------
   */

  return {
    /**
     * Exploring passing a hypermediaLink in and letting the HypermediaClient figure out what to do with it.
     * @param hypermediaLink
     * @returns {*}
     */
    http: function http(hypermediaObj, relation){
      var d = $q.defer();
      var type = typeOfHypermediaObject(hypermediaObj);
      var obj = type === 'feed' ? hypermediaObj.getEntryByType(relation)
          : type === 'entry' ? hypermediaObj.getLink(relation)
          : type === 'resource' ? hypermediaObj.getLink(relation) : null;
      if (!obj) {
        d.reject('NO OBJECT PROVIDED');
      } else {

      }

      //determine type of object
      //look for the relation
      //iterate until data is retrieved
      //return the data
      return d.promise;
    },

    /**
     * Makes HTTP GET
     * @name httpGet
     * @function
     * @memberOf HypermediaClient
     * @param {(string|Object)} resource - A URL string or {@link HypermediaObjects}.
     * @param {string} [relation] - relation pointing to be used for url http interaction.
     * @param {Object} [urlParam] - url parameters which are used for construction of url from url template
     * @param {Object} [httpConfig] - http configuration which is compatible with angular http configuration object
     * @param {successCallBack} - Success callback method for HTTP interaction
     * @param {errorCallBack} - Error callback method for HTTP interaction
     * @returns {HypermediaClientPromise} Future object if callbacks are not provided
     */
    httpGet: function () {
      var httpParam = processGETArguments(arguments);
      return communicationAgent.httpGet(httpParam.url, httpParam)
        .then(function (data) {
          data = createHypermediaObject(data);
          if (angular.isFunction(httpParam.successCB)) {
            safeCall(httpParam.successCB, data);
          }

          return $q.when(data);
        }, function (messageObject) {
          if (angular.isFunction(httpParam.errorCB)) {
            safeCall(httpParam.errorCB, messageObject);
          }

          return $q.reject(messageObject);
        });
    },

    /**
     * Triggers HTTP POST request
     * @name httpPost
     * @function
     * @memberOf HypermediaClient
     * @param {(string|Object)} resource - A URL string or {@link HypermediaObjects}.
     * @param {string} [relation] - relation to be used for url http interaction.
     * @param {Object} [urlParam] - url parameters which are used for construction of url from url template
     * @param {Object} [postBody] - Post Request body
     * @param {Object} [httpConfig] - http configuration which is compatible with angular http configuration object
     * @param {successCallBack} - Success callback method for HTTP interaction
     * @param {errorCallBack} - Error callback method for HTTP interaction
     * @returns {HypermediaClientPromise} Future object if callbacks are not provided
     */
    httpPost: function () {
      var httpParam = processPostArguments(arguments);
      return communicationAgent.httpPost(httpParam.url, httpParam.data, httpParam).then(function (data) {
        data = createHypermediaObject(data);
        if (angular.isFunction(httpParam.successCB)) {
          safeCall(httpParam.successCB, data);
        }

        return $q.when(data);
      }, function (messageObject) {
        if (angular.isFunction(httpParam.errorCB)) {
          safeCall(httpParam.errorCB, messageObject);
        }
        return $q.reject(messageObject);
      });
    },

    /**
     * Triggers HTTP PUT request
     * @name httpPut
     * @function
     * @memberOf HypermediaClient
     * @param {(string|Object)} resource - A URL string or {@link HypermediaObjects}.
     * @param {string} [relation] - relation to be used for url http interaction.
     * @param {Object} [urlParam] - url parameters which are used for construction of url from url template
     * @param {Object} [postBody] - Post Request body
     * @param {Object} [httpConfig] - http configuration which is compatible with angular http configuration object
     * @param {successCallBack} - Success callback method for HTTP interaction
     * @param {errorCallBack} - Error callback method for HTTP interaction
     * @returns {HypermediaClientPromise} Future object if callbacks are not provided
     */
    httpPut: function () {
      var httpParam = processPutArguments(arguments);
      return communicationAgent.httpPut(httpParam.url, httpParam.data, httpParam)
        .then(function (data) {
          data = createHypermediaObject(data);
          if (angular.isFunction(httpParam.successCB)) {
            safeCall(httpParam.successCB, data);
          }

          return $q.when(data);
        }, function (messageObject) {
          if (angular.isFunction(httpParam.errorCB)) {
            safeCall(httpParam.errorCB, messageObject);
          }

          return $q.reject(messageObject);
        });
    },

    httpDelete: function (resourceUri) {
      return $q.reject('Not Yet Supported');
      /*var httpParam = processDeleteArguments(arguments);
      return communicationAgent.httpDelete(httpParam.url, httpParam)
        .then(function (data) {
          data = createHypermediaObject(data);
          return safeCall(httpParam.successCB, data);
        },function(messageObject){
          return safeCall(httpParam.errorCB, messageObject);
        });*/
    },

    /**
     * Generic method to interact with Hypermedia services. URL and HTTP method for interaction is calculated from relation in hypermedia object
     * @function
     * @memberOf HypermediaClient
     * @param {HypermediaObjects} resource - Hypermedia resource (acting as current state of interaction).
     * @param {string} [rel] - relationship from hypermedia resource which need to be used for interaction
     * @param {Object} [urlParam] - optional url parameter for construction of url from url template
     * @param {Object} reqBody - option request body.
     * @param {HttpConfig} httpConfig - http configuration object for interation. This can be used for passing addition configuration parameters for interction
     * @param {HypermediaClient~successCallBack} successCallBack - success callback
     * @param {HypermediaClient~errorCallBack} errorCallBack -  error callback
     * @returns {HypermediaClientPromise} Future object if callbacks are not provided
     */
    loadContent : function (resource, rel, urlParam, reqBody, httpConfig, successCallBack, errorCallBack) {

      var processedArg = processGenericArguments(resource, rel, urlParam, reqBody, httpConfig);

      return communicationAgent.processRequest(processedArg).then(function (data) {
        data = createHypermediaObject(data);
        if (angular.isFunction(successCallBack)) {
          safeCall(successCallBack, data);
        }

        return $q.when(data);
      }, function (messageObject) {
        if (angular.isFunction(errorCallBack)) {
          safeCall(errorCallBack, messageObject);
        }

        return $q.reject(messageObject);
      });
    },

    getContent: function(resource){
//      console.log('resourceObj', resource);
      var typeOfHMObject = typeOfHypermediaObject(resource) || {};
//      console.log('typeOfHMObject',typeOfHMObject);
      var reqObj;
      switch (typeOfHMObject) {
        case "link": reqObj = {
          method: resource.getLinkMethod(),
          url: resource.getLinkUrl(),
          headers: {'Content-Type': resource.getType()}};
          break;
        case "entry": reqObj = {
          method: 'GET',
          url: resource.getContentURL().href};
          break;
        default: reqObj = {
          method: 'GET',
          url: resource.url
        }
      }
//      console.log('reqObj', reqObj);
      return communicationAgent.http(reqObj).then(addHypermediaObject);
    }
  };

}]);
