TM = TM || {};

TM.EDITOR = function(){
	this._tasks = [];
	this._delta = 0;
	this._startedOn = (new Date).getTime();
	this._keys = {};
	
	
	this._editors = {
		main : {
			_active : false,
			dom : document.getElementById('main-editor'),
			_activeProject : null,
			_activeStage : null,
			_activePlane : null,
			_activeLayer : null,
			assets : {
				sheets : {},
				sprites: {},
				graphics : {}				
			},
			engine : null,
			scene : null,
			canvas : document.getElementById('mainEditCanvas'),
			
			
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
			pEngine : null,
			scene : null,
			pScene : null, 
			iDat : null,
			texture : null,
			pTexture : null,
			mainMesh : null,
			mainShader : null,
			previewMesh : null,
			pShader : null,
			inputs : {
				tools : document.getElementById('sheet-tools'),
				inImage : document.getElementById('in-sheet-image'),
				name : document.getElementById('sheet-name'),
				tileSize : document.getElementById('sheet-tile-size'),
				zoom : document.getElementById('sheet-editor-zoom'),
				radios : document.body.querySelectorAll('input[name="sheet-AnimationType"]'),
				speedMul : document.getElementById('tile-speed-multiply'),
				speedDiv : document.getElementById('tile-speed-divide')
			},
			_buildShaders : ()=>{
				var self = this._editors.sheet;
				var defines = [];
				defines.push('precision highp float;');
				var shader = new BABYLON.ShaderMaterial("editorMainShader", self.scene, {
					vertex: "editorMain",
					fragment: "editorMain",
					},{
					attributes: ["position", "normal", "uv"],
					defines: defines,
					samplers: ['sprite'],
					uniforms: ["world",
					"worldView", 
					"worldViewProjection",
					"view", "viewOffset",
					"viewportSize", "sheetSize", "mousePos", "selectedTile"]
				});
				var pShader = new BABYLON.ShaderMaterial("editorPreviewShader", self.pScene, {
					vertex: "editorPreview",
					fragment: "editorPreview",
					},{
					attributes: ["position", "normal", "uv"],
					defines: defines,
					samplers: ['sprite'],
					uniforms: ["world",
					"worldView", 
					"worldViewProjection",
					"view", "selectedTile", "sheetSize", "animationType", "time",
					"animationSpeedMul", "animationSpeedDiv"]
				});
				
				self.mainShader = shader;
				self.pShader = pShader;				
				self._setShaderDefaults();
			},
			_loadNewImage : (file)=>{
				var self = this._editors.sheet;									
				
				var fileName = file.name.split('.');
				var fileType = fileName[fileName.length-1];
				fileName = fileName[0];				
				function apply(){
					self.inputs.name.value = fileName;					
					var hiddenCanvas = document.getElementById('hiddenCanvas');
					hiddenCanvas.width = self.iDat.width;
					hiddenCanvas.height = self.iDat.height;
					var hctx = hiddenCanvas.getContext('2d');
					hctx.putImageData(self.iDat, 0,0);
					
					var texture = new BABYLON.DynamicTexture('sheet', {width:self.iDat.width, height:self.iDat.height}, self.scene, false, 1);
					var ctx = texture._context;
					ctx.putImageData(self.iDat, 0, 0);
					texture.update(false);
					self.texture = texture;
					
					var pTexture = new BABYLON.DynamicTexture('sheet', {width:self.iDat.width, height:self.iDat.height}, self.pScene, false, 1);
					ctx = pTexture._context;
					ctx.putImageData(self.iDat, 0, 0);
					pTexture.update(false);
					self.pTexture = pTexture;
					
					self._setShaderDefaults();
					self.inputs.tools.classList.add('active');
					
					self.engine.resize();
					self.pEngine.resize();
				}				
				if(
				fileType != "tms" && 
				fileType != "png" &&
				fileType != "gif" &&
				fileType != "jpg" ){
					self.inputs.inImage.files = null;
					self.inputs.inImage.value = null;
					self.inputs.tools.classList.remove('active');
					alert('Wrong filetype!');
					TM.EDITOR.ACTS['open-sheet-editor'](null, this);
					return;
				}
				
				var fr = new FileReader();
				if(fileType != 'tms'){
					var img = new Image();
					var cvas = document.createElement('canvas');
					
					img.onload = (e)=>{
						cvas.width = e.target.width;
						cvas.height = e.target.height;
						var ctx = cvas.getContext('2d');
						ctx.drawImage(img,0,0);
						var iDat = ctx.getImageData(0,0,cvas.width, cvas.height);
						delete cvas;
						self.iDat = iDat;
						apply();
					}					
					fr.onload =(e)=>{
						img.src = fr.result;
					}				
				}		
				fr.readAsDataURL(file);					
			},
			_setAnimationType: (t)=>{
				var self = this._editors.sheet;
				self.pShader.setFloat('animationType', t);
			},
			_setAnimationSpeeds : (m,d)=>{
				var self = this._editors.sheet;
				self.pShader.setFloat('animationSpeedMul', m);
				self.pShader.setFloat('animationSpeedDiv', d);
			},				
			_setMousePos : (pos)=>{
				var self = this._editors.sheet;
				self.mainShader.setVector2('mousePos', pos.divide(new BABYLON.Vector2(self.zoom, self.zoom)));		
			},
			_setZoom: ()=>{
				var self = this._editors.sheet;
				self.zoom = parseFloat(self.inputs.zoom.value,10);	
				self._resizeShader(true);
			},
			_resizeShader : (skipMesh)=>{
				var self = this._editors.sheet;
				self.mainShader.setVector2('viewportSize', new BABYLON.Vector2(self.canvas.width/self.zoom, self.canvas.height/self.zoom));
				self.mainShader.setVector2('viewOffset', self.offset);
				if(!skipMesh){self._buildMesh()};
			},
			_tileChanged : (id)=>{
				var self = this._editors.sheet;
				if(self.texture){				
				var maxX = self.texture._texture.width/self.tileSize;
				var maxY = self.texture._texture.height/self.tileSize;
		
				if(id.x >= 0 && id.y >= 0 && id.x < maxX && id.y < maxY){
			
					self.output[id.x+":"+id.y] = self.output[id.x+":"+id.y] || {type:0, sMul:1, sDiv:1};
					self.currentTile.x = id.x;
					self.currentTile.y = id.y;
					
					for(var i=0; i<self.inputs.radios.length; i++){
						var t = self.output[id.x+":"+id.y].type;
						if(self.inputs.radios[i].value == t){
							self.inputs.radios[i].checked = true;
							self._setAnimationType(t);					
							i=self.inputs.radios.length;
						}else{
							self.inputs.radios[i].checked = false;
						}
				}
				var m = self.output[id.x+":"+id.y].sMul;
				var d = self.output[id.x+":"+id.y].sDiv;
				self.inputs.speedMul.value = m;
				self.inputs.speedDiv.value = d;
				self._setAnimationSpeeds(m,d);
				}else{
					self.currentTile.x = -1;
					self.currentTile.y = -1;
				
				}
				}
			},			
			_selectTile: (id)=>{
				var self = this._editors.sheet;
				self.mainShader.setVector2('selectedTile', id);
				self.pShader.setVector2('selectedTile', id);
				self._tileChanged(id);				
				
			},
			_setTileSize:()=>{
				var self = this._editors.sheet;
				if(!self._tmsFlag){
					self.output = {};
				}else{tmsFlag = false;}
				self.mainShader.setFloat('tileSize', self.tileSize);
				self.pShader.setFloat('tileSize', self.tileSize);
			},
			_setNewTexture : ()=>{
				var self = this._editors.sheet;
				console.log(self);
				self.mainShader.setTexture('sprite', self.texture);	
				self.mainShader.setVector2('sheetSize', new BABYLON.Vector2(self.texture._texture.width, self.texture._texture.height));
				self.pShader.setTexture('sprite', self.pTexture);	
				self.pShader.setVector2('sheetSize', new BABYLON.Vector2(self.texture._texture.width, self.texture._texture.height));
			},
			_setShaderDefaults: ()=>{
				var self = this._editors.sheet;
				self._resizeShader();
				self._setMousePos(new BABYLON.Vector2(0, 0));
				self._selectTile(new BABYLON.Vector2(-1, -1));
				self._setTileSize();
				if(!self.texture){
					self.mainShader.setTexture('sprite', new TM.blankTexture({width:1, height:1}, self.scene));
					self.pShader.setTexture('sprite', new TM.blankTexture({width:1, height:1}, self.pScene));
					self.mainShader.setVector2('sheetSize', new BABYLON.Vector2(1,1));
					self.pShader.setVector2('sheetSize', new BABYLON.Vector2(1,1));
				}else{
					self._setNewTexture();
				}
							
				self.pShader.setFloat('animationType', 0);
				self.pShader.setFloat('animationSpeedMul', 1.0);
				self.pShader.setFloat('animationSpeedDiv', 1.0);
			},
			_buildMesh:()=>{
				var self = this._editors.sheet;
				var mesh = self.mainMesh;
				if(mesh){mesh.dispose();}
				var c = self.scene.activeCamera;
				var fov = c.fov;
				var aspectRatio = self.engine.getAspectRatio(c);
				var d = c.position.length();
				var y = 2 * d * Math.tan(fov / 2);
				var x = y * aspectRatio;		
				mesh = BABYLON.MeshBuilder.CreatePlane("output-plane", {width: x, height:y}, self.scene);
				mesh.material = self.mainShader;
				self.mainMesh = mesh;
			},
			_buildPreviewMesh:()=>{
				var self = this._editors.sheet;
				var mesh = self.previewMesh;
				if(mesh){mesh.dispose();}
				console.log(self);
				var c = self.pScene.activeCamera;
				var fov = c.fov;
				var aspectRatio = self.pEngine.getAspectRatio(c);
				var d = c.position.length();
				var y = 2 * d * Math.tan(fov / 2);
				var x = y * aspectRatio;		
				mesh = BABYLON.MeshBuilder.CreatePlane("output-plane", {width: x, height:y}, self.pScene);
				mesh.material = self.pShader;
				self.previewMesh = mesh;
			}				
		}		
	};

	

	this._init();
	return this;
}

