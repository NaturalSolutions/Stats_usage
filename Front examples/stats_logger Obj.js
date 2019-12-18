define([], function () {
    'use strict';
	
	var toret = {
		connection: null,
		disabled: true,
		echo: false,
		
		initialize: function(options){
			var that = this;
			window.WebSocket = window.WebSocket || window.MozWebSocket;
			if (!window.WebSocket) {
				this.myLog("Browser don't support websockets !!!", true);
				return;
			}
			
			if (!options || !options.address || !options.port)
			{
				this.myLog("Must give 'address' and 'port' in initialize", true);
				return;
			}
			
			this.connection = new WebSocket('ws://'+options.address+':'+options.port);
			
			this.connection.onopen = function () {
				that.disabled = false;
				that.myLog('Onopen inital ping');
				that.mySend({"type":"ping"});
			};

			this.connection.onerror = function (error) {
				that.myLog("There's a problem with your connection or the server: " + error.toString(), true);
			};

			this.connection.onmessage = function (message) {
				that.myLog('Message received: ' + message.toString());
				try {
					message = JSON.parse(message);
					that.myLog('JSON parsed message is: ' + message);
					that.myLog('Received message data is ', message.data);
				} catch (e) {
					that.myLog('Received message is not a valid JSON');
				}
				that.myManageMessage(message);
			};
		},
		
		myLog: function(msg, critical){
			if (this.echo || critical)
				console.log('-----Stats_Logger----- ' + msg);
		},
		
		// Unstringified objects should arrive here as tosend
		mySend: function(tosend){
			if (this.disabled || !this.connection){
				this.myLog("Stats logger disabled or no connection established yet", true);
				return false;
			}
			this.connection.send(JSON.stringify(tosend));
		},
		
		myManageMessage: function(message){
			// Nothing for now
		},
		
		buildActionObject: function(action, data){
			return({"type":"action","action":action,"data":data});
		},
		
		// SECURITE user ID, SECURITE sitename too
		sendSession: function(user_id, sitename){
			this.mySend(this.buildActionObject("session",{"user_id":user_id,"site":sitename}));
		},
		
		sendVisit: function(page, app, home){
			this.mySend(this.buildActionObject("visit",{"page":page,"app":app,"home":home}));
		},
		
		sendClick: function(loc_x, loc_y, elem){
			this.mySend(this.buildActionObject("click",{"loc_x":loc_x,"loc_y":loc_y,"el":elem}));
		},
		
		// Session is optional and actually not really meant to be used
		sendServerCall: function(infos, session){
			this.mySend(this.buildActionObject("serverCall",{"infos":infos}));
		}
	};
	
	return toret;
});


/* Example of sending click event fo server
handleGlobalClick(evt) {
	var customDomPath = function(orig_el){
		var stack = [];
		while ( orig_el.parentNode != null )
		{
			var elemCount = 0;
			var elemIndex = 0;
			for ( var i = 0; i < orig_el.parentNode.childNodes.length; i++ )
			{
				var elem = orig_el.parentNode.childNodes[i];
				if ( elem.nodeName == orig_el.nodeName )
				{
					if ( elem === orig_el )
					{
						elemIndex = elemCount;
					}
					elemCount++;
				}
			}
			var toAdd = orig_el.nodeName.toLowerCase();
			if(orig_el.className)
			{
				toAdd += '.' + orig_el.className.replace(/ /g, '.');
			}
			if( orig_el.hasAttribute('id') && orig_el.id != '' )
			{
				toAdd += '#' + orig_el.id;
			}
			else if ( elemCount > 1 )
			{
				toAdd += ':eq(' + elemIndex + ')';
			}
			stack.unshift(toAdd);
			orig_el = orig_el.parentNode;
		}

		return stack.slice(4); // removes the html element
	};

	var x_click = (evt.clientX / window.innerWidth * 100).toFixed(2);
	var y_click = (evt.clientY / window.innerHeight * 100).toFixed(2);
	sendClick(x_click,y_click,customDomPath(evt.srcElement).join('>'));
}
*/