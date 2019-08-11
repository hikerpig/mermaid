/** mermaid
 *  https://mermaidjs.github.io/
 *  MIT license.
 */
%lex

%options case-insensitive

// Special states for recognizing aliases
%x ID
%x ALIAS

// A special state for grabbing text up to the first comment/newline
%x LINE

%%

[\n]+                            return 'NL';
\s+                              /* skip all whitespace */
<ID,ALIAS,LINE>((?!\n)\s)+       /* skip same-line whitespace */
<INITIAL,ID,ALIAS,LINE>\#[^\n]*  /* skip comments */
\%%[^\n]*                        /* skip comments */
<LINE>[^#\n;]*    { this.popState(); return 'restOfLine'; }
"{"               return 'LEFT_CURLY'
"}"               return 'RIGHT_CURLY'
"end"             return 'END';
"left of"         return 'LEFT_OF';
"right of"        return 'RIGHT_OF';
"note"            return 'NOTE';
"fork"            return 'FORK';
"state"           return 'STATE_KEYOWRD';
","               return ',';
";"               return 'NL';
"stateDiagram"    return 'DIAGRAM_START';
":"([^#\n;]+)     { yytext = yy.lexer.matches[1].trim(); return 'TEXT_AFTER_COLON'; }
[^\+\->\n,;:{}]+    { yytext = yytext.trim(); return 'STATE'; }
"->>"             return 'SOLID_ARROW';
"-->>"            return 'DOTTED_ARROW';
"->"              return 'SOLID_OPEN_ARROW';
"-->"             return 'DOTTED_OPEN_ARROW';
"+"               return '+';
"-"               return '-';
<<EOF>>           return 'NL';
.                 return 'INVALID';

/lex

%left '^'

%start start

%% /* language grammar */

start
	: SPACE start
	| NL start
	| DIAGRAM_START document { yy.apply($2); return $2; }
	;

document
	: /* empty */ { $$ = [] }
  | document composite_state
	| document line {$1.push($2); $$ = $1}
	;

line
	: SPACE statement { $$ = $2 }
	| statement { $$ = $1 }
	| NL { $$=[];}
	| EOF { $$=[];}
  ;

statement
	: transition 'NL'
	| STATE TEXT_AFTER_COLON 'NL' { yy.apply({type: 'addState', name:$1, description: $2 }); $$ = $1 }
  ;

transition
  : state transition_type state TEXT_AFTER_COLON {yy.apply({type: 'addTransition', from: $1, to: $3, description: $4});}
  | state transition_type state {$$={type: 'addTransition', from: $1, to: $3}}
  ;

transition_type
	: SOLID_OPEN_ARROW  { $$ = yy.LINETYPE.SOLID_OPEN; }
	| DOTTED_OPEN_ARROW { $$ = yy.LINETYPE.DOTTED_OPEN; }
	| SOLID_ARROW       { $$ = yy.LINETYPE.SOLID; }
	| DOTTED_ARROW      { $$ = yy.LINETYPE.DOTTED; }
	;

composite_start
  : STATE_KEYOWRD state { yy.manipStateStack('push', $2) }
  ;

composite_state
  : composite_start LEFT_CURLY document RIGHT_CURLY { yy.manipStateStack('pop') }
  ;

state
	: STATE { yy.apply({type: 'addState', name:$1}); $$ = $1 }
  ;

