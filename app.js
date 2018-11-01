var myApp = angular.module('App', ['ngRoute', 'ngCookies', 'ngSanitize']);

window.fbAsyncInit = function () {
    FB.init({
        appId: 'appID',
        autoLogAppEvents: true,
        xfbml: true,
        version: 'v3.1'
    });
};

(function (d, s, id) {
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) {
        return;
    }
    js = d.createElement(s);
    js.id = id;
    js.src = "https://connect.facebook.net/en_US/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'facebook-jssdk'));


// configure our routes
myApp.config(['$routeProvider', '$locationProvider', function ($routeProvider, $locationProvider) {
    $routeProvider
        .when('/', {
            templateUrl: 'templates/home.html',
            controller: 'homeController'
        }).when('/login', {
            templateUrl: 'templates/login.html',
            controller: 'loginController'
        }).otherwise({
            redirectTo: '/login'
        });
}]);


myApp.run(['$rootScope', '$location', '$cookies', '$http', function ($rootScope, $location, $cookies, $http) {
    $rootScope.authdata = $cookies.getObject('authdata') || {};
    $rootScope.userData = $cookies.getObject('userData') || {};

    $rootScope.$on('$locationChangeStart', function (event, next, current) {
        if ($cookies.getObject('authdata')) {
            if ($cookies.getObject('authdata') && $cookies.getObject('authdata').status === 'connected') {
                $location.path('/');
            }else{
                $location.path('/login');
            }
        }else{
            $location.path('/login');
        }
    });
}]);

myApp.controller("loginController", ['$window', '$cookies', '$rootScope', '$http', '$location', '$scope', function ($window, $cookies, $rootScope, $http, $location, $scope) {
    $scope.login = function () {
        FB.login(function (response) {
            if (response.authResponse && response.status === 'connected' ) {
                $cookies.putObject('authdata', response);
                FB.api('/me?fields=first_name', function (response) 
                {   
                    if (response.first_name && response.id ){
                        $cookies.putObject('userData', response);
                        $window.location.assign('/');
                    }
                });
            } else {
                alert('Something went wrong. kindly try again.')
            }
        });
    };
}]);

myApp.controller("homeController", ['$cookies', '$rootScope', '$http', '$location', '$scope', function ($cookies, $rootScope, $http, $location, $scope) {
    $scope.authdata = $cookies.getObject('authdata');
    $scope.userData = $cookies.getObject('userData');
    $scope.ud = $cookies.getAll();
    console.log($scope.ud);
    
    $scope.data =[];
    $scope.accounts = [];

    $scope.showAccountDetails = {};

    
    $http({
        method: 'GET',
        url: "https://graph.facebook.com/me/accounts?access_token=" + $scope.authdata.authResponse.accessToken
    }).then(function successCallback(response) {
        $scope.accounts = response.data.data;
    }, function errorCallback(response) {
        alert(response);
        $location.path('/login');
    });
    

    $scope.data = {};
    
    $scope.accountDetails = function(account){
        if(!$scope.showAccountDetails[account.id]){
            $http({
                method: 'GET',
                url: "https://graph.facebook.com/" + account.id + "?fields=instagram_business_account&access_token=" + $scope.authdata.authResponse.accessToken
            }).then(function successCallback(response) {
                if(response.data.instagram_business_account){
                    $scope.data[account.id] = {
                        'ig' : {
                            'details' : response.data.instagram_business_account,
                            'media' : []
                        }
                    }
                    $http({
                        method: 'GET',
                        url: "https://graph.facebook.com/" + response.data.instagram_business_account.id + "/media?fields=id,media_type,media_url,owner,timestamp,like_count,comments_count&access_token=" + $scope.authdata.authResponse.accessToken
                    }).then(function successCallback(response) {
                        if(response.data.data){
                            angular.forEach(response.data.data, function(value, key){
                                var obj = {}
                                $http({
                                    method: 'GET',
                                    url: "https://graph.facebook.com/" + value.id + "/insights?metric=impressions,reach,engagement&access_token=" + $scope.authdata.authResponse.accessToken
                                }).then(function successCallback(response) {
                                    if(response.data){
                                        obj.details = value;
                                        obj.insight = response.data;
                                        $scope.data[account.id]['ig']['media'].push(obj)
                                    }
                                    
                                }, function errorCallback(response) {
                                    if(response.data){
                                        obj.details = value;
                                        obj.insight = response.data;
                                        $scope.data[account.id]['ig']['media'].push(obj)
                                    }
                                    console.log("error while getting media insight"  + value.id) 
                             
                                });;
                            });
                        }
                        
                    }, function errorCallback(response) {
                        console.log("error while getting the list of ig media" +response);
                    });
                }
               
            }, function errorCallback(response) {
                console.log("error while getting ig_bussiness id" + response);
            });
        }
    };

}]);


