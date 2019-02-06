import * as yaml from 'js-yaml';
import * as jsonschema from 'jsonschema';
import * as fs from 'fs';
import * as path from 'path';
import * as scripting from '../../scripting';
import * as antlr_parser from '../../parsing/antlr/antlr_parser';

let reservedKeywords = ['Initialization', 'User Interaction'];

let schema = {
    description: "Schema for villanelle yaml scripting",
    type: "object",
    required: ["Initialization", "User Interaction"],
    properties: {
        "Initialization": {
            type: "array",
            minItems: 1,
            items: {
                type: "string"
            },
            uniqueItems: true
        },
        "User Interaction": {
            type: "array",
            minItems: 1,
            items: {
                type: "object"
            },
            uniqueItems: true
        }
    },
    additionalProperties: {
        "$ref": "#/definitions/treeNode"
    },
    definitions: {
        userInteraction: {},
        treeNode: {
            anyOf: [
                { "$ref": "#/definitions/sequenceNode" },
                { "$ref": "#/definitions/selectorNode" },
                { "$ref": "#/definitions/actionNode" },
            ]
        },
        sequenceNode: {
            type: "object",
            required: ["sequence"],
            properties: {
                "sequence": { "$ref": "#/definitions/arrayNode" },
                "condition": { type: "string" }
            },
            additionalProperties: false
        },
        selectorNode: {
            type: "object",
            required: ["selector"],
            properties: {
                "selector": { "$ref": "#/definitions/arrayNode" },
                "condition": { type: "string" }
            },
            additionalProperties: false
        },
        actionNode: {
            type: "object",
            required: ["effects", "ticks"],
            properties: {
                "effects": {
                    type: "array",
                    items: {
                        type: "string"
                    }
                },
                "ticks": { type: "number" },
                "effect text": { type: "string" },
                "condition": { type: "string" }
            },
            additionalProperties: false
        },
        arrayNode: {//sequence or selector
            type: "array",
            items: {
                "$ref": "#/definitions/treeNode"
            }
        }
    }
}

export function parse() {
    try {
        var doc = yaml.safeLoad(fs.readFileSync(path.resolve(__dirname, "./test_error.yml"), 'utf8'));

        var validator = new jsonschema.Validator();
        console.log(validator.validate(doc, schema));

        for (let key in doc) {
            if (!reservedKeywords.includes(key)) {
                let agent = scripting.addAgent(key);
                var tree = visitObject(doc[key]);
                scripting.attachTreeToAgent(agent, tree);
            }
        }

        if (doc['Initialization'] !== undefined) {
            let initializationLambda = () => visitEffects(doc['Initialization']).forEach(lambda => lambda());
            initializationLambda();
        }

        if (doc['User Interaction'] !== undefined) {
            var userInteractionArr = doc['User Interaction'];
            userInteractionArr.forEach(interactionObj => scripting.addUserInteractionTree(visitObject(interactionObj)));
        }

        scripting.initialize();
        scripting.worldTick();
    } catch (e) {
        console.log(e);
    }
}

function visitObject(obj: {}) {

    let condition = obj['condition'] !== undefined;
    let sequence = obj['sequence'] !== undefined;
    let selector = obj['selector'] !== undefined;
    let effects = obj['effects'] !== undefined;
    let effectsText = obj['effect text'] !== undefined;

    var conditionLambda: () => boolean = () => true;
    if (condition) {
        //get condition here
        conditionLambda = visitCondition(obj['condition']);
    }

    //user interaction
    let description = obj['description'] !== undefined;
    if (description) {
        let descriptionAction = scripting.displayDescriptionAction(obj['description']);
        return condition ? scripting.guard(conditionLambda, descriptionAction) : descriptionAction;
    }
    let userAction = obj['user action'] !== undefined;
    if (userAction) {
        let userAction = visitUserAction(obj['user action']);
        return condition ? scripting.guard(conditionLambda, userAction) : userAction;
    }

    var sequenceOrSelectorTick;
    if (sequence && selector) {
        //TODO add error check to see if only one of sequence, selector, effects is true
        throw new Error('Cannot have both sequence and selector as keys.')
    } else if (sequence) {
        sequenceOrSelectorTick = scripting.sequence(visitArray(obj['sequence']));
    } else if (selector) {
        sequenceOrSelectorTick = scripting.selector(visitArray(obj['selector']));
    }

    var effectsLambda;
    if (effects) {
        var lambdas = visitEffects(obj['effects']);
        if (effectsText) {
            lambdas.push(() => scripting.displayActionEffectText(obj['effect text']));
        }
        effectsLambda = () => lambdas.forEach(lambda => lambda());
    }

    if (condition) {
        //action
        if (effects) {
            return scripting.action(conditionLambda, effectsLambda, obj['ticks']);
        } else {//guard
            return scripting.guard(conditionLambda, sequenceOrSelectorTick);
        }
    } else if (effects) { //action without condition
        return scripting.action(() => true, effectsLambda, obj['ticks']);
    } else {
        return sequenceOrSelectorTick;
    }
}

function visitArray(arr: []): any[] {
    return arr.map(obj => visitObject(obj));
}

function visitEffects(arr: []) {
    if (arr !== null) {
        let statements = arr.join('\n');
        return antlr_parser.parseEffects(statements + "\n");
    } else {//no effects, no-op
        return [];
    }
}

function visitCondition(conditionExpression): () => boolean {
    return antlr_parser.parseCondition(conditionExpression + "\n");
}

function visitUserAction(userActionObj) {
    let actionText = userActionObj['action text'];
    let effectTree = visitObject(userActionObj['effect tree']);

    return scripting.addUserActionTree(actionText, effectTree);
}