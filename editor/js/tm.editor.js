TM = {};

TM.EDITOR = function(){
this._init();

return this;
}

TM.EDITOR.prototype = {
	_init : function(){
		this._tasks = 0;
		this._screenlock = document.getElementById('screen-lock');

	
		this.canvas = document.getElementById('renderCanvas');
		this._startScene();
		this._bindings();
		this._project = null;
		
		this._startRender();
	},
	_startScene : function(){
		var canvas = this.canvas;
		var engine = new BABYLON.Engine(canvas, true);
		  
		var scene = new BABYLON.Scene(engine);
			scene.clearColor = new BABYLON.Color3(0.8, 0.8, 0.82);
			var camera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0, 0, -10), scene);
			camera.setTarget(BABYLON.Vector3.Zero());			
			var light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0), scene);
			light.intensity = .5;
				
		this.engine = engine;
		this.scene = scene;	
	},
	_startRender : function(){
		var self = this;	
		self.engine.runRenderLoop(function () {
			self.scene.render();
		});
		self.engine.resize();
		window.addEventListener("resize", function () {
			self.engine.resize();
			//self._resize();
		}); 
	
	},
	_bindings : function(){
		var self = this;
		document.addEventListener("click", (e) => {
			var t = e.target;
			var act = t.getAttribute('act');				
				if(act){
					if(TM.EDITOR.ACTS[act]){
					TM.EDITOR.ACTS[act](e, self);
					}
				}
			
		},false);
	}
};


TM.EDITOR.ACTS = {
	/*PANE CONTROLS*/
	'change-pane' : function(e, parent){
		var pane = document.body.querySelector('.pane.active');
		if(pane){pane.classList.remove('active');}
		(document.body.querySelector('[id="'+e.target.getAttribute('t')+'"].pane')).classList.add('active');
	},
	'close-pane': function(e, parent){
		(document.body.querySelector('.pane.active')).classList.remove('active');
	},
	/*END PANE CONTROLS*/
	
	'create-new-project' : function(e, parent){
		var pane = document.body.querySelector('.pane.active');
		var nameIn = pane.querySelector('[id="project-name"]');
		if(nameIn.value == '' || !nameIn.value){alert('Please Choose a Project Name!');return;}else{
			var project = new TM.PROJECT();
			project.name = nameIn.value+'';
			parent._project = project;
		}
		pane.classList.remove('active');
		(document.body.querySelector('.full-wrap.hidden')).classList.remove('hidden');
	},
	'create-stage' : function(e, parent){
		var pane = document.body.querySelector('.pane.active');
		var nameIn = pane.querySelector('[id="stage-name"]');
		
		var oldActive = document.body.querySelector('.item.stage.active');
		if(oldActive){oldActive.classList.remove('active');}
		
		if(nameIn.value == '' || !nameIn.value){alert('Please Set Stage Name!');return;}else{
			var stage = new TM.STAGE(parent);
			stage.name = nameIn.value;
			parent._project.stages.push(stage);
			parent._project.activeStage = parent._project.stages.length-1;
		}
		pane.classList.remove('active');
		TM.EDITOR.ACTS['refreshUI'](e, parent);
	},	
	'refreshUI' : function(e, parent){
		//SceneList
		var list = document.body.querySelector('[id="scene-list"]');
		list.innerHTML = '';
		var stages = parent._project.stages;
			for(var i=0; i<stages.length; i++){
				var item = document.createElement('div');
				item.setAttribute('id', i);
				item.classList.add('item', 'stage');
				if(parent._project.activeStage == i){item.classList.add('active');}
				item.innerHTML = stages[i].name+':<BR><div class="list" id="children"></div>';
				item.innerHTML += "<hr>";
				item.innerHTML += "<a href='#' class='button small inline' act='make-stage-active' t='"+i+"'>Make Active Stage</a>";
				item.innerHTML += "<a href='#' class='button small inline' act='add-plane' t='"+i+"'>Add Plane</a>";
				list.appendChild(item);
			}
		
	},
	
	/*SHEET LOADING*/
	'add-sheet' : function(e, parent){
		var pane = document.body.querySelector('[id="add-sheet"].pane');
		var url = pane.querySelector('[id="url"]').value+'';
		if(!url){return;}
		TM.EDITOR.ACTS['load-sheet'](url, parent);
		pane.classList.remove('active');	
	},
	'load-sheet': function(url, parent){
		parent._tasks++;
		TM.EDITOR.ACTS['screen-lock'](parent);
		var img = new Image;
		img.onload = function(e){			
			TM.EDITOR.ACTS['sheet-loaded'](img, parent);
		};
		img.onerror = function(e){
			alert('Bad IMG!');
			parent._tasks--;
		}
		img.src = url;
	},
	'sheet-loaded' : function(img, parent){
		var texture = new BABYLON.Texture(img.src, parent.scene, true, false, 1,
		()=>{
			texture.inverseSize = new BABYLON.Vector2(1/texture._texture._width, 1/texture._texture._height);
			parent._project.assets.sheets.push(texture);
			parent._tasks--;			
		});	
		
	},
	/*SHEET LOADING END*/
	
	'screen-lock' : function(parent){
		if(parent._tasks>0){
			if(parent._screenlock.style.display!='block'){parent._screenlock.style.display = 'block';}
			setTimeout(()=>{TM.EDITOR.ACTS['screen-lock'](parent);}, 1000/30);
		}else{
			parent._screenlock.style.display = 'none';
		}
	},
	
};



TM.PROJECT = function(){
	this.name = 'New Project';
	this.stages = [];
	this.assets = {
		sheets : []		
	};
	this.activeStage = -1;
	return this;
};

TM.STAGE = function(parent){
	this._parent = parent;
	this.name = 'New Stage';	
	this.planes = [];
	this.actors = [];
	
	return this;
};

TM.STAGE.prototype = {
	
};

TM.PLANE = function(parent){
	this._parent = parent;
	this._buildMesh();
	
};

TM.PLANE.prototype = {
	_buildMesh : function(){
		if(this.mesh)this.mesh.dispose();
		var scene = this.parent.scene;
		var engine = this.parent.engine;
		var c = scene.activeCamera;
		var fov = c.fov;
		var aspectRatio = engine.getAspectRatio(c);
		var d = c.position.length();
		var y = 2 * d * Math.tan(fov / 2);
		var x = y * aspectRatio;		
		this.mesh = BABYLON.MeshBuilder.CreatePlane("output-plane", {width: x, height:y}, scene);
	}
	
};












