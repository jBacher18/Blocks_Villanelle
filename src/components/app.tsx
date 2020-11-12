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

//console.log(Blockly);

//ProceduralTest
import { VillanelleWindowTab } from './villanelle_window_tab';
import { VillanelleWindowPane } from './villanelle_window_pane';
import { VillanelleWindowTabClass } from './villanelle_window_tab';
import { VillanelleWindowPaneClass } from './villanelle_window_pane';

import { ipcRenderer } from 'electron';

var electron = require('electron');

var remote = require('electron').remote;
var dialog = remote.dialog;

var Mousetrap = require('mousetrap');

//console.log(ReactBlockly);

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
  currentXML: string
}> {
  constructor(props) {
    super(props);
	
	
    //var yamlString = fs.readFileSync(path.resolve(__dirname, "../parsing/yaml/weird_city_interloper.yml"), 'utf8');
    var yamlString = '';
    var initializedObject = this.initializeGame(yamlString);
    this.state = {
	  currentTabOne: 'Script',
	  currentTabTwo: 'Tree',
      code: yamlString,
      errors: this.getErrorsByDataPath(initializedObject.errors),
      doc: initializedObject.doc,
      nodeIdToDatapathMap: initializedObject.nodeIdToDatapathMap,
      nodeIdStatusMap: initializedObject.nodeIdStatusMap,
      rootNodeDatapaths: initializedObject.rootNodeDatapaths,
      currentFile: "[New file]",
      fileOpened: false,
      unsaved: false,
      currentFilePath: "",
	  toolboxCategories: [],
	  currentXML: ""
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
	this.blocklyWorkspaceDidChange = this.blocklyWorkspaceDidChange.bind(this);
	
	this.initBlocksForBlockly();
	

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
	if(navID === 'one'){
		//Save code in the on-change method for the blocks component
		this.setState({ currentTabOne: currentTab});
	}
	else if(navID === 'two'){
		
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

    fs.writeFile(this.state.currentFilePath, this.state.code, (err) => {
      if (err) {
        alert(err);
        console.log(err);
        return;
      }
      this.setState({ unsaved: false });
    })
  }

  public saveAsFile() {
    dialog.showSaveDialog(null, {}, (filepath) => {
      if (filepath === undefined) {
        alert("You didn't save the file");
        return;
      }

      if (!filepath.endsWith(".yml")) {
        filepath += ".yml"
      }

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
      })
    })
  }

  public openFile() {
    dialog.showOpenDialog(null, {
      filters: [{ name: 'YAML files', extensions: ['yml'] }]
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

        this.setCode(data);
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
	
	//Need, going to update both 
	//How to deal with special case where two block workspaces are open?
	//Maybe just call render?
	//That didn't work 
	console.log("saving");
	//console.log(xmlCode);
  }
  
  public getPageAtID(currID, windowWidth, windowHeight){
	  
	let refTab, name;
	if(currID === 'one'){
		refTab = this.state.currentTabOne;
		name = "Tab One";
	}
	else{
		refTab = this.state.currentTabTwo;
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
		//Add later
		//console.log("Rendering for " + currID);
		//console.log(this.state.currentXML);
		let newXML = this.state.currentXML
		let reactBlocks = <ReactBlockly 
			toolboxCategories={[{"name":"Villanelle Main","colour":"#5C81A6","blocks":[{"type":"villanellprog"}]},{"name":"Initialization","colour":"#5C81A6","blocks":[{"fields":{"variableName":"<var_name>"},"type":"setvariable"}]},{"name":"User Interaction","colour":"#5C81A6","blocks":[{"type":"description"},{"type":"useraction"},{"fields":{"type":"selector"},"type":"node"},{"type":"condition"}]},{"name":"Agents","colour":"#5C81A6","blocks":[{"fields":{"type":"selector"},"type":"node"},{"type":"condition"},{"type":"effecttext"},{"type":"effects"}]},{"name":"Effects","colour":"#5C81A6","blocks":[{"statements":{"substatementList":{"fields":{"variableName":"<var_name>"},"type":"setvariable","shadow":false}},"type":"effects"},{"fields":{"variableName":"<var_name>"},"type":"setvariable"}]},{"name":"Text","colour":"#5C81A6","blocks":[{"fields":{},"type":"text"},{"mutation":{"attributes":{"items":"2"}},"type":"text_join"},{"fields":{"varName":"<var_name>"},"type":"getvariable"}]},{"name":"Logic","colour":"#5C81A6","blocks":[{"fields":{"OP":"EQ"},"type":"logic_compare"},{"fields":{"OP":"AND"},"type":"logic_operation"},{"type":"logic_negate"},{"fields":{"BOOL":"TRUE"},"type":"logic_boolean"},{"fields":{"varName":"<var_name>"},"type":"getvariable"}]}]}
			wrapperDivClassName="fill-height"
			workspaceDidChange={this.blocklyWorkspaceDidChange}
			initialXml={newXML}
		/>
		//test
		//console.log(reactBlocks);
		

		
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
		//something
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
		//This one is unique, it should be colored if a play attempt is going on
		//I'll do it later
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
	
	console.log('Reached improper end');
  }

  render() {
    let mainPage, leftPage, rightPage;
    var screen = electron.screen.getPrimaryDisplay();
    let windowWidth = screen.size.width;
    let windowHeight = screen.size.height;
	
	let pageOne = this.getPageAtID('one', windowWidth, windowHeight), pageTwo = this.getPageAtID('two', windowWidth, windowHeight);
	//console.log('Page One and Two:');
	//console.log(pageOne);
	//console.log(pageTwo);
	
	mainPage = this.getSplitPane(windowWidth, windowHeight, pageOne, pageTwo);
	//console.log(mainPage);
    /*if (this.state.currentTab === 'Script') {
      let compilationResult = this.getCallout();

      let aceEditorPanel = <div>
        <VillanelleAceEditor
          handler={this.setCode}
          code={this.state.code}
          height={windowHeight - 200}
          saveHandler={this.saveFile}
          saveAsHandler={this.saveAsFile}
          openHandler={this.openFile}
        />
        {compilationResult}
      </div>;
      let treeVisualizerPanel = <VillanelleTreeVisualizer
        doc={this.state.doc}
        errors={this.state.errors}
        showDebugState={false} />

      mainPage = this.getSplitPane(windowWidth, windowHeight, aceEditorPanel, treeVisualizerPanel);

    } else if (this.state.currentTab === 'Play') {

      let uio = scripting.getUserInteractionObject();
      let hasErrors = Object.keys(this.state.errors).length != 0;
      if (hasErrors) {
        mainPage = <VillanellePlayArea hasErrors={true} uio={uio} handler={this.setNodeIdStatusMap} />;
      } else {
        let playAreaPanel = <VillanellePlayArea hasErrors={false} uio={uio} handler={this.setNodeIdStatusMap} />;
        let treeVisualizerPanel = <VillanelleTreeVisualizer
          doc={this.state.doc}
          errors={this.state.errors}
          showDebugState={true}
          nodeIdToDatapathMap={this.state.nodeIdToDatapathMap}
          nodeIdStatusMap={this.state.nodeIdStatusMap}
          rootNodeDatapaths={this.state.rootNodeDatapaths}
          dataPathToNodeStatusMap={this.dataPathToNodeStatusMap}
          dataPathToNodeIdMap={this.dataPathToNodeIdMap} />

        mainPage = this.getSplitPane(windowWidth, windowHeight, playAreaPanel, treeVisualizerPanel);
      }
    }*/


	//let exampleTab = <VillanelleWindowTab name='Example Tab' isActive={false} childPanel={null} />;
	let exampleTab = new VillanelleWindowTabClass('Example Tab', false, null);
	var listOfTabs:Array<number> = new Array();
	
	//let compilationResult = this.getCallout();
	/*let newEditor = <div>
        <VillanelleAceEditor
          handler={this.setCode}
          code={this.state.code}
          height={windowHeight - 200}
          saveHandler={this.saveFile}
          saveAsHandler={this.saveAsFile}
          openHandler={this.openFile}
        />
        {compilationResult}
      </div>;*/
	
	listOfTabs.push(new VillanelleWindowTabClass('Code', false, null));
	
	listOfTabs.push(new VillanelleWindowTabClass('Blocks', false, null));
	
	listOfTabs.push(new VillanelleWindowTabClass('Play', false, null));
	
	listOfTabs.push(new VillanelleWindowTabClass('Tree Visualizer', false, null));
	
	
	let halfDiv = <Rnd default={{x:0, y:50, width:200, height:50,}} disableDragging={true} enableResizing={false}>{exampleTab} </Rnd>;
	let halfDiv2 = <Rnd default={{x:200, y:50, width:200, height:50,}} disableDragging={true} enableResizing={false}>exampleTab}</Rnd>;

	let newMain = new VillanelleWindowPaneClass(listOfTabs, 0, 0, windowWidth, windowHeight);
	
	
	//mainPage = newMain.getComponent();
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
          width: windowWidth / 2,
          height: windowHeight,
        }}
        disableDragging={true}
      >
        {leftPaneElement}
      </Rnd>
      <Rnd
        default={{
          x: windowWidth / 2,
          y: 0,
          width: windowWidth / 2,
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
  
  
  //Copying code from a javascript file to a typescript file can't cause any problems, right?
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
    this.setColour(120);
 this.setTooltip("");
 this.setHelpUrl("");
 
 //NOTE: The following code will not be automatically generated by blockly's factory
 //therefore, make sure to be careful not to override it
	this.setMutator(new Blockly.Mutator(['main_vill', 'new_agent']));
  },
  agentCount_: 0,

  /**
   * Don't automatically add STATEMENT_PREFIX and STATEMENT_SUFFIX to generated
   * code.  These will be handled manually in this block's generators.
   */
  suppressPrefixSuffix: true,

  /**
   * Create XML to represent the number of else-if and else inputs.
   * @return {Element} XML storage element.
   * @this {Blockly.Block}
   */
  mutationToDom: function() {
    if (!this.agentCount_) {
      return null;
    }
    var container = Blockly.utils.xml.createElement('mutation');
    if (this.agentCount_) {
      container.setAttribute('agents', this.agentCount_);
    }
    
    return container;
  },
  /**
   * Parse XML to restore the else-if and else inputs.
   * @param {!Element} xmlElement XML storage element.
   * @this {Blockly.Block}
   */
  domToMutation: function(xmlElement) {
    this.agentCount_ = parseInt(xmlElement.getAttribute('agents'), 10) || 0;
    this.rebuildShape_();
  },
  /**
   * Populate the mutator's dialog with this block's components.
   * @param {!Blockly.Workspace} workspace Mutator's workspace.
   * @return {!Blockly.Block} Root block in mutator.
   * @this {Blockly.Block}
   */
  decompose: function(workspace) {
    var containerBlock = workspace.newBlock('main_vill');
    containerBlock.initSvg();
    var connection = containerBlock.nextConnection;
    for (var i = 1; i <= this.agentCount_; i++) {
      var agentBlock = workspace.newBlock('new_agent');
      agentBlock.initSvg();
      connection.connect(agentBlock.previousConnection);
      connection = agentBlock.nextConnection;
    }
	
    return containerBlock;
  },
  /**
   * Reconfigure this block based on the mutator dialog's components.
   * @param {!Blockly.Block} containerBlock Root block in mutator.
   * @this {Blockly.Block}
   */
  compose: function(containerBlock) {
    var clauseBlock = containerBlock.nextConnection.targetBlock();
    // Count number of inputs.
    this.agentCount_ = 0;

    var valueConnections = [null];
    var statementConnections = [null];
    var elseStatementConnection = null;
    while (clauseBlock) {
      switch (clauseBlock.type) {
        case 'new_agent':
          this.agentCount_++;
          valueConnections.push(clauseBlock.valueConnection_);
          statementConnections.push(clauseBlock.statementConnection_);
          break;
        default:
          throw TypeError('Unknown block type: ' + clauseBlock.type);
      }
      clauseBlock = clauseBlock.nextConnection &&
          clauseBlock.nextConnection.targetBlock();
    }
    this.updateShape_();
    // Reconnect any child blocks.
    this.reconnectChildBlocks_(valueConnections, statementConnections,
        elseStatementConnection);
  },
  /**
   * Store pointers to any connected child blocks.
   * @param {!Blockly.Block} containerBlock Root block in mutator.
   * @this {Blockly.Block}
   */
  saveConnections: function(containerBlock) {
    var clauseBlock = containerBlock.nextConnection.targetBlock();
    var i = 1;
    while (clauseBlock) {
      switch (clauseBlock.type) {
        case 'new_agent':
          var inputIf = this.getInput('AGENT' + i);
          clauseBlock.valueConnection_ =
              inputIf && inputIf.connection.targetConnection;
          i++;
          break;
        default:
          throw TypeError('Unknown block type: ' + clauseBlock.type);
      }
      clauseBlock = clauseBlock.nextConnection &&
          clauseBlock.nextConnection.targetBlock();
    }
  },
  /**
   * Reconstructs the block with all child blocks attached.
   * @this {Blockly.Block}
   */
  rebuildShape_: function() {
    var valueConnections = [null];
    var statementConnections = [null];

    var i = 1;
    while (this.getInput('AGENT' + i)) {
      var inputIf = this.getInput('AGENT' + i);
      statementConnections.push(inputIf.connection.targetConnection);
      i++;
    }
    this.updateShape_();
    this.reconnectChildBlocks_(valueConnections, statementConnections);
  },
  /**
   * Modify this block to have the correct number of inputs.
   * @this {Blockly.Block}
   * @private
   */
  updateShape_: function() {
    // Delete everything.

    var i = 1;
    while (this.getInput('AGENT' + i)) {
      this.removeInput('AGENT' + i);
      i++;
    }
    // Rebuild block.
    for (i = 1; i <= this.agentCount_; i++) {
      this.appendStatementInput('AGENT' + i)
          .setCheck(['condition', 'node'])
          .appendField('Agent')
		  .appendField(new Blockly.FieldTextInput("<agent_name>"), "agentName" + i);
    }

  },
  /**
   * Reconnects child blocks.
   * @param {!Array.<?Blockly.RenderedConnection>} valueConnections List of
   * value connections for 'if' input.
   * @param {!Array.<?Blockly.RenderedConnection>} statementConnections List of
   * statement connections for 'do' input.
   * @param {?Blockly.RenderedConnection} elseStatementConnection Statement
   * connection for else input.
   * @this {Blockly.Block}
   */
  reconnectChildBlocks_: function(valueConnections, statementConnections) {
    for (var i = 1; i <= this.agentCount_; i++) {
      Blockly.Mutator.reconnect(valueConnections[i], this, 'AGENT' + i);
    }
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
    this.setNextStatement(true, null);
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
        .setCheck(["description", "userAction", "effectText", "condition", "node", "effects"]);
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
    this.setNextStatement(true, null);
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
    this.setNextStatement(true, null);
    this.setColour(230);
 this.setTooltip("");
 this.setHelpUrl("");
  }
};

Blockly.Blocks['getvariable'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("Variable")
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
    this.setNextStatement(true, null);
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
}
