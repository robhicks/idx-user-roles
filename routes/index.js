var express = require('express');
var router = express.Router();
var Q = require('q');
var when = require('when');
var _ = require('lodash');
var request = require('request');
var xml2js = require('xml2js');
var parser = new xml2js.Parser();
var util = require('util');
//var request = require('httpinvoke');
var headers;

/* GET home page. */
router.get('/', function (req, res) {
  res.render('index', { title: 'Express' });
});



router.post('/addRoles', function (req, res) {
  var model = req.body.data;
  headers = {Authorization: 'Bearer ' + model.user.sessionId};
  getUsers(model)
      .then(addRoles)
      .then(getUserRoles)
      .then(function (data) {
//        console.log('DATA BEING SENT TO CLIENT', data);
        res.send(data);
      }, function (err) {
        res.send(500, err);
      });

});

router.post('/setRoles', function (req, res) {
  var model = req.body.data;
  headers = {Authorization: 'Bearer ' + model.user.sessionId};
  getUsers(model)
      .then(setRoles)
      .then(getUserRoles)
      .then(function (data) {
//        console.log('DATA BEING SENT TO CLIENT', data);
        res.send(data);
      }, function (err) {
        console.error(err);
        res.send(500, err);
      });
});

router.post('/checkAccountsAndRoles', function (req, res) {
  var model = req.body.data;
  headers = {Authorization: 'Bearer ' + model.user.sessionId};
  getUsers(model)
      .then(getUserRoles)
      .then(function (data) {
//        console.log('DATA BEING SENT TO CLIENT', data);
        res.send(data);
      }, function (err) {
        console.error(err);
        res.send(500, err);
      });

});

module.exports = router;

function getUsers(model){
  return sessionIdValid(model)
      .then(addSystemUserInfo);
}

function addSystemUserInfo(model) {
  return when.promise(function(resolve, reject){
    var options = {
      url: 'https://beta.familysearch.org/indexing-service/api/v1/user/list',
      headers: headers
    };
    if (!model || _.isEmpty(model.users) || !_.isArray(model.users)) {
      reject(new Error('NO USERS PROVIDED'))
    } else {
      var promises = model.users.map(function (user) {
        return when.promise(function (resolve, reject) {
          options.qs = !_.isEmpty(user.username) ? {username: user.username} : {email: user.email};
          request.get(options, function (err, response, body) {
            if (!_.isEmpty(body)) {
              parser.parseString(body, function (err, json) {
                user = _.extend(user, normalizeUserJson(json));
                resolve(user);
              });
            }
          });
        });
      });
      when.all(promises).then(function(results){
        resolve(model);
      });
    }
  });
}

function normalizeUserJson(json) {
  var base = json
      && json['fsi-idx-v1:userList']
      && json['fsi-idx-v1:userList'].users
      && json['fsi-idx-v1:userList'].users[0].user
      ? json['fsi-idx-v1:userList'].users[0].user[0]
      : null;
  var user = {};
  if (base) {
    user.uuid = base.UUID[0];
    user.id = base.$.id;
    user.displayName = base.displayName[0];
    user.email = base.email ? base.email[0] : '';
  }
  return user;
}

function normalizeRoleJson(json) {
//  console.log(json);
  var role = {};
  role.id = json.$.id;
  role.name = json.name[0];
  return role;
}

function getUserRoles(model) {
  return when.promise(function(resolve, reject){
    return sessionIdValid(model)
        .then(function (model) {
          var promises = model.users.map(function (user) {
            return addAccountStatus(user)
                .then(addUserRoles);
          });
          when.all(promises).then(function(results){
            resolve(model);
          });
        });
  });
}

function addAccountStatus(user) {
  return when.promise(function(resolve, reject){
    var options = {
      url: 'https://beta.familysearch.org/indexing-service/api/v1/user/list',
      headers: headers,
      qs: {username: user.username}
    };
    request.get(options, function(err, resp, body){
      checkForUser(body, function(answer){

        user.exists = answer;
        if (!user.exists) {
          var ans = "NO DATA";
          user.displayName = ans;
          user.email = ans;
          user.id = ans;
          user.uuid = ans;
          user.roles = [];
//          console.log('USER', user);
          resolve(user);
        } else {
          resolve(user);
        }
      });
    });
  });
}

function checkForUser(body, cb) {
  parser.parseString(body, function(err, json){
    cb(json['fsi-idx-v1:userList'] && json['fsi-idx-v1:userList'].users && json['fsi-idx-v1:userList'].users && !_.isEmpty(json['fsi-idx-v1:userList'].users[0]));
  })
}

function addUserRoles(user) {
  return when.promise(function(resolve, reject){
    if (!user.exists) {
      resolve(user);
    } else {
      var options = {
        url: 'https://beta.familysearch.org/indexing-service/api/v1/authz/role/user/list/' + user.id,
        headers: headers
      };
      request.get(options, function (err, resp, body) {
        parser.parseString(body, function (err, tempRec) {
          if (err) {
            reject(err);
          } else {
            var roles = [];
            var systemRoles = tempRec && tempRec['fsi-idx-v1:roleList'] ? tempRec['fsi-idx-v1:roleList'].roles[0].role : null;
            if (systemRoles) {
              systemRoles.forEach(function (sysRole, i) {
                roles.push(normalizeRoleJson(sysRole));
                user.roles = roles;
              });
            }
            resolve(user);
          }
        });
      });
    }
  });
}

function sessionIdValid(model){
  return when.promise(function(resolve, reject){
    var options = {
      url: 'https://beta.familysearch.org/indexing-service/api/v1/user/list',
      qs: {username: 'joesmith'},
      headers: headers
    };
    request.get(options, function (err, response) {
      if (err || response.statusCode !== 200) {
        reject(new Error('INVALID SESSION ID'));
      } else {
        resolve(model);
      }
    });
  })
}

function setRoles(model){
  return when.promise(function(resolve, reject){
    var rolesArray = [];
    var rolesToSet = model.roles.filter(function (role) {
      return role.selected === true;
    });
    rolesToSet.forEach(function (role) {
      rolesArray.push(role.id);
    });
    var options = {
      headers: headers,
      json: {"ids": rolesArray}
    };

    var promises = model.users.map(function (user) {
      return when.promise(function(resolve, reject){
        options.url = 'https://beta.familysearch.org/indexing-service/api/v1/authz/role/user/' + user.id;
        request.put(options, function (err, response, body) {
          if (err) reject(err);
          else resolve(user);
        });
      });
    });

    when.all(promises).then(function () {
      resolve(model);
    });
  });
}

function addRoles(model) {
  return when.promise(function(resolve, reject){
    var rolesToSet = model.roles.filter(function (role) {
      return role.selected === true;
    });
    if (rolesToSet.length < 1) {
      reject('NO ROLES PROVIDED');
    } else {
      var promises = model.users.map(function(user){
        return when.promise(function(resolve, reject){
          var options = {
            headers: headers
          };
          rolesToSet.forEach(function(role){
            options.url = 'https://beta.familysearch.org/indexing-service/api/v1/authz/role/user/' + user.id + '/' + role.id;
            request.post(options, function(err, response){});
          });
          resolve(user);
        });
      });
      when.all(promises).then(function(results){
        resolve(model);
      })
    }
  });
}
