import { Callout, Intent, Divider } from '@blueprintjs/core';
import * as fs from 'fs';
import * as path from 'path';
import * as React from 'react';
import { Rnd } from "react-rnd";
import * as yamlParser from '../parsing/yaml/yaml_parser';
import * as scripting from '../scripting';
import { VillanelleAceEditor } from './villanelle_ace_editor';
import { VillanelleNavbar } from './villanelle_navbar';
import { VillanellePlayArea } from './villanelle_playarea';
import { VillanelleTreeVisualizer } from './villanelle_tree_visualizer';
import { VillanellePaneNavbar } from './villanelle_navbar';


import ReactBlockly from 'react-blockly';
import * as ConfigFiles from './exampleContent';

import * as Blockly from 'blockly/core';

import { VillanelleWindowTab } from './villanelle_window_tab';
import { VillanelleWindowPane } from './villanelle_window_pane';
import { VillanelleWindowTabClass } from './villanelle_window_tab';
import { VillanelleWindowPaneClass } from './villanelle_window_pane';

import { ipcRenderer } from 'electron';

var electron = require('electron');

var remote = require('electron').remote;
var dialog = remote.dialog;

var Mousetrap = require('mousetrap');

export class App extends React.Component<{}, {
  currentTabOne: string,
  currentTabTwo: string,
  code: string,
  errors: {},
  doc: {},
  nodeIdToDatapathMap: {},
  nodeIdStatusMap: {},
  rootNodeDatapaths: string[],
  currentFile: string,
  fileOpened: boolean,
  unsaved: boolean,
  currentFilePath: string,
  toolboxCategories: any,
  currentXML: string,
  workspaceRef: any
}> {
  constructor(props) {
    super(props);
	
	
    var yamlString = '';
    var initializedObject = this.initializeGame(yamlString);
	let date: date = new Date();
	var newlogfilename = date.getUTCDate() + "-" + (date.getUTCMonth() + 1) + "-" + date.getUTCFullYear() + "-" + date.getHours() + "-" + date.getMinutes() + "-Log" + ".txt";
	var newSwitchLogName = date.getUTCDate() + "-" + (date.getUTCMonth() + 1) + "-" + date.getUTCFullYear() + "-" + date.getHours() + "-" + date.getMinutes() + "-Switch" + ".txt";
    this.state = {
	  currentTabOne: 'Blocks',
	  currentTabTwo: 'Tree',
      code: yamlString,
      errors: this.getErrorsByDataPath(initializedObject.errors),
      doc: initializedObject.doc,
      nodeIdToDatapathMap: initializedObject.nodeIdToDatapathMap,
      nodeIdStatusMap: initializedObject.nodeIdStatusMap,
      rootNodeDatapaths: initializedObject.rootNodeDatapaths,
      currentFile: "[New file]",
	  logFilePrefix: newSwitchLogName,
	  codeSnapShotFileName: newlogfilename,
	  lastLogTime: date,
	  lastLog: "",
	  millisecondsBetweenLogs: 10000,
      fileOpened: false,
      unsaved: false,
      currentFilePath: "",
	  toolboxCategories: [],
	  currentXML: "",
	  workspaceRef: null
    };

	this.getPageAtID = this.getPageAtID.bind(this);
    this.setCurrentTab = this.setCurrentTab.bind(this);
    this.setCode = this.setCode.bind(this);
    this.setNodeIdStatusMap = this.setNodeIdStatusMap.bind(this);
    this.saveFile = this.saveFile.bind(this);
    this.saveAsFile = this.saveAsFile.bind(this);
    this.openFile = this.openFile.bind(this);
    this.reloadGame  = this.reloadGame.bind(this);
	this.initBlocksForBlockly = this.initBlocksForBlockly.bind(this);
	this.initGeneratorForBlockly = this.initGeneratorForBlockly.bind(this);
	this.blocklyWorkspaceDidChange = this.blocklyWorkspaceDidChange.bind(this);
	
	this.initBlocksForBlockly();
	this.initGeneratorForBlockly();
	

    // Mousetrap.bind(['command+r', 'ctrl+r', 'f5'], function () {
    //   ipcRenderer.send('reload')
    // })
    Mousetrap.bind(['command+i', 'ctrl+i', 'command+shift+i', 'ctrl+shift+i'], function () {
      ipcRenderer.send('toggleDevTools')
    })
    Mousetrap.bind(['command+w', 'ctrl+w'], function () {
      ipcRenderer.send('closed')
    })
    Mousetrap.bind(['command+s', 'ctrl+s'], this.saveFile)
    Mousetrap.bind(['command+shift+s', 'ctrl+shift+s'], this.saveAsFile)
    Mousetrap.bind(['command+o', 'ctrl+o'], this.openFile)
  }
  

  public setCurrentTab(currentTab, navID) {
	var cTO = this.state.currentTabOne.slice(0), cTT = this.state.currentTabTwo.slice(0);

	if(navID === 'one'){

		//Save code in the on-change method for the blocks component
		if(currentTab == this.state.currentTabTwo)
			this.setState({ currentTabTwo: cTO, currentTabOne: currentTab});
		else
			this.setState({ currentTabOne: currentTab});
		
	}
	else if(navID === 'two'){
		if(currentTab == this.state.currentTabOne)
			this.setState({ currentTabOne: cTT, currentTabTwo: currentTab});
		else
			this.setState({ currentTabTwo: currentTab});
	}
  }

  public reloadGame() {
    this.setCode(this.state.code)
  }

  public setCode(code) {
    var initializedObject = this.initializeGame(code);
    this.setState({
      code: code,
      errors: this.getErrorsByDataPath(initializedObject.errors),
      doc: initializedObject.doc,
      nodeIdToDatapathMap: initializedObject.nodeIdToDatapathMap,
      nodeIdStatusMap: initializedObject.nodeIdStatusMap,
      rootNodeDatapaths: initializedObject.rootNodeDatapaths,
      unsaved: true
    });
  }

  public saveFile() {
    if (!this.state.fileOpened) {
      return this.saveAsFile();
    }
	if(this.state.currentFilePath.endsWith(".yml"){
    fs.writeFile(this.state.currentFilePath, this.state.code, (err) => {
      if (err) {
        alert(err);
        console.log(err);
        return;
      }
      this.setState({ unsaved: false });
    })
	}
	else{
	  fs.writeFile(this.state.currentFilePath, this.state.currentXML, (err) => {
      if (err) {
        alert(err);
        console.log(err);
        return;
      }
      this.setState({ unsaved: false });
    })
	}
	}
  

  public saveAsFile() {
    dialog.showSaveDialog(null, {}, (filepath) => {
      if (filepath === undefined) {
        alert("You didn't save the file");
        return;
      }
	var ymlSave = false;
	if(filepath.endsWith(".yml")){
		      fs.writeFile(filepath, this.state.code, (err) => {
        if (err) {
          alert(err);
          console.log(err);
          return;
        }
        alert("Saved successfully!");
        this.setState({
          currentFile: path.basename(filepath),
          fileOpened: true,
          unsaved: false,
          currentFilePath: filepath
        });
      });
	}
	else{ 
		if(!filepath.endsWith(".xml"))
			filepath += ".xml";
	

      fs.writeFile(filepath, this.state.currentXML, (err) => {
        if (err) {
          alert(err);
          console.log(err);
          return;
        }
        alert("Saved successfully!");
        this.setState({
          currentFile: path.basename(filepath),
          fileOpened: true,
          unsaved: false,
          currentFilePath: filepath
        });
      });
	
	}
    })
  }

  public openFile() {
    dialog.showOpenDialog(null, {
      filters: [{ name: 'Villanelle files', extensions: ['yml', 'xml'] }]
    }, (filePaths) => {
      if (filePaths === undefined || filePaths.length == 0) {
        return;
      }
      var filePath = filePaths[0];
      fs.readFile(filePath, 'utf-8', (err, data) => {
        if (err) {
          alert(err);
          console.log(err);
          return;
        }
		if(filePath.split('.').pop() == 'yml'){
			this.setCode(data);
		}
		else{
			if(this.state.currentTabOne !== 'Blocks'){
				if(this.state.currentTabTwo === 'Blocks'){
					this.setState({ currentTabTwo: 'Play'});
					this.setState({ currentXML: data, currentTabTwo: 'Blocks'});
				}else{
					this.setState({ currentXML: data, currentTabOne: 'Blocks'});
				}
			}else{
				this.setState({ currentTabOne: 'Play'});
				this.setState({ currentXML: data, currentTabOne: 'Blocks'});
			}
		}
		this.setState({
			currentFile: path.basename(filePath),
			fileOpened: true,
			unsaved: false,
			currentFilePath: filePath
		});
      });
    })
  }

  dataPathToNodeStatusMap = {}
  dataPathToNodeIdMap = {}
  public setNodeIdStatusMap(nodeIdStatusMap) {
    this.setState({
      nodeIdStatusMap: nodeIdStatusMap
    });
    Object.keys(this.state.nodeIdToDatapathMap).forEach(key => {
      this.dataPathToNodeStatusMap[this.state.nodeIdToDatapathMap[key]] = nodeIdStatusMap[key];
      this.dataPathToNodeIdMap[this.state.nodeIdToDatapathMap[key]] = key;
    });

    //reset statuses
    this.state.rootNodeDatapaths.forEach(rootNodeDatapath => {
      let status: scripting.Status = this.dataPathToNodeStatusMap[rootNodeDatapath];
      if (status == scripting.Status.SUCCESS || status == scripting.Status.FAILURE) {
        //clear node status for child nodes
        Object.keys(this.dataPathToNodeIdMap).forEach(dataPath => {
          if (dataPath.startsWith(rootNodeDatapath)) {
            scripting.clearNodeStatus(this.dataPathToNodeIdMap[dataPath]);
          }
        })
      }
    })
  }

  initializeGame(yamlString) {
    scripting.reset();
    let parsedObject = yamlParser.parse(yamlString);
    let errors = parsedObject.errors;
    let doc = parsedObject.doc;
    let nodeIdToDatapathMap = parsedObject.nodeIdToDatapathMap;
    let nodeIdStatusMap = scripting.getNodeIdStatusMap();

    if (errors.length == 0) {
      scripting.initialize();
    }
    return {
      doc: doc,
      errors: errors,
      nodeIdToDatapathMap: nodeIdToDatapathMap,
      nodeIdStatusMap: nodeIdStatusMap,
      rootNodeDatapaths: parsedObject.rootNodeDatapaths
    };
  }

  getCallout() {
    var errorDatapaths = Object.keys(this.state.errors);
    var errors = this.state.errors;
    if (errorDatapaths.length != 0) {
      let errorsList = <ul>
        {errorDatapaths.map(function (errorDatapath, index) {
          return <li key={index}>{errors[errorDatapath].message}</li>
        })}
      </ul>;
      let title = "Compilation: " + errorDatapaths.length + " error(s)";
      return <Callout title={title} intent={Intent.DANGER}>
        {errorsList}
      </Callout>;
    } else {
      return <Callout title="Compilation" intent={Intent.SUCCESS}>
        Successful!
      </Callout>;
    }
  }
  
  public blocklyWorkspaceDidChange(workspace){
	let xmlCode = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(workspace));
	this.setState({ currentXML: xmlCode });
	
    var time = new Date().getTime();
	//console.log(time - this.state.lastLogTime.getTime());
	//console.log(this.state.millisecondsBetweenLogs);
	if(time - this.state.lastLogTime.getTime() > this.state.millisecondsBetweenLogs){
		if(xmlCode != this.state.lastLog){
			fs.appendFileSync(this.state.codeSnapShotFileName, "\nSnapshot at " + Date() + "\n\n" + xmlCode);
			this.state.lastLog = xmlCode;
		}else{
			fs.appendFileSync(this.state.codeSnapShotFileName, "\nSnapshot at " + Date() + "\n\n" + "<No Changes>");
		}
		this.state.lastLogTime = new Date();
	}
	
	/*
	 * From J. Thomas Bacher to anyone else:
	 * Developing a whole generator file for a new language is complicated
	 * So I just created a bunch of new blocks and add them to the Javascript Blockly generator
	 * This makes this line seem very weird (Villanelle code from javascript?) but it is right
	 */
	let villanelleCode = Blockly.JavaScript.workspaceToCode(workspace);
	this.setCode(villanelleCode);
  }

  
  public getPageAtID(currID, windowWidth, windowHeight){
	  
	let refTab, name, otherTab;
	if(currID === 'one'){
		refTab = this.state.currentTabOne;
		otherTab = this.state.currentTabTwo;
		name = "Tab One";
	}
	else{
		refTab = this.state.currentTabTwo;
		otherTab = this.state.currentTabOne;
		name = "Tab Two";
	}
	
	
	let myNavBar = <VillanellePaneNavbar
          handler={this.setCurrentTab}
          currentTab={refTab}
          fixToTop={refTab === 'Script'}
          saveHandler={this.saveFile}
          saveAsHandler={this.saveAsFile}
          openHandler={this.openFile}
          currentFile={this.state.currentFile}
          unsaved={this.state.unsaved}
          reloadGameHandler={this.reloadGame}
		  id={currID}
		  name={name}
        />;
	 
	if (refTab === 'Script'){
		let compilationResult = this.getCallout();

      let aceEditorPanel = <div>
        <VillanelleAceEditor
          handler={this.setCode}
          code={this.state.code}
          height={windowHeight - 230}
          saveHandler={this.saveFile}
          saveAsHandler={this.saveAsFile}
          openHandler={this.openFile}
        />
        {compilationResult}
      </div>;
	  
	  return (<div>
	  <Divider />
        <Divider />
        <Divider />
        <Divider />
		<Divider />
        <Divider />
        <Divider />
        <Divider />
	  {myNavBar}
	  {aceEditorPanel}
	  </div>);
	}
	else if (refTab === 'Blocks' ){
		let newXML = this.state.currentXML
		/* From J Thomas Bacher (2/23/2022):
			This is the saddest thing from when I worked on Villanelle:
			The only way to implement the toolbox is to pass it a javascript object containing all the information for the toolbox
			As a result we have this nonsense of a line that is impossible to mess with. I tried putting it into a javascript
			object and passing it in, but that didn't take. Would fix if I knew how
		*/
		let reactBlocks = <ReactBlockly 
			toolboxCategories={ [ { "name":"Villanelle Main", "colour":"#5C81A6", "blocks":[ { "type":"villanellprog" } ] }, { "name":"Initialization", "colour":"#5C81A6", "blocks":[ { "fields":{ "variableName":"<var_name>" }, "type":"setvariable" } ] }, { "name":"User Interaction", "colour":"#5C81A6", "blocks":[ { "type":"description" }, { "type":"useraction" }, { "fields":{ "type":"selector" }, "type":"node" }, { "type":"condition" }, { "type":"effects" } ] }, { "name":"Agents", "colour":"#5C81A6", "blocks":[ { "type":"agent" }, { "fields":{ "type":"selector" }, "type":"node" }, { "type":"condition" }, { "type":"effecttext" }, { "type":"effects" } ] }, { "name":"Effects", "colour":"#5C81A6", "blocks":[ { "statements":{ "substatementList":{ "fields":{ "variableName":"<var_name>" }, "type":"setvariable", "shadow":false } }, "type":"effects" }, { "fields":{ "variableName":"<var_name>" }, "type":"setvariable" } ] }, { "name":"Text", "colour":"#5C81A6", "blocks":[ { "fields":{ }, "type":"text" }, { "fields":{ "varName":"<var_name>" }, "type":"getvariable" } ] }, { "name":"Logic", "colour":"#5C81A6", "blocks":[ { "fields":{ "OP":"EQ" }, "type":"logic_compare" }, { "fields":{ "OP":"AND" }, "type":"logic_operation" }, { "fields":{ "BOOL":"TRUE" }, "type":"logic_boolean" }, { "fields":{ "varName":"<var_name>" }, "type":"getvariable" } ] }, { "name":"Math", "colour":"#5C81A6", "blocks":[ { "type":"math_number" }, { "type":"math_arithmetic" } ] } ] }
			wrapperDivClassName="fill-height"
			workspaceDidChange={this.blocklyWorkspaceDidChange}
			initialXml={newXML}
		/>
		

		
		return (<div>
	  <Divider />
        <Divider />
        <Divider />
        <Divider />
		<Divider />
        <Divider />
        <Divider />
        <Divider />
		{myNavBar}
		{reactBlocks}
	  </div>);
	}
	else if (refTab === 'Play' ){
	  let uio = scripting.getUserInteractionObject();
      let hasErrors = Object.keys(this.state.errors).length != 0;
      if (hasErrors) {
        let mainPage = <VillanellePlayArea hasErrors={true} uio={uio} handler={this.setNodeIdStatusMap} />;
		return (<div>
		<Divider />
        <Divider />
        <Divider />
        <Divider />
		<Divider />
        <Divider />
        <Divider />
        <Divider />
	  {myNavBar}
	  {mainPage}
	  </div>);
      } else {
        let playAreaPanel = <VillanellePlayArea hasErrors={false} uio={uio} handler={this.setNodeIdStatusMap} />;

        return (<div>
		<Divider />
        <Divider />
        <Divider />
        <Divider />
		<Divider />
        <Divider />
        <Divider />
        <Divider />
	  {myNavBar}
	  {playAreaPanel}
	  </div>);
      }
	}
	else if (refTab === 'Tree' ){
		if(otherTab !== 'Play'){
		let treeVisualizerPanel = <VillanelleTreeVisualizer
        doc={this.state.doc}
        errors={this.state.errors}
        showDebugState={false} />
		return (<div>
		<Divider />
        <Divider />
        <Divider />
        <Divider />
		<Divider />
        <Divider />
        <Divider />
        <Divider />
	  {myNavBar}
	  {treeVisualizerPanel}
	  </div>);
		}
		else{
		let treeVisualizerPanel = <VillanelleTreeVisualizer
          doc={this.state.doc}
          errors={this.state.errors}
          showDebugState={true}
          nodeIdToDatapathMap={this.state.nodeIdToDatapathMap}
          nodeIdStatusMap={this.state.nodeIdStatusMap}
          rootNodeDatapaths={this.state.rootNodeDatapaths}
          dataPathToNodeStatusMap={this.dataPathToNodeStatusMap}
          dataPathToNodeIdMap={this.dataPathToNodeIdMap} />
		  
		  		return (<div>
		<Divider />
        <Divider />
        <Divider />
        <Divider />
		<Divider />
        <Divider />
        <Divider />
        <Divider />
	  {myNavBar}
	  {treeVisualizerPanel}
	  </div>);
		}
	}
	
	console.log('Reached improper end');
  }

  render() {
    let mainPage, leftPage, rightPage;
    var screen = electron.screen.getPrimaryDisplay();
    let windowWidth = screen.size.width;
    let windowHeight = screen.size.height;
	
	let pageOne = this.getPageAtID('one', windowWidth, windowHeight), pageTwo = this.getPageAtID('two', windowWidth, windowHeight);
	
	mainPage = this.getSplitPane(windowWidth, windowHeight, pageOne, pageTwo);


	let exampleTab = new VillanelleWindowTabClass('Example Tab', false, null);
	var listOfTabs:Array<number> = new Array();
	
	listOfTabs.push(new VillanelleWindowTabClass('Code', false, null));
	
	listOfTabs.push(new VillanelleWindowTabClass('Blocks', false, null));
	
	listOfTabs.push(new VillanelleWindowTabClass('Play', false, null));
	
	listOfTabs.push(new VillanelleWindowTabClass('Tree Visualizer', false, null));
	
	
	let halfDiv = <Rnd default={{x:0, y:50, width:200, height:50,}} disableDragging={true} enableResizing={false}>{exampleTab} </Rnd>;
	let halfDiv2 = <Rnd default={{x:200, y:50, width:200, height:50,}} disableDragging={true} enableResizing={false}>exampleTab}</Rnd>;

	let newMain = new VillanelleWindowPaneClass(listOfTabs, 0, 0, windowWidth, windowHeight);
	
	
    return (
      <div>
        <Divider />
        <Divider />
        <Divider />
        <Divider />
        <Divider />
        <Divider />
        <Divider />
        <Divider />

		
        <VillanelleNavbar
          handler={this.setCurrentTab}
          currentTab={this.state.currentTab}
          fixToTop={this.state.currentTab === 'Script'}
          saveHandler={this.saveFile}
          saveAsHandler={this.saveAsFile}
          openHandler={this.openFile}
          currentFile={this.state.currentFile}
          unsaved={this.state.unsaved}
          reloadGameHandler={this.reloadGame}
        />
        {mainPage}
      </div>
    );
  }

  getSplitPane(windowWidth, windowHeight, leftPaneElement, rightPaneElement) {
    return <div>
      <Rnd
        default={{
          x: 0,
          y: 0,
          width: windowWidth / 2 + 200,
          height: windowHeight,
        }}
        disableDragging={true}
      >
        {leftPaneElement}
      </Rnd>
      <Rnd
        default={{
          x: windowWidth / 2 + 200,
          y: 0,
          width: windowWidth / 2 - 200,
          height: windowHeight,
        }}
        disableDragging={true}
      >
        {rightPaneElement}
      </Rnd>
    </div>
  }

  getErrorsByDataPath(errors) {
    var errorsByDataPath = {};
    errors.forEach(error => {
      var path = error.dataPath ? error.dataPath : "/";
      errorsByDataPath[path] = error;
    });

    return errorsByDataPath;
  }
  
  
  //The tooltip references a gear because orignally this was a mutation block that
  //could be extended for more agents. It turned out to be too confusing. 
  initBlocksForBlockly(){
	Blockly.Blocks['villanellprog'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("Initialization:");
    this.appendStatementInput("initialization")
        .setCheck("setVariable");
    this.appendDummyInput()
        .appendField("User Interaction:");
    this.appendStatementInput("userInteraction")
        .setCheck(["description", "userAction", "condition", "node"]);
	this.appendDummyInput()
        .appendField("Agents:");
	this.setNextStatement(true, "agent");
    this.setColour(120);
 this.setTooltip("To add new agents, select the gear and add additional agent blocks.");
 this.setHelpUrl("");
 
 /* The Mutator code was here, if you need it add it here */
  }
};


