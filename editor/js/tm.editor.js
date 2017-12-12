TM = TM || {};

TM.EDITOR = function(){
	this._tasks = [];
	this._delta = 0;
	this._editors = {
		main : {
			_active : false,
			dom : document.getElementById('main-editor'),
			_activeProject : null,
			_activeStage : null,
			_activePlane : null,
			_activeLayer : null
		},
		sheet : {
			_active : false,
			dom : document.getElementById('sheet-editor'),
			output : {},
			_tmsFlag : 0,
			offset : new BABYLON.Vector2(0, 0),
			zoom : 1.0,
			tileSize : 32.0,
			currentTile : new BABYLON.Vector2(-1,-1),

			canvas : document.getElementById('sheetEditCanvas'),
			previewCanvas: document.getElementById('sheetPreviewCanvas'),
			engine : null,
			mainScene : null,
			pScene : null
			
		}
		
	};


	this._init();
	return this;
}

TM.EDITOR.prototype = {
	_init : function(){
		this._startSheetEditor();
	
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
	},
	_startSheetEditor : function(){	
console.log(this);	
		var editor = this._editors.sheet;
			
		var engine = new BABYLON.Engine(editor.canvas, true);		  
		var scene = new BABYLON.Scene(engine);
		editor.scene = scene;
		scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);
		var camera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0, 0, -10), scene);
		camera.setTarget(BABYLON.Vector3.Zero());
		
		BABYLON.Effect.ShadersStore["editorMainVertexShader"] = TM._glslBank.editors.sheetMain.vs;
		BABYLON.Effect.ShadersStore["editorMainFragmentShader"] = TM._glslBank.editors.sheetMain.fs;
		BABYLON.Effect.ShadersStore["editorPreviewVertexShader"] = TM._glslBank.editors.sheetPreview.vs;
		BABYLON.Effect.ShadersStore["editorPreviewFragmentShader"] = TM._glslBank.editors.sheetPreview.fs;
	
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
		parent._editors.main._activeProject = p;
		TM.EDITOR.ACTS['close-pane'](e);
		TM.EDITOR.ACTS['open-pane']('main-editor');	
	},
	'restart' :  function(e, parent){
		if(parent._editors.main._activeProject){
			TM.EDITOR.ACTS['open-pane']('main-editor');	
		}else{
			TM.EDITOR.ACTS['open-pane']('start-menu');	
		}
		(document.getElementById('main-editor')).classList.remove('active');
		(document.getElementById('sheet-editor')).classList.remove('active');
	}
};










