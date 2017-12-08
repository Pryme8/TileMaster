TM = TM || {};

TM.EDITOR = function(){
	this._tasks = [];
	this._project = null;	
	this._init();	
	return this;
}

TM.EDITOR.prototype = {
	_init : function(){		
		this._bindings();		
		console.log("TileMaster - Editor Started!");
	},
	_bindings : function(){
		var self = this;
		document.body.addEventListener('click', (e)=>{
			var act = e.target.getAttribute('click-act');
			if((act)&& TM.EDITOR.ACTS[act]){
				TM.EDITOR.ACTS[act](e, self);
			}
		}, false);
		document.body.addEventListener('change', (e)=>{
			var act = e.target.getAttribute('change-act');
			if((act)&& TM.EDITOR.ACTS[act]){
				TM.EDITOR.ACTS[act](e, self);
			}
		}, false);	
		
	}	
};


TM.EDITOR.ACTS = {
	'change-pane' : function(e, parent){
		var el = e.target;
		var t = el.getAttribute('t');
		TM.EDITOR.ACTS['close-pane'](e);
		TM.EDITOR.ACTS['open-pane'](t);
	},
	'close-pane' : function(e){
		var el = e.target;
		var kickout = 0;
		while(!el.classList.contains('pane') && kickout < 12){
			el = el.parentNode;
			kickout++;
		}
		el.classList.remove('active');
	},
	'open-pane' : function(t){
		var t = document.getElementById(t);
		if(t){t.classList.add('active')};		
	},
	'confirm-new-project' : function(e, parent){
		var name = (document.getElementById('project-name')).value || "New Project";
		var p = new TM.PROJECT();
		p.name = name;
		parent._project = p;
		TM.EDITOR.ACTS['close-pane'](e);		
	}	
};










