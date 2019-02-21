import * as yaml from 'js-yaml';
import * as antlr_parser from '../../parsing/antlr/antlr_parser';
import * as scripting from '../../scripting';

var Ajv = require('ajv');

let reservedKeywords = ['Initialization', 'User Interaction'];

let schema = {
    "$id": "root",
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
            uniqueItems: true,
            errorMessage: {
                type: "Initialization should be a list of expressions (at least one)"
            }
        },
        "User Interaction": {
            type: "array",
            minItems: 1,
            items: {
                "$ref": "root#/definitions/treeNode"
            },
            uniqueItems: true
        }
    },
    additionalProperties: {
        "$ref": "root#/definitions/treeNode"
    },
    definitions: {
        userInteraction: {},
        descriptionNode: {
            type: "object",
            properties: { "description": { type: "string" } },
            additionalProperties: false,
            errorMessage: "description must be a string"
        },
        actionTextNode: {
            type: "string",
            errorMessage: "action text must be a string"
        },
        userActionObject: {
            type: "object",
            properties: {
                "user action": { "$ref": "root#/definitions/userActionNode" },
                "condition": { type: "string" }
            },
            additionalProperties: false
        },
        userActionNode: {
            type: "object",
            required: ["action text", "effect tree"],
            properties: {
                "action text": { "$ref": "root#/definitions/actionTextNode" },
                "effect tree": { "$ref": "root#/definitions/treeNode" },
            },
            additionalProperties: false,
            errorMessage: {
                required: "'user action' must have 'action text' and 'effect tree' properties"
            }
        },
        treeNode: {
            'switch': [
                {
                    if: {
                        patternRequired: ['sequence']
                    },
                    then: { "$ref": "#/definitions/sequenceNode" }
                },
                {
                    if: {
                        patternRequired: ['selector']
                    },
                    then: { "$ref": "#/definitions/selectorNode" }
                },
                {
                    if: {
                        patternRequired: ['effects']
                    }, then: { "$ref": "root#/definitions/actionNode" }
                },
                {
                    if: {
                        patternRequired: ['description']
                    }, then: { "$ref": "root#/definitions/descriptionNode" }
                },
                {
                    if: {
                        patternRequired: ['user action']
                    }, then: { "$ref": "root#/definitions/userActionObject" }
                },
                { then: false }
            ],
            errorMessage: "Must have a sequence, selector, effects, description or user action keyword"
        },
        sequenceNode: {
            type: "object",
            required: ["sequence"],
            properties: {
                "sequence": { "$ref": "root#/definitions/arrayNode" },
                "condition": { type: "string" }
            },
            additionalProperties: false,
            errorMessage: {
                properties: {
                    condition: "Condition must be an expression string"
                }
            }
        },
        selectorNode: {
            type: "object",
            required: ["selector"],
            properties: {
                "selector": { "$ref": "root#/definitions/arrayNode" },
                "condition": { type: "string" }
            },
            additionalProperties: false,
            errorMessage: {
                properties: {
                    condition: "condition must be an expression string"
                }
            }
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
                "ticks": { type: "number", minimum: 0 },
                "effect text": { type: "string" },
                "condition": { type: "string" }
            },
            additionalProperties: false,
            errorMessage: {
                properties: {
                    "ticks": 'ticks is required and should be a non-negative number',
                    "effect text": 'effect text must be a string',
                    "condition": 'condition must be an expression string',
                    "effects": 'effects should be a list of expressions'
                }
            }
        },
        arrayNode: {//sequence or selector
            type: "array",
            items: {
                "$ref": "root#/definitions/treeNode"
            },
            errorMessage: 'Must be a list'
        }
    }
};

