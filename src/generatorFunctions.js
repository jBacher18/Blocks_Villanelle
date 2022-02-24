// Just writing up some functions, not sure where I'm going to put them yet

//In theory this should fix the indent problem
Blockly.JavaScript.INDENT = "    ";

Blockly.JavaScript['villanellprog'] = function(block) {
  var statements_initialization = 'Initialization:\r\n' + Blockly.JavaScript.statementToCode(block, 'initialization');
  //^ This is just a list of set variables, but it will need to be front appended with the necessary header
  
  var statements_userinteraction = 'User Interaction:\r\n' + Blockly.JavaScript.statementToCode(block, 'userInteraction');
  
  
  //Fixing indentation problem REMOVE IF YOU MODIFY THE MAIN VILLANELLE BLOCK
  var statements_agents = '';
  for(var i = 1; i <= block.agentCount_; i++){
	  statements_agents += block.getFieldValue('agentName' + i) + ':\r\n' + Blockly.JavaScript.statementToCode(block, 'AGENT' + i);
  }
  //statements_agents = statements_agents.substring(2);
  // TODO: Assemble JavaScript into code variable.
  var code = statements_initialization + '\r\n' +  statements_userinteraction + '\r\n' + statements_agents;
  return code;
};


Blockly.JavaScript['setvariable'] = function(block) {
  var text_variablename = block.getFieldValue('variableName');
  var value_variablevalue = Blockly.JavaScript.valueToCode(block, 'variableValue', Blockly.JavaScript.ORDER_ATOMIC);

  var code = '- ' + text_variablename.replace(/\s/g, '') + " := " + value_variablevalue + '\r\n';
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

  var code = '' + dropdown_type + ':\r\n' + statements_body;
  return code;
};

Blockly.JavaScript['useraction'] = function(block) {
  var value_actiontext = Blockly.JavaScript.valueToCode(block, 'actionText', Blockly.JavaScript.ORDER_ATOMIC);
  var statements_effects = Blockly.JavaScript.statementToCode(block, 'effects');

  var code = '- user action:\r\n    action text: ' + value_actiontext + '\r\n    effect tree:\r\n    ' + statements_effects.replace('effects: \r\n', 'effects: \r\n    ');
  return code;
};

Blockly.JavaScript['effecttext'] = function(block) {
  var value_text = Blockly.JavaScript.valueToCode(block, 'text', Blockly.JavaScript.ORDER_ATOMIC);

  var code = 'effect text: ' + value_text + '\r\n';
  return code;
};

Blockly.JavaScript['effects'] = function(block) {
  var statements_substatementlist = Blockly.JavaScript.statementToCode(block, 'substatementList');
  
  var code = 'effects: \r\n' + statements_substatementlist;
  return code;
};

Blockly.JavaScript['agent'] = function(block) {
  var text_name = block.getFieldValue('name');
  var statements_body = Blockly.JavaScript.statementToCode(block, 'body');
  
  
  var code = text_name + ':TEST\r\n' + statements_body;
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

  //Because Conditions are unique in how they want Effects to be formated, gotta find a fix those effects and effect text
  //Here's my fix
  var statements_consequent_fixed = '';
  if(statements_consequent !== null){
	  var statementsArray = statements_consequent.split('\r\n');
	  for(var i = 0; i < statementsArray.length; i++){
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