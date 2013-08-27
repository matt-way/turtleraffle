
angular.module('turtleRaffle', [], function($routeProvider, $locationProvider){
	$routeProvider.when('/', {
		templateUrl: './app/posts.html',
		controller: 'PostCtrl'
	});
	$routeProvider.when('/create', {
		templateUrl: './app/create.html',
		controller: 'CreateCtrl'
	});
})
.controller('MainCtrl', function($scope, $http, $timeout){

	$scope.entryCount = 0;	
	//$scope.timeLeft = 0;

	// tell post controller to look for new posts
	function requestPosts(){
		$scope.$emit('requestPosts');
	}

	(function countDown(){		
		if($scope.drawTime != undefined){
			var curTime = new Date();
			var dTime = $scope.drawTime;
			var timeLeft = new Date(dTime - curTime);			
			if(timeLeft < 0){
				$scope.timeLeft = 'selecting...'

				// give the server a little time to update and tell the post
				// controller to update as we should have a new winner post
				$timeout(requestPosts, 10000);
			}else{							
				var hours = timeLeft.getHours();
				var mins = timeLeft.getMinutes();
				var	secs = timeLeft.getSeconds();
				
				var left = '';
				if(hours < 10){ left += '0'; }
				left += hours + ':';
				if(mins < 10){ left += '0'; }
				left += mins + ':';
				if(secs < 10){ left += '0'; }
				left += secs;

				$scope.timeLeft = left;
			}		
		}
		$timeout(countDown, 1000);
	})();

	// get the time left and number of entries
	(function tick() {
		$http({method: 'GET', url: '/api/info'}).
			success(function(data, status, headers, config){
				$scope.entryCount = data.entryCount;

				// update the countdown timer				
				if($scope.drawTime != data.drawTime){
					$scope.drawTime = data.drawTime;					
				}

				// short poll the entry count (every min)
				$timeout(tick, 60000);
			}).
			error(function(data, status, headers, config){
				// just shorten the timeout and try again
				$timeout(tick, 5000);
			});
	})();
})
.controller('PostCtrl', function($scope, $http, $timeout){

	(function getPosts() {
		$http({method: 'GET', url: '/api/posts'}).
			success(function(data, status, headers, config){				
				// update the post if applicable
				if($scope.post === undefined || data.post.id != $scope.post.id){
					$scope.post = data.post;
				}
			}).
			error(function(data, status, headers, config){
				// wait and try again
				$timeout(getPosts, 5000);
			});
	})();

	$scope.$on('requestPosts', function() {
		getPosts();
	});
})
.controller('CreateCtrl', function($scope, $location){

	$scope.cancelState = 0;
	$scope.cancelText = 'Cancel';

	$scope.showError = false;
	$scope.errorText = '';
	// form validation

	// post button
	$scope.createPost = function(_post){
		if(_post.$valid){
			$http.post('/create', _post).
				success(function(data, status, headers, config){
					$scope.showError = false;
					// redirect back to main screen
					// passing success so that a message is shown to user

				}).
				error(function(data, status, headers, config){
					console.log(data);
					$scope.showError = true;
					$scope.errorText = err;
				});
		}else{
			$scope.showError = true;
			$scope.errorText = 'There are invalid form elements. Please re-check your entries.';
		}
	}

	// cancel button
	$scope.cancelPost = function() {		
		if($scope.cancelState == 0){
			$scope.cancelText = 'Click again to confirm';
			$scope.cancelState = 1;
		}else{			
			$location.path('/');
		}
	}
});
	