//sfdcLogParser.js


var debugMode = true;
var verboseMode = true;

var CHILD_COLOR = "#9ACEEB";
var CHILDREN_COLOR = "#1DACD6";
var HEAVY_COLOR = "#FFAACC";
var TOO_HEAVY_COLOR = "#DD4492";
var TRIGGER_COLOR = "#F6CEE3";
var HEAVY_TRIGGER_COLOR = "#F6CEE3";
var TOO_HEAVY_TRIGGER_COLOR = "#F6CEE3";
var TARGET_TRIGGER_COLOR = "#F6CEE3";


var selectedTrigger = '__null__';

var validEvents = {
  CODE_UNIT_FINISHED:{name: "CODE_UNIT_FINISHED", type:"exit", color:"#FFFFFF", opener:"CODE_UNIT_STARTED"},
  CODE_UNIT_STARTED:{name: "CODE_UNIT_STARTED", type:"entry", color:"#FFFFFF"},
  CALLOUT_REQUEST:{name:"CALLOUT_REQUEST", type:"entry",color:"#FFFFFF"},
  CALLOUT_RESPONSE:{name:"CALLOUT_RESPONSE", type:"exit",color:"#FFFFFF", opener:"CALLOUT_REQUEST"},
  EXECUTION_FINISHED:{name: "EXECUTION_FINISHED", type:"exit", color:"#ACE5EE", opener:"EXECUTION_STARTED"},
  EXECUTION_STARTED:{name: "EXECUTION_STARTED", type:"entry", color:"#ACE5EE"},
  SOQL_EXECUTE_BEGIN:{name: "SOQL_EXECUTE_BEGIN", type:"entry", color:"#FFFF00"},
  SOQL_EXECUTE_END:{name: "SOQL_EXECUTE_END", type:"exit", color:"#FFFF00", opener:"SOQL_EXECUTE_BEGIN"},
  SOSL_EXECUTE_BEGIN:{name: "SOSL_EXECUTE_BEGIN", type:"entry", color:"#FFFF00"},
  SOSL_EXECUTE_END:{name: "SOSL_EXECUTE_END", type:"exit", color:"#FFFF00", opener:"SOSL_EXECUTE_BEGIN"},
  DML_BEGIN:{name: "DML_BEGIN", type:"entry", color:"#A9F5D0"},
  DML_END:{name: "DML_END", type:"exit", color:"#A9F5D0", opener:"DML_BEGIN"}
};

if (!Array.prototype.last) {
  Array.prototype.last = function() {
    return this[this.length - 1];
  };
}

function log(msg) {
    console.log(msg);
}  

function debuglog(msg) {
    if (debugMode) {
    	console.log(msg);
    }
}  

