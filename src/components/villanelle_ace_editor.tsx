import * as React from 'react';
import AceEditor from 'react-ace';

require("brace/mode/yaml");
require("brace/theme/mono_industrial");
require("brace/ext/language_tools");
require('brace/ext/searchbox');
var ace = require("brace");
var langTools = ace.acequire("ace/ext/language_tools");

import { ipcRenderer } from 'electron';

export class VillanelleAceEditor extends React.Component<{
    code: string,
    handler: (string) => void,
    height: number,
    saveHandler: () => void,
    saveAsHandler: () => void,
    openHandler: () => void
}> {

    constructor(props) {
        super(props);
        this.onChange = this.onChange.bind(this);
    }

    onChange(newValue) {
        this.props.handler(newValue);
    }

    render() {

        //autocomplete
        var keywords = this.getKeywordsAutocompleteList();
        var villanelleKeywordsCompleter = {
            getCompletions: function (editor, session, pos, prefix, callback) {
                callback(null, keywords);
            }
        }
        langTools.setCompleters([langTools.textCompleter, villanelleKeywordsCompleter]);

        return <AceEditor
            ref="aceEditor"
            mode="yaml"
            theme="mono_industrial"
            fontSize={20}
            width={"100%"}
            height={this.props.height + "px"}
            onChange={this.onChange}
            onLoad={(editor: any) => {
                editor.focus();
                editor.getSession().setUseWrapMode(true);
                //editor.getSession().setAnnotations(this.getAnnotations);
            }}
            name="villanelle_ace_editor"
            value={this.props.code}
            editorProps={{ $blockScrolling: Infinity }}
            enableLiveAutocompletion={true}

            commands={[
                {
                    name: 'closeCommand',
                    bindKey: { win: 'Ctrl-w', mac: 'Command-w' },
                    exec: () => { ipcRenderer.send('closed') }
                },
                {
                    name: 'devToolsCommand',
                    bindKey: { win: 'Ctrl-i', mac: 'Command-i' },
                    exec: () => { ipcRenderer.send('toggleDevTools') }
                },
                {
                    name: 'devToolsCommand2',
                    bindKey: { win: 'Ctrl-Shift-i', mac: 'Command-Shift-i' },
                    exec: () => { ipcRenderer.send('toggleDevTools') }
                },
                {
                    name: 'saveCommand',
                    bindKey: { win: 'Ctrl-s', mac: 'Command-s' },
                    exec: () => { this.props.saveHandler() }
                },
                {
                    name: 'saveAsCommand',
                    bindKey: { win: 'Ctrl-Shift-s', mac: 'Command-Shift-s' },
                    exec: () => { this.props.saveAsHandler() }
                },
                {
                    name: 'openCommand',
                    bindKey: { win: 'Ctrl-o', mac: 'Command-o' },
                    exec: () => { this.props.openHandler() }
                }
            ]}
        />
    }

    getKeywordsAutocompleteList() {
        return [
            { caption: "sequence:", name: "sequence:", value: "sequence:", meta: "" },
            { caption: "selector:", name: "selector:", value: "selector:", meta: "" },
            { caption: "condition:", name: "condition:", value: "condition:", meta: "" },
            { caption: "effects:", name: "effects:", value: "effects:", meta: "" },
            { caption: "Initialization:", name: "Initialization:", value: "Initialization:", meta: "" },
            { caption: "ticks:", name: "ticks:", value: "ticks:", meta: "" },
            { caption: "effect text:", name: "effect text:", value: "effect text:", meta: "" },
            { caption: "User Interaction:", name: "User Interaction:", value: "User Interaction:", meta: "" },
            { caption: "description:", name: "description:", value: "description:", meta: "" },
            { caption: "action text:", name: "action text:", value: "action text:", meta: "" },
            { caption: "effect tree:", name: "effect tree:", value: "effect tree:", meta: "" },
            { caption: "user action:", name: "user action:", value: "user action:", meta: "" },
        ];
    }
}