export function parse(yamlString: string) {
    try {
        var doc = yaml.safeLoad(yamlString);
    } catch (e) {
        return { doc: doc, errors: [{ dataPath: "/", message: "Incorrect YAML input" }] };
    }

    var ajv = new Ajv({ allErrors: true, jsonPointers: true });
    require('ajv-keywords')(ajv, ['switch', 'patternRequired']);
    require('ajv-errors')(ajv);
    var validate = ajv.compile(schema);
    var valid = validate(doc);
    let errors = []
    if (!valid) {
        errors = validate.errors;
    }

    for (let key in doc) {
        if (!reservedKeywords.includes(key)) {
            let agent = scripting.addAgent(key);
            var tree = visitObject(doc[key], errors, "/" + key);
            scripting.attachTreeToAgent(agent, tree);
        }
    }

    if (doc['Initialization'] !== undefined) {
        let initializationLambdas = visitEffects(doc['Initialization'], errors, '/Initialization');
        if (errors.length == 0)
            initializationLambdas.forEach(lambda => lambda());
    }

    if (doc['User Interaction'] !== undefined) {
        var userInteractionArr = doc['User Interaction'];
        if (Array.isArray(userInteractionArr))
            userInteractionArr.forEach(interactionObj => scripting.addUserInteractionTree(visitObject(interactionObj, errors, '/User Interaction')));
    }

    return { doc: doc, errors: errors };
}

function visitObject(obj: {}, errors: any[], dataPath: string) {

    if (obj) {
        let condition = obj['condition'] !== undefined;
        let sequence = obj['sequence'];
        let selector = obj['selector'];
        let effects = obj['effects'] !== undefined;
        let effectsText = obj['effect text'] !== undefined;

        var conditionLambda: () => boolean = () => true;
        if (condition) {
            //get condition here
            conditionLambda = visitCondition(obj['condition'], errors, dataPath + '/condition');
        }

        //user interaction
        if (obj['description']) {
            let descriptionAction = scripting.displayDescriptionAction(obj['description']);
            return condition ? scripting.guard(conditionLambda, descriptionAction) : descriptionAction;
        }
        let userAction = obj['user action'] !== undefined && obj['user action'] !== null;
        if (userAction) {
            let userAction = visitUserAction(obj['user action'], errors, dataPath + '/user action');
            return condition ? scripting.guard(conditionLambda, userAction) : userAction;
        }

        var sequenceOrSelectorTick;
        if (sequence && selector) {
            throw new Error('Cannot have both sequence and selector as keys.')
        } else if (sequence && Array.isArray(obj['sequence'])) {
            sequenceOrSelectorTick = scripting.sequence(visitArray(obj['sequence'], errors, dataPath + '/sequence'));
        } else if (selector && Array.isArray(obj['selector'])) {
            sequenceOrSelectorTick = scripting.selector(visitArray(obj['selector'], errors, dataPath + '/selector'));
        }

        var effectsLambda;
        if (effects) {
            var lambdas = visitEffects(obj['effects'], errors, dataPath + '/effects');
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
}

function visitArray(arr: [], errors: any[], dataPath: string): any[] {
    return arr.map((obj, index) => {
        if (obj !== null)
            return visitObject(obj, errors, dataPath + '/' + index)
    });
}

function visitEffects(arr: [], errors: any[], dataPath: string) {
    if (arr !== null) {
        let statements = arr.join('\n');
        if (statements === '') {
            return [];
        }
        let parseResult = antlr_parser.parseEffects(statements + "\n");
        if (parseResult.errors !== undefined) {
            parseResult.errors.forEach(error => {
                error.dataPath = dataPath + '/' + (error.dataPath - 1);
                //Overriding current antlr message as it is not clear enough
                error.message = "Error parsing expression";
                errors.push(error);
            });
            return [];
        } else {
            return parseResult.lambdas;
        }
    } else {//no effects, no-op
        return [];
    }
}

function visitCondition(conditionExpression, errors, dataPath: string): () => boolean {
    let parseResult = antlr_parser.parseCondition(conditionExpression + "\n");
    if (parseResult.errors !== undefined) {
        parseResult.errors.forEach(error => {
            error.dataPath = dataPath;
            error.message = "Correct condition expression required"
            errors.push(error)
        });
        return () => true;
    }
    return parseResult.lambda;
}

function visitUserAction(userActionObj, errors: any[], dataPath: string) {
    let actionText = userActionObj['action text'];
    let effectTree = visitObject(userActionObj['effect tree'], errors, dataPath + '/effect tree');

    return scripting.addUserActionTree(actionText, effectTree);
}