/*
 * Developed by J. Thomas Bacher, 2020
 * Utilizes Google's Blockly library to create a BlueprintJS/React Component to integrate Blockly into Villanelle
 * I am aware that the way I am handling this (creating two classes, one of which is essentially just an element
 * of the other) is probably not ideal, but my understanding of how to integrate Blockly into a system that wants to
 * rerender everything (and regenerate each component) is limited, and this seemed the best approach. 
 */
 
 
 export class VillanelleBlocklyWorkspace
{
	workspace: any;
	workspaceDiv: any;
	
	constructor(){
		this.workspaceDiv = <div id="blocklyDiv" style={{position: 'absolute'}}></div>;
		
		this.workspace = Blockly.inject(this.workspaceDiv, {toolbox: document.getElementById('toolbox')});
	}
	
	getComponent(){
		return this.workspaceDiv;
	}
}