function verboselog(msg) {
    if (verboseMode) {
    	console.log(msg);
    }
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
	parentNodeIds : [],
	soqlArr : {},
	apexArr : {},
	color : '#fff',
	isTimingType: function(ntype) {
		var timingTypes = ['CODE_UNIT_STARTED','DML_BEGIN','SOQL_EXECUTE_BEGIN','CALLOUT_REQUEST'];
		if (timingTypes.indexOf(ntype) > -1 ) {
			return true;
		} else {
			return false;
		}
	},
	addNewNode : function (nodeid, nodetype, startline, endline, parentId) {
		  //var ssplit = startline.split("|");
		  //var esplit = endline.split("|");
		  var nnode = {
		    id : 'node' + nodeid,
		    parentId : parentId ? 'node' + parentId : '',
		    nodetype : nodetype,
		    name : (function() {
		    	var nname;
		    	if (nodetype === 'CODE_UNIT_STARTED') {
		    		var name = nodetype + ':: ' + endline.split("|")[2];
		    		nname = name;
		    	} else if (nodetype === 'CALLOUT_REQUEST') {
		    		var fullcallout = startline.split("|")[4];
		    		nname = nodetype + ':: ' + fullcallout.split("hondaweb.com")[1];
		    	} else if (nodetype === 'METHOD_ENTRY') {
		    		nname = startline.split("|")[5];
		    	} else if (nodetype === 'SOQL_EXECUTE_BEGIN') {
		    		var rowcount = endline.toLowerCase().split("|")[3];
		    		var name = nodetype + ':: ' + rowcount + ' :: ' + startline.toLowerCase().split("|")[5].split(" from ")[1].split(" ")[0];
		    		nname = name
		    	} else if (nodetype === 'DML_BEGIN') {
		    		var sline = startline.split("|");
		    		var name = nodetype + ':: ' + sline[4] + ':: ' + sline[5] + ':: ' + sline[6];
			    	nname = name;
		    	} else if (nodeid == 'X') {
		    		nname = 'nodeX';
		    	} else {
		    		nname = 'no name node';
		    	}
		    	if (nname.length > 100) {
		    		nname = nname.substr(0, 100) + '...';
		    	}
		    	if (sfdcLogParser.isTimingType(nodetype)) {
		    		timing = sfdcLogParser.getTiming(startline, endline);
		    		nname += ' ::: ' + timing;		    		
		    	}
		    	return nname;
		    }()),
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
		        return endline.split("|")[2];
		      } else if (nodetype == 'METHOD_ENTRY' && (endline != "none")) {
		        return startline.split("|")[5];
			    } else if (nodetype == 'DML_BEGIN') {
			    	var sline = startline.split("|");
			    	return sline[4] + ':: ' + sline[5] + ':: ' + sline[6];
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
		    timing: sfdcLogParser.getTiming(startline, endline),
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

		  try {
		  	nnode.color = validEvents[nodetype].color;  
		    if (nnode.codeUnit.indexOf('trigger event') >= 0 ) {
		      nnode.color= TRIGGER_COLOR;
		    }  
		    if (nnode.codeUnit.indexOf(selectedTrigger) >= 0 ) {
		      nnode.color = TARGET_TRIGGER_COLOR;
		    }      
		  } catch (e) {
		    log('Color Exception: ' + nnode.nodetype + ":: " +e.name + ': ' + e.message); 
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
	getParent: function(node) {
		if (node.parentId && sfdcLogParser.nodes[node.parentId]) {
			return sfdcLogParser.getParent(sfdcLogParser.nodes[node.parentId]);
		} else {
			return node;
		}
	},
	getRoot: function() {
		sfdcLogParser.addNewNode('X', 'EXECUTION_STARTED', '', '', '');
		var nodes = sfdcLogParser.nodes;
		var rootX = nodes['nodeX'];

		return sfdcLogParser.loadChildren(rootX);
		
	},
	getTiming: function(startline, endline) {
		var timing = -1;
	    try {
	    	var stime = 0.0;
	    	var etime = 0.0;
			if (startline) stime = startline.split("|")[1].split("(")[1].split(")")[0];
			if (endline) etime = endline.split("|")[0].split("(")[1].split(")")[0];
			timing = Math.round((etime - stime) / 1000000);
  		} catch (e) {
  			debuglog('*** Timing Exception:: ' + e.message);
  			debuglog('*** startline: ' + startline);
  			debuglog('*** endline: ' + endline);
  		}
  		return timing;
	},
	getTimings: function() {
		var nodes = sfdcLogParser.nodes;
		var objarr = [];
	  for (var key in nodes) {
	    if (nodes.hasOwnProperty(key)) {
	      var node = nodes[key];
	      if (sfdcLogParser.isTimingType(node.nodetype)) {
	      		verboselog('timing log: ' + node.name);
	          objarr[node.name] = node.timing;
	      }
	    }
	  }

	  newObjArr = sort(objarr);
	  //return output;
	  var output = reduce(function(s, x) {
	  return s + '<div class="soql-deet"><div style="margin: 5px; width:80%;float:left;">' + newObjArr[i].objName +  '	</div><div style="clear:both;"></div>'},
	  	newObjArr, "");
	  return output;

	},
	getTree: function() {
		var tree = [];
		var nodes = sfdcLogParser.nodes;
		var rootX = sfdcLogParser.getRoot();	
		var pids = sfdcLogParser.parentNodeIds;

		return rootX;
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
	loadChildren : function(node) {
		for (var key in sfdcLogParser.nodes) {
		  if (sfdcLogParser.nodes.hasOwnProperty(key)) {
		    var nnode = sfdcLogParser.nodes[key];
		    try {
		    	if (node && node.id === nnode.parentId) {
		    	node.children.push(sfdcLogParser.loadChildren(nnode));
		    	}

		    } catch ( ex) {
		      		log (" > Exception loadChildren: ");
		      		log(ex.name + " :: " + ex.message)
		      		log (node.data["startline"]);
		    	}
		  }
		  
		}
		return node;
	},
	processLines : function(data) {
		sfdcLogParser.reset();
		
		//begin
		  var lines = data.split('\n');
		  var logevents = [];
		  var parentarr = [];
		  var idcntr = 0;
		  var rootId = 0;
		  var prevOp;

		  for (var i=0;i<=lines.length;i++) {
		    if (lines[i] != null) {
		    	//verboselog(lines[i]);

		      var elements = lines[i].split("|");
		      var id = elements[1];
		      if (id != null) {
		        var logevent = validEvents[id.trim()];
		        if (logevent == null) {
		        	// verboselog('INVALID EVENT: ' + elements[1]);
		        } else {
		          // process log id
		          if (logevent.type == "entry") {
		            // push node start
		            logevents.push(idcntr + "|" + lines[i]);
		            
		            if (logevent.name =="EXECUTION_STARTED") {
		              rootId = i;
		            }
		            if (logevent.name =="CODE_UNIT_STARTED") {
		             //log(lines[i]);
		            }		            
		            if (prevOp == "entry") {
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
		            logevents.push(sline); // put it back on for now.

		            var isExitPair = false;
		            debuglog(logevent.name + "::" + logevent.opener);
		            if (logevent.opener == ssplit[2]) {
		            	isExitPair = true
			         	if (logevent.name == 'METHOD_EXIT') {
			         		isExitPair = false;
		            		if (elements[2] == ssplit[3]) {
		            			// matching numeric id
		            			isExitPair = true;
		            		}
		            	} else if (logevent.name == 'CODE_UNIT_FINISHED'){
			         		isExitPair = false;
		            		if (elements[elements.length -1] == ssplit[ssplit.length - 1] ||
		            			(ssplit[ssplit.length - 1].indexOf(elements[elements.length -1]) > 0)) {
		            			isExitPair = true;

		            		}
		            	}
		            }
		            
		            if (isExitPair) {
		            sline = logevents.pop(1);

		            try {
			            if (prevOp == "exit") {
			              // ignore lone exits.
			              parentarr.pop(1);
			            }
			            	var exitval;
			            	try {
			            		exitval = ssplit[2].trim();
			            	} catch (e) {
			            		exitval = ssplit;
			            	}

					      var parentId = parentarr.last();
					      if (parentId == '') {
					      	// set root parent
					      	parentId = 'X';
					      }

			         	//debuglog('ENTRY EXIT: ' + logevent.name + ':' + logevent.type);
			         	if (parentarr.last() == '') {
			         		sfdcLogParser.parentNodeIds.push('node' + ssplit[0]);
			         	}
			            sfdcLogParser.addNewNode(ssplit[0], exitval, sline, lines[i], parentId);
		            } catch (e) {
			         	debuglog('** ENTRY EXIT (missing entry): ' + logevent.name + ':' + logevent.type);
			            sfdcLogParser.addNewNode(ssplit[0],logevent.name, logevent.type, 'missing entry line: ' + lines[i], parentarr.last());
		            }
		        } else {
		        	// record singular exist event
			         	debuglog('SINGULAR EXIT: ' + logevent.name + ": " + logevent.opener + ": " + elements[0] + ": " + elements[elements.length -1] + " != " + ssplit[ssplit.length - 1]);
			            sfdcLogParser.addNewNode(ssplit[0], logevent.name, logevent.type, 'singular exit: ' + lines[i], parentarr.last());		        	
		        }


		            prevOp = logevent.type;
		          }
		        }
		      }
		    }
		  }

	  	log('logevents not close: ' + logevents.length);
	  	
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
		      var parentId = parentarr.last();
		      if (parentId == '') {
		      	parentId = 'X';
		      }
		      sfdcLogParser.addNewNode(ssplit[0], exitval, sline, 'none', parentId);      
		    }
		  }
		  
	},
	rawData : function (data) {
		return '<pre>' + data + '</pre>';
	},
	reset : function() {
		sfdcLogParser.logevents = [];
		sfdcLogParser.nodes = {};
		sfdcLogParser.soqlArr = {};
		sfdcLogParser.apexArr = {};
	}
};


function loadLog(selectedLog) {
  $('#soql-tots').html('Loading log...');
  $('#trigg-tots').html('');
      
  var rr = '/loghome/' + selectedLog;
  log('Selected Log: ' + rr + '\n');
  //$( '#lograw').html(rr + "\n");
  var jqxhr = $.ajax( rr )
      .done(function(data ) {
      
      rawLog = data;
      sfdcLogParser.processLines(data);
      log(" >> complete processing");

      // update soql totals
      var objCountArr = sfdcLogParser.getSoqlObjectCount();    
      var soqlCountList = reduce(function(s, x) {
        return s + '<span class="link-stat">' + objCountArr[i].objName + ': <span class="log-link" onclick="showSoqlDeets(\''+objCountArr[i].objName+'\');">' + objCountArr[i].objCount + '</span></span>'},
        objCountArr, "");

      var soqlTotalCount = reduce(function(s, x) {
        var x = objCountArr[i].objCount;
        return s + x;},
        objCountArr, 0);
      $('#soql-tots').html('<h3>SOQL Object Count: ' + soqlTotalCount + '</h3>' + soqlCountList);

      // update trigger totals
      var triggerCount = sfdcLogParser.getTriggerCount();
      var trigCountList = reduce(function(s,x ) {
          return s + '<span class="link-stat">' + triggerCount[i].objName + ': <span class="log-link" onclick="showInfoVis();">' + triggerCount[i].objCount + '</span></span>'},
          triggerCount, "");

      $("#trigg-tots").html('<h3>Trigger Count</h3>' + trigCountList);
      //$("#raw").html("<pre>" + JSON.stringify(sfdcLogParser.nodes, null,"--") + "</pre>");
      
      update(sfdcLogParser.getRoot());



    })
  };

