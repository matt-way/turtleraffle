
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

	$scope.timerInfo = {};

	$scope.message = { showMessage: false };	

	$scope.globals = { entryCount: 0 };	
	//$scope.timeLeft = 0;

	// tell post controller to look for new posts
	function requestPosts(){
		$scope.$broadcast('requestPosts');
	}

	var cSecs = 1000;
	var cMins = cSecs * 60;
	var cHours = cMins * 60;	

	(function countDown(){		
		if($scope.drawTime != undefined){
			var curTime = new Date();
			var dTime = $scope.drawTime;			
			var timeLeft = dTime - curTime;
			
			if(timeLeft <= 1){
				$scope.timeLeft = 'selecting...';

				// halt other timer processes
				if($scope.timerInfo.infoTickPromise){					
					$timeout.cancel($scope.timerInfo.infoTickPromise);	
				}

				// give the server a little time to update and tell the post
				// controller to update as we should have a new winner post
				$timeout(function(){
					requestPosts();
					// restart the info - passing the counter restart once the info has been retrieved
					$scope.timerInfo.infoTick(countDown);					
				}, 10000);
			}else{							
				var hours = Math.floor(timeLeft / cHours);
				var mins = Math.floor((timeLeft - (hours*cHours)) / cMins);
				var	secs = Math.floor((timeLeft - (hours*cHours) - (mins*cMins)) / cSecs);
				
				var left = '';
				if(hours < 10){ left += '0'; }
				left += hours + ':';
				if(mins < 10){ left += '0'; }
				left += mins + ':';
				if(secs < 10){ left += '0'; }
				left += secs;

				$scope.timeLeft = left;

				$timeout(countDown, 1000);
			}		
		}else{
			$timeout(countDown, 1000);
		}		
	})();

	// get the time left and number of entries
	$scope.timerInfo.infoTick = function(_callback) {
		$http({method: 'GET', url: '/api/info'}).
			success(function(data, status, headers, config){
				$scope.globals.entryCount = data.entryCount;

				// update the countdown timer				
				if($scope.drawTime != data.drawTime){
					$scope.drawTime = data.drawTime;					
					if(_callback){
						_callback();
					}
				}

				// short poll the entry count (every min)
				$scope.timerInfo.infoTickPromise = $timeout($scope.timerInfo.infoTick, 60000);
			}).
			error(function(data, status, headers, config){
				// just shorten the timeout and try again
				$scope.timerInfo.infoTickPromise = $timeout($scope.timerInfo.infoTick, 5000);
			});
	};
	$scope.timerInfo.infoTick();

	$scope.$on('message', function(event, _text, _callback){
		$scope.message.showMessage = true;
		$scope.message.text = _text;
		$scope.message.callback = _callback;		
	});	

	$scope.msgClick = function() {
		$scope.message.showMessage = false;
		if($scope.message.callback){
			$scope.message.callback();
		}		
	};
})
.controller('PostCtrl', function($scope, $http, $timeout){

	$scope.timerInfo.getPosts = function() {
		$http({method: 'GET', url: '/api/posts'}).
			success(function(data, status, headers, config){								
				// update the post if applicable
				if($scope.post === undefined || data._id != $scope.post._id){					
					$scope.post = data;
				}
			}).
			error(function(data, status, headers, config){
				// wait and try again
				$timeout($scope.timerInfo.getPosts, 5000);
			});
	};	
	$scope.timerInfo.getPosts();

	$scope.$on('requestPosts', function() {
		$scope.timerInfo.getPosts();
	});
})
.controller('CreateCtrl', function($scope, $location, $http){
	$scope.btnDisabled = false;

	$scope.cancelState = 0;
	$scope.cancelText = 'Cancel';

	$scope.showError = false;
	$scope.errorText = '';
	
	// temporary captcha result
	$scope.post = { adcopy_response: 'a' };

	// post button
	$scope.createPost = function(_post){
		// disable buttons until process complete
		$scope.btnDisabled = true;

		$scope.showError = false;
		$scope.cancelState = 0;
		$scope.cancelText = 'Cancel';				

		if(_post.$valid){
			$http.post('/api/create', $scope.post).
				success(function(data, status, headers, config){
					console.log($scope.globals);
					$scope.globals.entryCount += 1;
					$scope.$emit('message', 'Congratulations, your post has been entered successfully. Good luck!', function(){
						// go back to main page
						$location.path('/');	
					});					
				}).
				error(function(data, status, headers, config){					
					$scope.showError = true;
					$scope.errorText = data;
					$scope.btnDisabled = false;
				});
		}else{
			$scope.showError = true;
			$scope.errorText = 'Form has been filled out incorrectly. Please re-check your entries.';
			$scope.btnDisabled = false;
		}
	};

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
	