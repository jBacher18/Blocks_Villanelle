import { EditableText } from '@blueprintjs/core';
import { Button, Card, Code, Elevation, H5, Icon, Intent, ITreeNode, Tag, Tooltip, Tree, IconName } from '@blueprintjs/core';
import * as React from 'react';


export class VillanelleWindowTabClass
{
	isActive: boolean;
	name: string;
	childPanel: any;
	
	constructor(name, isActive, childPanel){
		this.isActive = isActive;
		this.name = name;
		this.childPanel = childPanel;
	}
	
	getComponent(){
		var isActive = this.isActive, name = this.name, childPanel = this.childPanel;
		return <VillanelleWindowTab name={name} isActive={isActive} childPanel={childPanel} />;
	}
}

export class VillanelleWindowTab extends React.Component<{
	name: string,
	isActive: boolean,
	childPanel: any,
}, {
	name: string,
	isActive: boolean,
	childPanel: any
}> {
    constructor(props) {
        super(props);
		
        this.handleChange = this.handleChange.bind(this);
        this.checkIfTabPressed = this.checkIfTabPressed.bind(this);
        this.compile = this.compile.bind(this);
		
    }
	
	public getState(){
		return this.state;
	}
	
	setActive(){
		this.props.isActive = !this.props.isActive;
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
		let returnElement = <Card interactive={true} elevation={Elevation.ZERO}>
				<h5>{this.props.name}</h5>
				<Button>Make Active</Button>
			</Card>;
		if(this.props.isActive){
			returnElement = <Card interactive={true} elevation={Elevation.FOUR}>
				<h5>{this.props.name}</h5>
				<Button>Make Active</Button>
			</Card>;
		}
        return returnElement;
    }
}