
public class stats_logger{
	
	private connection = null;
	private disabled = true;
	private echo = true;
	
	constructor(address, port){
		window.WebSocket = window.WebSocket || window.MozWebSocket;
		if (!window.WebSocket) {
			myLog("Browser don't support websockets !!!", true);
			return;
		}
		
		if (!address || !port)
		{
			myLog("Must give 'address' and 'port' in constructor", true);
			return;
		}
		
		connection = new WebSocket('ws://'+address+':'+port);
		
		connection.onopen = function () {
			disabled = false;
			disabled('Onopen inital ping');
			mySend({"type":"ping"});
		};

		connection.onerror = function (error) {
			myLog("There's a problem with your connection or the server: " + error.toString(), true);
		};

		connection.onmessage = function (message) {
			myLog('Message received: ' + message.toString());
			try {
				message = JSON.parse(message);
				myLog('JSON parsed message is: ' + message);
			} catch (e) {
				myLog('Received message is not a valid JSON');
			}
			myLog('Received message data is ', message.data);
			myManageMessage(message);
		};
	}
	
	private myLog(msg, critical){
		if (echo || critical)
			console.log('-----Stats_Logger----- ' + msg);
	}
	
	// Unstringified objects should arrive here as tosend
	private mySend(tosend){
		if (disabled || !connection){
			myLog("Stats logger disabled or no connection established yet", true);
			return false;
		}
		connection.send(JSON.stringify(tosend));
	}
	
	private myManageMessage(message){
		//Nothing for now
	}
	
	private buildActionObject(action, data){
		return({"type":"action","action":action,"data":data});
	}
	
	//SECURITE user ID, SECURITE sitename too
	public sendSession(user_id, sitename){
		mySend(buildActionObject("session",{"user_id":user_id,"site":sitename}));
	}
	
	public sendVisit(page, app, home){
		mySend(buildActionObject("visit",{"page":page,"app":app,"home":home}));
	}
	
	public sendClick(loc_x, loc_y, elem){
		mySend(buildActionObject("click",{"loc_x":loc_x,"loc_y":loc_y,"el":elem}));
	}
	
	//Session is optional and actually not really meant to be used
	public sendServerCall(infos, session){
		mySend(buildActionObject("serverCall",{"infos":infos}));
	}
}


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