Blockly.Blocks['setvariable'] = {
  init: function() {
    this.appendValueInput("variableValue")
        .setCheck(["Boolean", "Number", "String"])
        .appendField("Set variable")
        .appendField(new Blockly.FieldTextInput("<var_name>"), "variableName")
        .appendField("to");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, "setvariable");
    this.setColour(65);
 this.setTooltip("");
 this.setHelpUrl("");
  }
};

Blockly.Blocks['description'] = {
  init: function() {
    this.appendValueInput("NAME")
        .setCheck("String")
        .appendField("Description");
    this.setPreviousStatement(true, ["description", "userAction", "condition", "node"]);
    this.setNextStatement(true, ["description", "userAction", "condition", "node"]);
    this.setColour(20);
 this.setTooltip("");
 this.setHelpUrl("");
  }
};

Blockly.Blocks['useraction'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("User Action");
    this.appendValueInput("actionText")
        .setCheck("String")
        .appendField("Action Text:");
    this.appendStatementInput("effects")
        .setCheck("setVariable")
        .appendField("Effects:");
    this.setPreviousStatement(true, ["description", "userAction", "condition", "node"]);
    this.setNextStatement(true, ["description", "userAction", "condition", "node"]);
    this.setColour(20);
 this.setTooltip("");
 this.setHelpUrl("");
  }
};