TM.EDITOR.prototype = {
	_deltaCalc : function(){
		var now = (new Date).getTime();
		this._delta = this._startedOn - now;
	},
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
		
		document.body.addEventListener('keydown', function(e){
			self._keys[e.code] = true;
			//console.log(e.code);
		}, false);
	
		document.body.addEventListener('keyup', function(e){
			self._keys[e.code] = false;
		}, false);
		
		
		/*----SHEET EDITOR SPECIFIC-----*/;
		var sheetEdit = this._editors.sheet;						
		sheetEdit.canvas.addEventListener('mousemove', function(e){
				var pos = new BABYLON.Vector2(e.offsetX, e.offsetY);				
				//console.log(pos);
				sheetEdit._setMousePos(pos.add(sheetEdit.offset.scale(sheetEdit.zoom)));
		}, false);
		
		sheetEdit.canvas.addEventListener('mouseout', function(e){
				var pos = new BABYLON.Vector2(-1,-1);				
				sheetEdit._setMousePos(pos);
		}, false);
		
		sheetEdit.canvas.addEventListener('click', function(e){
			var pos = new BABYLON.Vector2(e.offsetX, e.offsetY);	
			var id = pos.add(sheetEdit.offset.scale(sheetEdit.zoom));
			var size = sheetEdit.tileSize*sheetEdit.zoom;
			id.x = Math.floor(id.x/size);
			id.y = Math.floor(id.y/size);
			sheetEdit._selectTile(id);			
		}, false);	
		
		/*---- RESIZE STUFF ----*/
		window.addEventListener("resize", function () {				
				if(sheetEdit._active){
					sheetEdit.engine.resize();
					sheetEdit._resizeShader();
				}
			}); 			
		
		
	},
	_startSheetEditor : function(){
		var editor = this._editors.sheet;			
		var engine = new BABYLON.Engine(editor.canvas, true);
		var pEngine = new BABYLON.Engine(editor.previewCanvas, true);
		editor.engine = engine;
		editor.pEngine = pEngine;
		var scene = new BABYLON.Scene(engine);
		var pScene = new BABYLON.Scene(pEngine);
		editor.scene = scene;
		editor.pScene = pScene;
		scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);
		pScene.clearColor = new BABYLON.Color4(0, 0, 0, 0);
		
		var camera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0, 0, -10), scene);
		camera.setTarget(BABYLON.Vector3.Zero());
		
		var pCamera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0, 0, -10), pScene);
		pCamera.setTarget(BABYLON.Vector3.Zero());
		
		BABYLON.Effect.ShadersStore["editorMainVertexShader"] = TM._glslBank.editors.sheetMain.vs;
		BABYLON.Effect.ShadersStore["editorMainFragmentShader"] = TM._glslBank.editors.sheetMain.fs;
		BABYLON.Effect.ShadersStore["editorPreviewVertexShader"] = TM._glslBank.editors.sheetPreview.vs;
		BABYLON.Effect.ShadersStore["editorPreviewFragmentShader"] = TM._glslBank.editors.sheetPreview.fs;
		
		editor._buildShaders();
		editor._buildMesh();
		editor._buildPreviewMesh();
		
		var core = this;		

		scene.registerBeforeRender(()=>{
			if(editor._active){			
			if(core._keys['ArrowLeft']){editor.offset.x+=1;}
			if(core._keys['ArrowRight']){editor.offset.x-=1;}
			if(core._keys['ArrowUp']){editor.offset.y+=1;}
			if(core._keys['ArrowDown']){editor.offset.y-=1;}
			}			
		});
		
		engine.runRenderLoop(function () {
			if(editor._active){	scene.render(); pScene.render(); 
				core._deltaCalc();			
				if(editor.pShader){
					editor.pShader.setFloat('time', core._delta);
				}
			}			
		});

			
	}
};


