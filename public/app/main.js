
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
				//if($scope.drawTime != data.drawTime){
					$scope.drawTime = data.drawTime;					
					if(_callback){
						_callback();
					}
				//}

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
	var attempts = 0;

	$scope.timerInfo.getPosts = function() {
		$http({method: 'GET', url: '/api/posts'}).
			success(function(data, status, headers, config){								
				// update the post if applicable				
				if($scope.post === undefined || data._id != $scope.post._id){					
					$scope.post = data;					
					attempts = 0;
				}else{
					// if the same post was returned, it may be because the server
					// hasn't updated just yet, so keep having attempts
					if(attempts < 6){
						attempts++;
						$timeout($scope.timerInfo.getPosts, 5000);	
					}
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
	//$scope.post = { adcopy_response: 'a' };

	// post button
	$scope.createPost = function(_post){
		// disable buttons until process complete
		$scope.btnDisabled = true;

		$scope.showError = false;
		$scope.cancelState = 0;
		$scope.cancelText = 'Cancel';		

		// hack to get the response of the solve media captcha
		// should be handled via form api through directive.
		if($scope.post){
			$scope.post.adcopy_response = ACPuzzle.get_response();
			$scope.post.adcopy_challenge = ACPuzzle.get_challenge();
		}	

		if(_post.$valid && $scope.post.adcopy_response && $scope.post.adcopy_response.length > 0){
			$http.post('/api/create', $scope.post).
				success(function(data, status, headers, config){
					console.log(data);
					if(data == 'true'){
						console.log($scope.globals);
						$scope.globals.entryCount += 1;
						$scope.$emit('message', 'Congratulations, your post has been entered successfully. Good luck!', function(){
							// go back to main page
							$location.path('/');	
						});					
					}else{
						$scope.showError = true;						
						$scope.errorText = data;
						$scope.btnDisabled = false;
						// load another question
						ACPuzzle.reload();
					}
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
})
.directive('fluidIframe', ['$timeout', function($timeout){
	return {
		restrict: 'A',
		link: function(scope, elem, attrs) {
			// needs to be called post rendering so that the iframe exists
			var iframeOn = function(){
				var iframes = elem.find('iframe');	
				console.log(iframes);
				for(var i=0;i<iframes.length;i++){
					var iframe = iframes[i];

					if(attrs.fluidIframe == 'widthOnly'){
						iframe.width          = '100%';
					}else{
						var videoRatio = (iframe.height / iframe.width) * 100;

						// From fluidvids.js
						iframe.style.position = 'absolute';
	            		iframe.style.top      = '0';
	            		iframe.style.left     = '0';
	            		iframe.width          = '100%';
	            		iframe.height         = '100%';

	            		var wrap              = document.createElement( 'div' );
	            		wrap.className        = 'fluid-vids';
	            		wrap.style.width      = '100%';
	            		wrap.style.position   = 'relative';
	            		wrap.style.paddingTop = videoRatio + '%';

						var iframeParent      = iframe.parentNode;
	            		iframeParent.insertBefore( wrap, iframe );
	            		wrap.appendChild( iframe );				
	            	}	
				}							
			};
			// needs more than 0 delay to access post rendering
			$timeout(iframeOn, 100);			
		}
	};
}])
.directive('solveMediaCaptcha', ['$timeout', function($timeout){
	return {
		restrict: 'A',
		link: function(scope, elem, attrs){
     		var afterLoad = function(){
     			// make sure the puzzle has loaded
     			if(typeof ACPuzzle !== 'undefined'){     				
     				var ACPuzzleOptions = {
						theme:	'white',
						lang:	'en',
						size:	'300x150'
					};
			
					//ACPuzzle.create('zxEtcKYEGz3EM0YXVjEa7hE6sedQUwM-', 'acwidget', ACPuzzleOptions); // local dev key
					ACPuzzle.create('YnCyOHzZqMrZl6GYIZ561u51hbV-gfZ0', 'acwidget', ACPuzzleOptions);
				}else{
					$timeout(afterLoad, 500);
				}
     		};
     		// need a large enough delay to make sure captcha object has been created
     		$timeout(afterLoad, 200);     		     		
		}
	};
}]);
	