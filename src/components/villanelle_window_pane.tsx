import { EditableText } from '@blueprintjs/core';
import { Button, Card, Code, Elevation, H5, Icon, Intent, ITreeNode, Tag, Tooltip, Tree, IconName } from '@blueprintjs/core';
import * as React from 'react';
import { VillanelleWindowTab } from './villanelle_window_tab';
import { VillanelleWindowTabClass } from './villanelle_window_tab';
import { Rnd } from "react-rnd";

export class VillanelleWindowPaneClass
{
	childTabs: Array<VillanelleWindowTabClass>;
	xLoc: number;
	yLoc: number;
	width: number;
	height: number;
	
	constructor(childTabs: Array<VillanelleWindowTabClass>, xLoc: number, yLoc: number, width: number, height: number){
		this.childTabs = childTabs;
		this.xLoc = xLoc;
		this.yLoc = yLoc;
		this.width = width;
		this.height = height;
	}
	
	getComponent(){
		let listOfTabs = new Array();
		let activeIndex = -1;
		for( var i = 0; i < this.childTabs.length; i++){
			if(this.childTabs[i].isActive) activeIndex = i;
		}
		if(activeIndex == -1) {
			activeIndex = 0;
			this.childTabs[0].isActive = true;
		}
		for( var i = 0; i < this.childTabs.length; i++){
			listOfTabs.push(this.childTabs[i].getComponent());
		}
		

		console.log(listOfTabs);
		let activePanel = this.childTabs[activeIndex].childPanel;
		
		var xLoc = this.xLoc, yLoc = this.yLoc, width = this.width, height = this.height;
		return <VillanelleWindowPane childTabs={listOfTabs} xLoc={xLoc} yLoc={yLoc} width={width} height={height} activeTab={activePanel} />;
	}
}

export class VillanelleWindowPane extends React.Component<{
	childTabs: Array<VillanelleWindowTab>,
	xLoc: number,
	yLoc: number,
	width: number,
	height: number,
	activePanel: any
},{
	childTabs: Array<VillanelleWindowTab>,
	xLoc: number,
	yLoc: number,
	width: number,
	height: number
}> {
    constructor(props) {
        super(props);
		this.state = {
            childTabs: this.props.childTabs,
			xLoc: this.props.xLoc,
			yLoc: this.props.yLoc,
			width: this.props.width,
			height: this.props.height
        };
        this.handleChange = this.handleChange.bind(this);
        this.checkIfTabPressed = this.checkIfTabPressed.bind(this);
        this.compile = this.compile.bind(this);
    }

	getState(){
		return this.state;
	}

    handleChange(event) {
        //do something
    }

    compile(event) {
        console.log('Compiled');
    }

    checkIfTabPressed(event) {
        /*
            if(event.keyCode===9)
                {var v=this.value,s=this.selectionStart,e=this.selectionEnd;
                    this.value=v.substring(0, s)+'    '+v.substring(e);
                    this.selectionStart=this.selectionEnd=s+1;return false;}
        */
        if (event.keyCode === 81) {
            console.log('Tab');
        }
    }

    render() {
		//The general gist is that we need to reserve some space
		//at the top of the area for the navbar-tabs, the rest holds the activeTabs Content
		
		let childTabs = this.props.childTabs;
		//Construct Rnd components holding cards inside the nav bar div
		let TabsBar:Array<Rnd> = new Array();
		//console.log(TabsBar);
		var offset = 10, xSize = this.props.width / childTabs.length;
		xSize -= offset * childTabs.length;
		if(xSize > 200) xSize = 200;
		
		
		//ReferenceVars
		var yLoc = this.props.yLoc, xLoc:number = this.props.xLoc, thisWidth = this.props.width, thisHeight = this.props.height;
		console.log(childTabs);
		for( var i = 0; i < childTabs.length; i++){
			var newX:number = this.props.xLoc + ( i * (xSize + offset));
			console.log(newX);
			let newRnd = <Rnd default={{x:newX, y:yLoc, width:xSize, height:50,}} disableDragging={true} enableResizing={false}>{childTabs[i]} </Rnd>;
			console.log(newRnd);
			TabsBar.push(newRnd);
		}
		var actPanel = this.props.activePanel;
		console.log(this.props.xLoc);
		let ContentWindow = <div> 
		<Rnd default={{x:xLoc, y:yLoc + 50, width:thisWidth, height:thisHeight - 50,}} disableDragging={true} enableResizing={false}>
			{actPanel}
		</Rnd>
		</div>;
        return (
           <div>
				<div> {TabsBar} </div>
				{ContentWindow}
		   </div>
        );
    }
}