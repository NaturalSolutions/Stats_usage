import pyodbc
import uuid
import json
import asyncio
import websockets
import sys

wsport = 5655
echo = True
echoErr = True
clients = []

def myprint(msg, err = False):
    if (echo and not err):
        print('---------- ' + str(msg))
    if (echoErr and err):
        print('########## ' + str(msg))

#-------------------------------------
#session,user_id:1205,site:NS-Shanghai
#visit,page:home,app:ecollentomo,home:1
#visit,page:subjects,app:ecollentomo,home:0
#visit,page:samples,app:ecollentomo,home:0
#click,loc_x:29.6587,loc_y:47.2147,el:div_test#333
#serverCall,infos:echo
#-------------------------------------

server = 'DESKTOP-020V6BC\GERTRUDE' 
database = 'stats_usage' 
username = 'gertrude' 
password = 'gertrude' 
cnxn = pyodbc.connect('DRIVER={SQL Server};SERVER='+server+';DATABASE='+database+';UID='+username+';PWD='+ password)
cursor = cnxn.cursor()

def executeQuery(query, select = False):   
    try:
        myprint(query)
        cursor.execute(query)
        print("********** The query may be notified as invalid 'Not a query' but still is executed well ...")
        if not select:
            cnxn.commit()
        result = None if cursor.rowcount == 0 else cursor.fetchall()
        myprint(result)
        return result
    except Exception as e:
        myprint("Problem in executeQuery with SQL Query: " + str(sys.exc_info()), True)
    
    return None;

#-------------------------------------

