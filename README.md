# Stats_usage

Tiny project for logging web apps usage communicated through websockets into a Sql Server DB
_____

Start server that way:
python -u server.py

Folder "Testing" contains a tiny webapp for testing communication with the python back through websockets

Folder "Front examples" contains examples of what you may want to implement in your app to communicate with the python back

Folder "Pipes" contains the necessary "Console administration" scripts to init the project
(If you dont use the app "Console administration", you should still be able to extract the proper SQL scripts from inside the file just by reading it)

Check the "required back.txt" file for the list of required python libs used

Port listened by the back: 5655

No authentication system when sending data to the back, anyone can log anything

---------------------------------------

Back will expect json strings formated that way:

{
	"type":"action",
	"action":"my action",
	"data":{}
}

Property "action" may have the following values:

- session
- visit
- click
- serverCall

-------------------------------------

Each action has a compulsory list of parameters that must be sent into the "data" parameter:

- session: "user_id" (int), "site" (string)
 - user_id => ID of the user as found in SECURITE database
 - site => Sitename as found in SECURITE database

- visit: "page" (string), "app" (string), "home" (bit 0/1)
 - page => The visited page (may or not include the post parameters)
 - app => The application name as found in SECURITE database
 - home => Wether the page can be considered as an entry point for the app (= homepage)

- click: "loc_x" (double), "loc_y" (double), "el" (string)
 - loc_x => X location for the click, should be sent in percentage (0% is the left of the screen, 100% the right)
 - loc_y => Y location for the click, should be sent in percentage (0% is the top of the screen, 100% the bottom)
 - el => The clicked html element

- serverCall: "infos" (string)
	- infos => Informations about the call made by the web app to its back end (api path, parameters ...)