Blockly.Blocks['node'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown([["Selector","selector"], ["Sequence","sequence"]]), "type");
    this.appendStatementInput("body")
        .setCheck(["description", "userAction", "effectText", "condition", "effects"]);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(230);
 this.setTooltip("");
 this.setHelpUrl("");
  }
};

Blockly.Blocks['agent'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("Agent: ")
        .appendField(new Blockly.FieldTextInput("<agent_name>"), "name");
    this.appendStatementInput("body")
        .setCheck(["condition", "node"]);
    this.setPreviousStatement(true, "agent");
    this.setNextStatement(true, "agent");
    this.setColour(230);
 this.setTooltip("");
 this.setHelpUrl("");
  }
};

Blockly.Blocks['effecttext'] = {
  init: function() {
    this.appendValueInput("text")
        .setCheck("String")
        .appendField("Effect Text:");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, ["description", "userAction", "effectText", "condition", "node", "effects"]);
    this.setColour(230);
 this.setTooltip("");
 this.setHelpUrl("");
  }
};

Blockly.Blocks['effects'] = {
  init: function() {
    this.appendStatementInput("substatementList")
        .setCheck("setVariable")
        .appendField("Set Variables:");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, ["description", "userAction", "effectText", "condition", "node", "effects"]);
    this.setColour(230);
 this.setTooltip("");
 this.setHelpUrl("");
  }
};

