import { Alignment, Button, Classes, Navbar, NavbarDivider, NavbarGroup, NavbarHeading, ButtonGroup } from '@blueprintjs/core';
import { ipcRenderer } from 'electron';
import * as React from 'react';



//Pane Nav bar -- Controls which tabs is displayed
export class VillanellePaneNavbar extends React.PureComponent<{
    handler: (string, string) => void,
    currentTab: string,
    fixToTop: boolean,
    saveHandler: () => void,
    saveAsHandler: () => void,
    openHandler: () => void,
    currentFile: string,
    unsaved: boolean,
    reloadGameHandler: () => void,
	id: string 
}> {

    public render() {

        var fileNameText = this.props.unsaved ? "Save " + this.props.currentFile + "*" : this.props.currentFile;

        return (
            <Navbar fixedToTop={true}/* fixedToTop={this.props.fixToTop} */>
                <NavbarGroup align={Alignment.LEFT}>
                    <NavbarHeading>Villanelle</NavbarHeading>
                    <NavbarDivider />
                    <Button className={Classes.MINIMAL} icon='code' text='Script' active={this.props.currentTab === 'Script'} onClick={() => {
                        this.props.handler('Script', this.props.id);
                    }} />
					<Button className={Classes.MINIMAL} icon='code' text='Blocks' active={this.props.currentTab === 'Block'} onClick={() => {
                        this.props.handler('Block', this.props.id);
                    }} />
                        <Button className={Classes.MINIMAL} icon='citation' text='Play' active={this.props.currentTab === 'Play'} onClick={() => {
                            this.props.handler('Play', this.props.id);
                        }} />
					<Button className={Classes.MINIMAL} icon='code' text='Tree Vis' active={this.props.currentTab === 'Tree'} onClick={() => {
                        this.props.handler('Tree', this.props.id);
                    }} />

                </NavbarGroup>
            </Navbar>
        );
    }
}