class Receiver:
    code = "0"
    scenario = ""
    currentVisit = 0
    websocket = None
    failInfos = None

    def __init__ (self, ws):
        myprint('Receiver init')
        self.websocket = ws
        self.handleConnected(ws)
        
    def handleConnected(self, websocket):
        myprint(str(self.websocket.remote_address) + ' connected')
        clients.append(self.websocket)

    def handleClose(self, websocket):
        myprint(str(self.websocket.remote_address) + ' closed')
        clients.remove(self.websocket)

        if len(self.scenario) > 0:
            query = "INSERT INTO Scenario VALUES ('"+str(self.scenario)+"')"
            executeQuery(query)
            
    async def checkData(self, data, properties):
        myprint("checkData " + properties[0])
        for item in properties:
            myprint('Check if ' + item + ' in ' + str(data))
            if item not in data:
                myprint(item + ' is not found in the transmited data !', True)
                imploded = ','.join([str(i) for i in properties])
                await self.mySendMessage(self.buildAnswer(False,"The data you sent wasn't correct, expected properties: " + imploded,{}))
                return False
        return True
        
    def buildAnswer(self, success, message, data):
        if data == None:
            data = {}
        return json.dumps({'result': 'success' if success else 'error','message':message,'data':data});

    async def handleMessage(self, websocket, data):
        jsonData = None
        if data != None:
            myprint('\nhandleMessage ' + str(data))
        try:
            jsonData = json.loads(str(data))
            if jsonData == None or 'action' not in jsonData or jsonData["action"] == None or jsonData["data"] == None:
                myprint('Received message does not contain expected values "action" and "data"', True)
                return await self.mySendMessage(self.buildAnswer(False,"The data you sent wasn't correct or well formated, 'action' and 'data' expected",{}))

            if echo and jsonData != None and 'action' in jsonData and jsonData["action"] == "echo":
                myprint('echoing: ' + str(jsonData))
                return await self.mySendMessage(self.buildAnswer(True,"Echoing",jsonData))

            return await self.mySendMessage(await self.parseMessage(jsonData))
        except Exception as e:
            myprint('Error in handleMessage: ' + str(sys.exc_info()), True)
    
        return await self.mySendMessage(self.buildAnswer(False,"There has been a problem, maybe with the data you sent",{}))

    async def mySendMessage(self, jsonToSend):
        if jsonToSend == None:
            myprint('Nothing to send to the client !', True)
            jsonToSend = self.buildAnswer(True,"Success",{})
        if jsonToSend == False:
            msgToSend = 'Something was wrong' + (':' + self.failInfos if self.failInfos != None else '!')
            myprint(msgToSend, True)
            jsonToSend = self.buildAnswer(False,msgToSend,{})
        if 'result' not in jsonToSend or 'message' not in jsonToSend or 'data' not in jsonToSend:
            jsonToSend = self.buildAnswer(True,"Success",jsonToSend)
        myprint('Sending message to client: ' + str(jsonToSend))
        self.failInfos = None
        await self.websocket.send(jsonToSend)
    
    async def parseMessage(self, jsonData):
        myprint('parseMessage of ' + str(jsonData))
        return await self.actions(jsonData["action"], jsonData["data"])

    async def actions(self, action, data):
        switcher = {
        'session':self.session,
        'visit':self.visit,
        'click':self.click,
        'serverCall':self.serverCall
        }
        if (action in switcher):
            return await switcher.get(action, lambda: 'invalid action')(data)
        return(self.buildAnswer(False,"Action '" + action + "' doesn't exist !",{}))
        
    async def session(self, data):
        props = ["user_id", "site"]
        if (not await self.checkData(data,props)):
            return False
        self.code = uuid.uuid4()

        query = "INSERT INTO Session VALUES('"+str(self.code)+"', "+str(data["user_id"])+", GETDATE(), '"+str(data["site"])+"')"
        executeQuery(query)

        return '{"action":"session", "data":{"session":"'+str(self.code)+'"}}'
    
    async def visit(self, data):
        if (self.code == "0"):
            self.failInfos = " There is no session registered for this visit, must open a session first!"
            return False
            
        props = ["page", "app", "home"]
        if (not await self.checkData(data, props)):
            return False
            
        if data["page"][0] == '/':
            data["page"] = data["page"][1:]

        query = "SELECT ID, home FROM Page WHERE name = '" + str(data["page"]).lower() + "' AND app = '" + str(data["app"]).lower() + "'"
        result = executeQuery(query, True)

        if result == None or result == []:
            query = "INSERT INTO Page VALUES('" + data["page"].lower() + "', '" + data["app"].lower() + "', " + str(data["home"]) + ")"
            executeQuery(query)

            query = "SELECT ID, home FROM Page WHERE name = '" + str(data["page"]).lower() + "' AND app = '" + str(data["app"]).lower() + "'"
            result = executeQuery(query, True)

        currentPage = result[0][0]
        homePage = result[0][1]
        
        myprint(str(currentPage) + ' && ' + str(homePage))

        if homePage == 1 and len(self.scenario) > 1:
            query = "INSERT INTO Scenario VALUES ('"+str(self.scenario)+"')"
            executeQuery(query)
            self.scenario = "1"

        skipLog = False
        
        if len(self.scenario) > 0:
            splittedScenario = self.scenario.split(">")
            if len(splittedScenario) > 0 and splittedScenario[-1] == str(currentPage):
                skipLog = True
                
        if not skipLog:
            if len(self.scenario) > 0:
                self.scenario += ">"
            self.scenario += str(currentPage)

        query = "INSERT INTO Visit VALUES ("+str(currentPage)+",'" + str(self.code) +"', GETDATE())"
        executeQuery(query)

        query = "SELECT scope_identity() AS ID"
        result = executeQuery(query, True)
        self.currentVisit = result[0][0]

        return None
    
    async def click(self, data):
        props = ["loc_x", "loc_y", "el"]
        if (not await self.checkData(data, props)):
            return False
        if self.currentVisit > 0:
            query = "INSERT INTO Click VALUES ("+str(self.currentVisit)+", "+str(data["loc_x"])+", "+str(data["loc_y"])+", '"+str(data["el"])+"')"
            executeQuery(query)
        else:
            self.failInfos = " There is no visit registered, you must send a page visit first!"
            return False

        return None

    async def serverCall(self, data):
        props = ["infos"]
        if (not await self.checkData(data, props)):
            return False
        session = str(self.code)
        if ("session" in data and data["session"] != None):
            session = str(data["session"])
        if (session != "0"):
            query = "INSERT INTO ServerCall VALUES ('"+str(data["infos"])+"','"+session+"', GETDATE())"
            executeQuery(query)
        else:
            self.failInfos = " There is no session registered for this server call, must open a session first!"
            return False

        return None  

async def connection(websocket, path):
    rcv = Receiver(websocket)
    try:
        async for message in websocket:
            await rcv.handleMessage(websocket, message)
    finally:
        rcv.handleClose(websocket)

myprint('Starting websocket listening on port ' + str(wsport))

start_server = websockets.serve(connection, "localhost", 5655)
asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()

##server = SimpleWebSocketServer('', wsport, Receiver)
##server.serveforever()

myprint('You should not be able to read this, is there an issue with websockets ?')