Blockly.Blocks['getvariable'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("Var")
        .appendField(new Blockly.FieldTextInput("<var_name>"), "varName");
    this.setOutput(true, null);
    this.setColour(230);
 this.setTooltip("");
 this.setHelpUrl("");
  }
};

Blockly.Blocks['condition'] = {
  init: function() {
    this.appendValueInput("antecedent")
        .setCheck(null)
        .appendField("if");
    this.appendStatementInput("consequent")
        .setCheck(null)
        .appendField("do");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, ["description", "userAction", "effectText", "node", "effects"]);
    this.setColour(230);
 this.setTooltip("");
 this.setHelpUrl("");
  }
};




/*DO NOT OVERWRITE THIS
//Creating mutator for Villanelle Main Block
//Probably shouldn't add this to the logic pack, but at the moment not worried
VILLANELLE_MAIN_MUTATOR = {
  
  }
};

Blockly.Extensions.registerMutator('vill_main_mutator', VILLANELLE_MAIN_MUTATOR, null, ['agent']);*/
/*END DO NOT OVERWRITE THIS*/
//For Use in mutator:

Blockly.Blocks['main_vill'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("Initialization");
    this.appendDummyInput()
        .appendField("User Interaction");
    this.setNextStatement(true, null);
    this.setColour(230);
 this.setTooltip("");
 this.setHelpUrl("");
  }
};
Blockly.Blocks['new_agent'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("Agent");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(230);
 this.setTooltip("");
 this.setHelpUrl("");
  }
};
  }
	initGeneratorForBlockly(){

//In theory this should fix the indent problem
Blockly.JavaScript.INDENT = "    ";

Blockly.JavaScript['villanellprog'] = function(block) {
  var statements_initialization = 'Initialization:\r\n' + Blockly.JavaScript.statementToCode(block, 'initialization');
  //^ This is just a list of set variables, but it will need to be front appended with the necessary header
  
  var statements_userinteraction = 'User Interaction:\r\n' + Blockly.JavaScript.statementToCode(block, 'userInteraction');
  
  var code = statements_initialization + '\r\n' +  statements_userinteraction; // + '\r\n' + statements_agents;
  return code;
};


Blockly.JavaScript['setvariable'] = function(block) {
  var text_variablename = block.getFieldValue('variableName');
  var value_variablevalue = Blockly.JavaScript.valueToCode(block, 'variableValue', Blockly.JavaScript.ORDER_ATOMIC);

  var code = '- ' + text_variablename.replace(/\s/g, '') + " := " + value_variablevalue+ '\r\n';
  return code;
};

Blockly.JavaScript['description'] = function(block) {
  var value_name = Blockly.JavaScript.valueToCode(block, 'NAME', Blockly.JavaScript.ORDER_ATOMIC);

  var code = '- description: ' + value_name + '\r\n';
  return code;
};

Blockly.JavaScript['node'] = function(block) {
  var dropdown_type = block.getFieldValue('type');
  var statements_body = Blockly.JavaScript.statementToCode(block, 'body');

  var finalStatement = '';
	
  var statementsArray = statements_body.split('\r\n');
  var proceed = true;
  if(statementsArray.length > 0){
	  if(statementsArray[0].search('effect text') != -1)
		  finalStatement += statementsArray[0].replace('effect text', '- effect text') + '\r\n';
	  else if(statementsArray[0].search('effects') != -1)
		  finalStatement += statementsArray[0].replace('effects', '- effects') + '\r\n';
	  else{
		  finalStatement += statementsArray[0] + '\r\n';
		  finalStatement += statementsArray[1] + '\r\n';
		  proceed = false;
	  }
	  
	  if(statementsArray.length > 1 && proceed){
		  	  if(statementsArray[1].search('effect text') != -1)
		  finalStatement += statementsArray[1].replace('effect text', '- effect text') + '\r\n';
	  else if(statementsArray[1].search('effects') != -1)
		  finalStatement += statementsArray[1].replace('effects', '- effects') + '\r\n';
	  else
		  finalStatement += statementsArray[1] + '\r\n';
	  }
  }
 
	for(var i = 2; i < statementsArray.length; i++){
		finalStatement += statementsArray[i] + '\r\n';
	}

  var code = '- ' + dropdown_type + ':\r\n' + finalStatement;
  return code;
};

Blockly.JavaScript['useraction'] = function(block) {
  var value_actiontext = Blockly.JavaScript.valueToCode(block, 'actionText', Blockly.JavaScript.ORDER_ATOMIC);
  var statements_effects = Blockly.JavaScript.statementToCode(block, 'effects');
	console.log(statements_effects);
  var statementsArray = statements_effects.split('\r\n');
  var resulting = '';
    if(statementsArray.length > 0){
	  resulting += statementsArray[0].replace('- effects:', 'effects:').replace('- effect text:', 'effect text:') + '\r\n';
  }
  for(var i = 1; i < statementsArray.length; i++){
	resulting += '    ' + statementsArray[i].replace('- effects:', 'effects:').replace('- effect text:', 'effect text:') + '\r\n';
  }
  var code = '- user action:\r\n    action text: ' + value_actiontext + '\r\n    effect tree:\r\n    ' + resulting;//+ statements_effects.replace('- effects: \r\n', 'effects: \r\n    ').replace('- effect text: \r\n', 'effect text: \r\n    ');
  return code;
};

Blockly.JavaScript['effecttext'] = function(block) {
  var value_text = Blockly.JavaScript.valueToCode(block, 'text', Blockly.JavaScript.ORDER_ATOMIC);

  var code = '- effect text: ' + value_text + '\r\n';
  return code;
};

Blockly.JavaScript['effects'] = function(block) {
  var statements_substatementlist = Blockly.JavaScript.statementToCode(block, 'substatementList');
  
  var code = '- effects: \r\n' + statements_substatementlist;
  return code;
};

Blockly.JavaScript['agent'] = function(block) {
  var text_name = block.getFieldValue('name');
  var statements_body = Blockly.JavaScript.statementToCode(block, 'body');
  
  //The first instance of '- ' needs to be removed. Condition, handles if the child has it
  statements_body = statements_body.replace('- ', '');
  
  var code = text_name + ':\r\n' + statements_body;
  return code;
};

Blockly.JavaScript['new_agent'] = function(block) {
  var text_name = block.getFieldValue('name');
  var statements_body = Blockly.JavaScript.statementToCode(block, 'body');
  
  //The first instance of '- ' needs to be removed. Condition, handles if the child has it
  statements_body.replace('- ', '');
  
  var code = text_name + '(Test):\r\n' + statements_body;
  return code;
};

Blockly.JavaScript['getvariable'] = function(block) {
  var text_varname = block.getFieldValue('varName');
  var code = text_varname;
  return [code, Blockly.JavaScript.ORDER_ATOMIC];
};

Blockly.JavaScript['condition'] = function(block) {
  var value_antecedent = Blockly.JavaScript.valueToCode(block, 'antecedent', Blockly.JavaScript.ORDER_ATOMIC);
  var statements_consequent = Blockly.JavaScript.statementToCode(block, 'consequent');

  //Because Conditions are unique in how they want Effects to be formated, gotta find and fix those effects and effect text
  //Here's my fix
  var statements_consequent_fixed = '';
  if(statements_consequent !== null){
	  var statementsArray = statements_consequent.split('\r\n');
	  for(var i = 0; i < statementsArray.length; i++){
		  if(statementsArray[i].substring(0, 6) == '    - ')
			  statements_consequent_fixed += statementsArray[i].replace('    - ', '  ') + '\r\n';
		  else
			  statements_consequent_fixed += statementsArray[i].replace('    ', '  ') + '\r\n';
		
	  }
  }
  var code = '- condition: ' + value_antecedent + '\r\n' + statements_consequent_fixed;
  return code;
};

//Override the logic_operation definition for use in Villanelle
Blockly.JavaScript['logic_operation'] = function(block) {
  // Operations 'and', 'or'.
  var operator = (block.getFieldValue('OP') == 'AND') ? 'and' : 'or';
  var order = (operator == 'and') ? Blockly.JavaScript.ORDER_LOGICAL_AND :
      Blockly.JavaScript.ORDER_LOGICAL_OR;
  var argument0 = Blockly.JavaScript.valueToCode(block, 'A', order);
  var argument1 = Blockly.JavaScript.valueToCode(block, 'B', order);
  if (!argument0 && !argument1) {
    // If there are no arguments, then the return value is false.
    argument0 = 'false';
    argument1 = 'false';
  } else {
    // Single missing arguments have no effect on the return value.
    var defaultArgument = (operator == 'and') ? 'true' : 'false';
    if (!argument0) {
      argument0 = defaultArgument;
    }
    if (!argument1) {
      argument1 = defaultArgument;
    }
  }
  var code = argument0 + ' ' + operator + ' ' + argument1;
  return [code, order];
};


	}
}
