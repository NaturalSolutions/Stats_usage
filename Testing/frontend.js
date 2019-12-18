$(function () {
    "use strict";

    var content = $('#content');
    var input = $('#input');
    var status = $('#status');

    // if user is running mozilla then use it's built-in WebSocket
    window.WebSocket = window.WebSocket || window.MozWebSocket;

    // if browser doesn't support WebSocket, just show some notification and exit
    if (!window.WebSocket) {
        content.html($('<p>', { text: 'Sorry, but your browser doesn\'t '
                                    + 'support WebSockets.'} ));
        input.hide();
        $('span').hide();
        return;
    }

    // open connection
    var connection = new WebSocket('ws://localhost:5655');

    connection.onopen = function () {
		console.log('Going to ping');
		connection.send(JSON.stringify({"type":"ping"}));
		
        input.removeAttr('disabled');
        status.text('send action:');
    };

    connection.onerror = function (error) {
        content.html($('<p>', { text: 'Sorry, but there\'s some problem with your '
                                    + 'connection or the server is down.' } ));
    };

    connection.onmessage = function (message) {
		console.log('onmessage received', message);
        try {
            var message = JSON.parse(message);
			console.log('message is ', message);
        } catch (e) {
            console.log('This doesn\'t look like a valid JSON');
        }
		console.log('Message data is ', message.data);
		addMessage('Server', message.data, new Date());
    };

    input.keydown(function(e) {
        if (e.keyCode === 13) {
            var msg = $(this).val();
            if (!msg) {
                return;
            }
			var data = {};
			var action = msg;
			if (msg.indexOf(',') != -1)
			{
				msg.split(',').forEach(function(value, index){
					if (index == 0)
						action = value;
					else {
						if (value.indexOf(':') != -1)
							data[value.split(':')[0]] = value.split(':')[1];
						else
							data[value] = '';
					}
				});
			}
			var tosend = {"type":"action","action":action, "data":data};
			console.log('sending', tosend);
            connection.send(JSON.stringify(tosend));
            $(this).val('');
        }
    });

    setInterval(function() {
        if (connection.readyState !== 1) {
            status.text('Error');
            input.attr('disabled', 'disabled').val('Unable to comminucate '
                                                 + 'with the WebSocket server.');
        }
    }, 3000);

    function addMessage(author, message, dt) {
        content.prepend('<p><span>' + author + '</span> @ ' +
             + (dt.getHours() < 10 ? '0' + dt.getHours() : dt.getHours()) + ':'
             + (dt.getMinutes() < 10 ? '0' + dt.getMinutes() : dt.getMinutes())
             + ': ' + message + '</p>');
    }
});