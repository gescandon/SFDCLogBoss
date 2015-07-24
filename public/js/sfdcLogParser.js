//sfdcLogParser.js

var CHILD_COLOR = "#9ACEEB";
var CHILDREN_COLOR = "#1DACD6";
var HEAVY_COLOR = "#FFAACC";
var TOO_HEAVY_COLOR = "#DD4492";
var TRIGGER_COLOR = "#CDA4DE";
var HEAVY_TRIGGER_COLOR = "#926EAE";
var TOO_HEAVY_TRIGGER_COLOR = "#FF1DCE";
var TARGET_TRIGGER_COLOR = "#76FF7A";


var selectedTrigger = 'ContactTrigger';

var validEvents = {
  CODE_UNIT_FINISHED:{name: "CODE_UNIT_FINISHED", type:"exit", color:"#FFFFFF"},
  CODE_UNIT_STARTED:{name: "CODE_UNIT_STARTED", type:"entry", color:"#FFFFFF"},
  EXECUTION_FINISHED:{name: "EXECUTION_FINISHED", type:"exit", color:"#ACE5EE"},
  EXECUTION_STARTED:{name: "EXECUTION_STARTED", type:"entry", color:"#ACE5EE"},
  METHOD_ENTRY:{name: "METHOD_ENTRY", type:"entry", color:"#ACE5EE"},
  METHOD_EXIT:{name: "METHOD_EXIT", type:"exit", color:"#ACE5EE"},
  SOQL_EXECUTE_BEGIN:{name: "SOQL_EXECUTE_BEGIN", type:"entry", color:"#FF7538"},
  SOQL_EXECUTE_END:{name: "SOQL_EXECUTE_END", type:"exit", color:"#FF7538"},
  SOSL_EXECUTE_BEGIN:{name: "SOSL_EXECUTE_BEGIN", type:"entry", color:"#FF7538"},
  SOSL_EXECUTE_END:{name: "SOSL_EXECUTE_END", type:"exit", color:"#FF7538"}
};

if (!Array.prototype.last) {
  Array.prototype.last = function() {
    return this[this.length - 1];
  };
}

function log(msg) {
    console.log(msg);
}  

function reduce(fn, a, init)
    {
        var s = init;
        for (i = 0; i < a.length; i++)
            s = fn( s, a[i] );
        return s;
    }

function sort(myObj) {
  //var myArr = $.parseJSON(myObj);
  var newObjArr = [];
  for (var key in myObj) {
    if (myObj.hasOwnProperty(key)) {
      var newObj = {};
      newObj['objName'] = key;
      newObj['objCount'] = myObj[key];
      newObjArr.push(newObj);
    }
  }

  var myArr = newObjArr;
  myArr.sort(function(a, b){
      var keyA = a.objCount,
      keyB = b.objCount;
      // Compare the 2 values: sort desc
      if(keyA > keyB) return -1;
      if(keyA < keyB) return 1;
      return 0;
  });  
  //return myArr.sort();
  return newObjArr;
}