TM.EDITOR.ACTS = {
	'change-pane' : function(e, parent){
		var el = e.target;
		var t = el.getAttribute('act-value');
		console.log("change-pane:", t);
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
		if(el.classList.contains('pane')){
		el.classList.remove('active');
		}
	},
	'open-pane' : function(t){
		var t = document.getElementById(t);
		console.log("open-pane:", t);
		if(t){t.classList.add('active')};		
	},
	'open-pane-element' : function(e, parent){
		var t = e.target;
		t = t.getAttribute('act-value');
		t = document.getElementById(t);
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
		(document.getElementById('main-editor')).classList.remove('active');
		
		(document.getElementById('sheet-editor')).classList.remove('active');
		parent._editors.sheet.inputs.tools.classList.remove('active');

		if(parent._editors.main._activeProject){
			TM.EDITOR.ACTS['open-pane']('main-editor');	
		}else{
			TM.EDITOR.ACTS['open-pane']('start-menu');	
		}
	},	
	'open-sheet-editor' : function(e, parent){
		parent._editors.main._active = false;
		parent._editors.sheet._active = true;
		
		(document.getElementById('main-editor')).classList.remove('active');
		(document.getElementById('start-menu')).classList.remove('active');
		(document.getElementById('sheet-editor')).classList.add('active');
		(document.getElementById('start-new-sheet')).classList.add('active');
		
		parent._editors.sheet.engine.resize();
		parent._editors.sheet._resizeShader();
	},
	'start-import-sheet-into-project' : function(e, parent){
		var input = document.getElementById('hidden-sheet-input');
		input.click();
	},
	
	/*----- CHANGE ACTS -----*/
	'sheet-in-change' : function(e, parent){
		console.log('CHANGING IMAGE DATA');
		TM.EDITOR.ACTS['close-pane'](e);
		var file = e.target.files[0];
		var editor = parent._editors.sheet;
		editor._loadNewImage(file);
	},
	'change-sheet-editor-zoom' : function(e, parent){
		parent._editors.sheet._setZoom();
	},
	'change-sheet-editor-tile-size' : function(e, parent){
		parent._editors.sheet.tileSize = parseInt(e.target.value);
		parent._editors.sheet._setTileSize();
	},
	'update-animation-output-type' : function(e, parent){
		var v = parseInt(e.target.value);
		var output = parent._editors.sheet.output;
		var currentTile = parent._editors.sheet.currentTile;
		output[currentTile.x+":"+currentTile.y].type = v;
		parent._editors.sheet._setAnimationType(v);
	},
	'update-animation-output-speed': function(e, parent){
		var v = parseFloat(e.target.value, 10);
		var output = parent._editors.sheet.output;
		var currentTile = parent._editors.sheet.currentTile;
		if(e.target.getAttribute('id')=='tile-speed-multiply'){
		output[currentTile.x+":"+currentTile.y].sMul = v;
		}else{
		output[currentTile.x+":"+currentTile.y].sDiv = v;
		}
			var m = output[currentTile.x+":"+currentTile.y].sMul;
			var d = output[currentTile.x+":"+currentTile.y].sDiv;
			parent._editors.sheet._setAnimationSpeeds(m,d);
	},
	'compile-sheet' : function(e, parent){		
		var editor = parent._editors.sheet;
		var sheet = new TM.SHEET();
		sheet._buildFromEditor(editor.output);
		console.log(sheet);
	}
};