sfdcLogParser  = {
	logevents : [],
	nodes : {},
	soqlArr : {},
	apexArr : {},
	addNewNode : function (nodeid, nodetype, startline, endline, parentId) {
		  //var ssplit = startline.split("|");
		  //var esplit = endline.split("|");
		  var nnode = {
		    id : 'node' + nodeid,
		    parentId : parentId ? 'node' + parentId : '',
		    name : nodetype,
		    data :{},
		    children : [],
		    soql: (function(){
		      if (nodetype == 'SOQL_EXECUTE_BEGIN') {
		        return startline.split("|")[5];
		      } else {
		        return '';
		      }
		    }()),
		    soqlObject: (function(){
		      if (nodetype == 'SOQL_EXECUTE_BEGIN') {
		      	try {
			        var soql = startline.toLowerCase().split("|")[5];
			        return soql.split(" from ")[1].split(" ")[0];
		      	} catch (e) {
		      		log (" > Exception parsing soql: ");
		      		log (soql);
		      	}
		      } else {
		        return '';
		      }
		    }()),
		    codeUnit: (function(){

		    	try {

		      if (nodetype == 'CODE_UNIT_STARTED' && (endline != "none")) {
		        return endline.split("|")[2].split(" ")[0];
		      } else {
		        return '';
		      }

		      } catch (e) {
		      	log(" >> Exception on codeUnit ");
		      	log(e.name + " :: " + e.message);
		      	log(startline);
		      	log(endline);
		      	return (">> Exception " + e.name);
		      } 

		    }()),
		    trigger: (function(){

		    	try {


		      if (nodetype == 'CODE_UNIT_STARTED' && (endline != "none") && endline.split("|")[2].split(" ")[0].indexOf('Trigger') >= 0) {
		        return endline.split("|")[2].split(" ")[0];
		      } else {
		        return '';
		      } 

		      } catch (e) {
		      	log(" >> Exception on trigger ");
		      	log(e.name + " :: " + e.message);
		      	log(startline);
		      	log(endline);
		      	return (">> Exception " + e.name);
		      } 

		    }())    
		  };

		  // set data
		  nnode.data["nodetype"] = nodetype;
		  nnode.data["soqlObject"] = nnode.soqlObject;
		  nnode.data["codeUnit"] = nnode.codeUnit;
		  nnode.data["startline"] = startline;
		  nnode.data["endline"] = endline;
		  nnode.data["$area"] = 1;
		  nnode.data["$dim"] = 1;
		  try {
		    nnode.data["$color"] = validEvents[nnode.name].color;  
		    if (nnode.codeUnit.indexOf('Trigger') >= 0 ) {
		      nnode.data["$color"] = TRIGGER_COLOR;
		    }  
		    if (nnode.codeUnit.indexOf(selectedTrigger) >= 0 ) {
		      nnode.data["$color"] = TARGET_TRIGGER_COLOR;
		    }      
		  } catch (e) {
		    log('Exception: ' + e.name + ': ' + e.message); 
		    log(nnode.id);
		    log(nnode.name);
		  }
		  sfdcLogParser.nodes[nnode.id] = nnode;
		},
	getSoqlObjectCount : function () {
		  var objarr = {};
		  var nodearr = sfdcLogParser.nodes;
		  for (var key in nodearr) {
		    if (nodearr.hasOwnProperty(key)) {
		      var soqlObject = nodearr[key].soqlObject;
		      if (soqlObject != '') {
		        if (objarr[soqlObject] == null) {
		          objarr[soqlObject] = 0;
		        }
		        objarr[soqlObject] = 1 + objarr[soqlObject];

		      }
		    }
		  }

		  newObjArr = sort(objarr);
		  return newObjArr;

	},
	getSoqlList : function(objName) {
	  var objarr = {};
	  var output = ''
	  var nodes = sfdcLogParser.nodes;
	  for (var key in nodes) {
	    if (nodes.hasOwnProperty(key)) {
	      var soqlObject = nodes[key].soqlObject;
	      if (nodes[key].soqlObject == objName) {
	        var soql = nodes[key].soql;
	        
	        if (objarr[soql] == null) {
	          objarr[soql] = 0;
	        }
	        objarr[soql] = 1 + objarr[soql];
	        
	        output += '<div>' + soql + '</div>';
	      }
	    }
	  }

	  newObjArr = sort(objarr);
	  //return output;
	  var output = reduce(function(s, x) {
	  return s + '<div class="soql-deet"><div style="margin: 5px; width:80%;float:left;">' + newObjArr[i].objName + '</div><div>Count: ' + newObjArr[i].objCount + '</div></div><div style="clear:both;"></div>'},
	  newObjArr, "");
	  return output;
	},
	getTriggerCount : function () {
	  var objarr = {};
	  var nodearr = sfdcLogParser.nodes;
	  for (var key in nodearr) {
	    if (nodearr.hasOwnProperty(key)) {
	      var trigger = nodearr[key].trigger;
	      if (trigger != '') {
	        if (objarr[trigger] == null) {
	          objarr[trigger] = 0;
	        }
	        objarr[trigger] = 1 + objarr[trigger];        
	      }

	    }
	  }

	  // sort !!
	  newObjArr = sort(objarr);
	  return newObjArr;
	},	
	getValidLineCount : function (data) {
		var lines = data.split("\n");
		return reduce(function(s, x) {
			var elements = x.split("|");
			if (validEvents[elements[1]] != null) {
				s += 1;
			}
			return s;
		}, lines, 0);
	},
	isValidElement : function(el) {
		if (sfdcLogParser.validElements.indexOf(el) > -1) {
			return true;
		} else {
			return false;
		}
	},
	processLines : function(data) {
		// reset
		sfdcLogParser.logevents = [];
		sfdcLogParser.nodes = {};
		sfdcLogParser.soqlArr = {};
		sfdcLogParser.apexArr = {};
		
		//begin
		  var lines = data.split('\n');
		  var logevents = [];
		  var parentarr = [];
		  var idcntr = 0;
		  var rootId = 0;
		  var prevOp;

		  for (var i=0;i<=lines.length;i++) {
		    if (lines[i] != null) {
		      var elements = lines[i].split("|");
		      var id = elements[1];
		      if (id != null) {
		        var logevent = validEvents[id.trim()];
		        if (logevent != null) {
		          // process log id
		          if (logevent.type == "entry") {
		            // push node start
		            logevents.push(idcntr + "|" + lines[i]);
		            
		            if (logevent.name =="EXECUTION_STARTED") {
		              rootId = i;
		            }
		            if (logevent.name =="CODE_UNIT_STARTED") {
		             log(lines[i]);
		            }		            if (prevOp == "entry") {
		              //log("parent push " + (idcntr-1));
		              parentarr.push(idcntr-1);
		            }
		            idcntr++;
		            prevOp = logevent.type;

		          }
		          if (logevent.type == "exit") {
		            // node close - add new node
		            var sline = logevents.pop(1);
		            var ssplit = sline.split("|");
		            if (prevOp == "exit") {
		              //log(" parent pop " + parentarr.last());
		              parentarr.pop(1);
		            }
		            	var exitval;
		            	try {
		            		exitval = ssplit[2].trim();
		            	} catch (e) {
		            		exitval = ssplit;
		            	}
		              sfdcLogParser.addNewNode(ssplit[0], exitval, sline, lines[i], parentarr.last());              
		            prevOp = logevent.type;
		          }
		        }
		      }
		    }
		  }

		  if (logevents.length > 0) {
		    // close remaing nodes
		    for (var i=0; i<= logevents.length; i++) {
		      var sline = logevents.pop(1);
		      var ssplit = sline.split("|");
		      parentarr.pop(1);
		            	var exitval;
		            	try {
		            		exitval = ssplit[2].trim();
		            	} catch (e) {
		            		exitval = ssplit;
		            	}
		      sfdcLogParser.addNewNode(ssplit[1], exitval, sline, 'none', parentarr.last());      
		    }
		  }
	},
	rawData : function (data) {
		return '<pre>' + data + '</pre>';
	}
};