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
		window.addEventListener("resize", function () {
			self.engine.resize();
			self._refresh();
		}); 
		
		self.engine.resize();
		self._refresh();
	
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
	},
	_refresh : function(){
		if(!this._project){return;}
		for(var i =0; i<this._project.stages.length; i++){
			var stage = this._project.stages[i];
			if(i != this._project.activeStage){continue;}
			for(var j =0; j<stage.planes.length; j++){
				var plane = stage.planes[j];
				plane._resize();			
			}
		}
		
	},
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
			var canvas = document.createElement('canvas');
			var context = canvas.getContext('2d');			
			canvas.width = img.width;
			canvas.height = img.height;
			context.drawImage(img, 0, 0 );
			var data = context.getImageData(0, 0, img.width, img.height);
			texture.idat = data;
			var id = parent._project.assets.sheets.length;
				TM.EDITOR.ACTS['add-sheet-to-management-list']({iDat: data, width: data.width, height:data.height, i:id}, parent);		
			parent._project.assets.sheets.push(texture);
			parent._tasks--;			
		});	
		
	},
	'parse-sheet' : function(data, parent){		
		var texture = new BABYLON.DynamicTexture('parsed-sheet', {width:data.width || 1, height:data.height || 1}, parent.scene, false, 1);
		texture.inverseSize = data.inverseSize;
		
		var ctx = texture._context;
		var iDat = ctx.createImageData(data.width, data.height);
		var d = iDat.data;
		
		for (var i = 0; i < d.length; i += 4) {
			d[i]     = data.data[i];    
			d[i + 1] = data.data[i + 1]; 
			d[i + 2] = data.data[i + 2]; 
			d[i + 3] = data.data[i + 3]; 
		}
		
		ctx.putImageData(iDat, 0, 0);
		texture.update(false);
				
		TM.EDITOR.ACTS['add-sheet-to-management-list']({iDat: iDat, width: data.width, height:data.height, i:data.i}, parent);		
				
		parent._project.assets.sheets.push(texture);	
	},
	'add-sheet-to-management-list' : function(data, parent){
		
		pane = document.body.querySelector('[id="manage-sheets"].pane');
		var list = pane.querySelector('[id="sheet-list"]');
		var item = document.createElement('div');
		item.setAttribute('id', data.i);
						
			var cvas = document.createElement('canvas');
			cvas.width = data.width;
			cvas.height = data.height;
			
			var ctx = cvas.getContext('2d');
			ctx.putImageData(data.iDat, 0, 0);

			item.appendChild(cvas);			
			list.appendChild(item);
		
	},	
	/*SHEET LOADING END*/
	
	/* STAGE MANAGMENT */
	'add-plane' : function(e, parent){
		var sID = parseInt(e.target.getAttribute('t'));
		var stage = parent._project.stages[sID];
		stage['add-plane']();
		parent._refresh();
		
	},	
	/* END STAGE MANAGMENT */
	
	'screen-lock' : function(parent){
		if(parent._tasks>0){
			if(parent._screenlock.style.display!='block'){parent._screenlock.style.display = 'block';}
			setTimeout(()=>{TM.EDITOR.ACTS['screen-lock'](parent);}, 1000/30);
		}else{
			parent._screenlock.style.display = 'none';
		}
	},
	
	/*EXPORT STUFF*/
	'export-project' : function(e, parent){
		parent._tasks++;
		TM.EDITOR.ACTS['screen-lock'](parent);
		var project = parent._project;
		
		var p = {
			name: project.name,
			assets : {
				sheets : [],
			},
			stages : [],
			activeStage : project.activeStage
		};
		
		for(var i = 0; i<project.stages.length; i++){
			p.stages.push(project.stages[i]._serialize());
		}
		
		for(var i = 0; i<project.assets.sheets.length; i++){
			//Convert to Image-Data
			var sheet = project.assets.sheets[i];
			var dat = {
				data : [],
				inverseSize : {x:sheet.inverseSize.x, y: sheet.inverseSize.y},
				width : sheet.idat.width,
				height : sheet.idat.height
			}
			
			for(var j=0; j<sheet.idat.data.length; j++){
				dat.data.push(sheet.idat.data[j]);
			}

			
			p.assets.sheets.push(dat);
		}
		
		
		p = JSON.stringify(p);
		
		var a = document.createElement('a');
		
			var file = new Blob([p], {type: 'text/plain'});
			a.download = project.name+'.tmf';
			a.href = URL.createObjectURL(file);			
			a.click();
		parent._tasks--;
	},
	
	/*IMPORT STUFF*/
	'import-project' : function(e, parent){
		parent._tasks++;
		TM.EDITOR.ACTS['screen-lock'](parent);
		var pane = document.body.querySelector('[id="load-project"].pane');
		var file = document.body.querySelector('input[id="loaded-project"]').files[0];
		console.log(file);
		var fileName = file.name;
		var fileType = fileName.split('.');
		fileType = fileType[fileType.length-1];
		
		if(fileType == 'tmf'){
		var reader = new FileReader();
			reader.onload = function(){
			var text = reader.result;
			var file = JSON.parse(text);
			
			var project = new TM.PROJECT();
			
			project.name = file.name;			
			parent._project = project;
			
			var stages = file.stages;
			for(var i = 0; i<stages.length; i++){
				var stage = new TM.STAGE(parent);
				stage.name = stages[i].name;
				parent._project.stages.push(stage);
			}			
			project.activeStage = file.activeStage;
			console.log(file.assets);
			var sheets = file.assets.sheets;
			for(var i = 0; i<sheets.length; i++){
				var dat = sheets[i];
				dat.i = i;
				TM.EDITOR.ACTS['parse-sheet'](dat, parent);
			}
			
			
			var pane = document.body.querySelector('.pane.active');
			if(pane){pane.classList.remove('active');}
			TM.EDITOR.ACTS['refreshUI'](e, parent);
			(document.body.querySelector('.full-wrap.hidden')).classList.remove('hidden');
			
			
			
			parent._tasks--;
        };
        reader.readAsText(file);
		}else{
			parent._tasks--;
			return;
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
	
	this.viewOffset = new BABYLON.Vector2(0,0);
	this.viewZoom = 1.0;
	
	
	return this;
};

TM.STAGE.prototype = {
	'add-plane' : function(){
		var plane = new TM.PLANE(this);
		this.planes.push(plane);
	},
	_serialize : function(){
		s = {
			name : this.name,
			planes : [],
			actors : []			
		};		
		
		return s;
	}	
};

TM.PLANE = function(parent){
	this._parent = parent;
	this._core = parent._parent;
	console.log(this._core);
	this.name = 'New Plane';
	this.layers = [];
	
	this.planeOffset = new BABYLON.Vector2(0,0);
	this.planeScale = 1.0;
	this.planeMoveScale = new BABYLON.Vector2(1.0,1.0);
	
	this._buildMesh();
	
};

TM.PLANE.prototype = {
	_buildMesh : function(){
		if(this.mesh){this.mesh.dispose();}
		var scene = this._core.scene;
		var engine = this._core.engine;
		var c = scene.activeCamera;
		var fov = c.fov;
		console.log('fov', fov);
		var aspectRatio = engine.getAspectRatio(c);
		console.log('aspectRatio', aspectRatio);
		var d = c.position.length();
		var y = 2 * d * Math.tan(fov / 2);
		var x = y * aspectRatio;
		console.log(x,y);		
		this.mesh = BABYLON.MeshBuilder.CreatePlane("output-plane", {width: x, height:y}, this._core.scene);
	},
	_resize : function(){
		console.log("resize!");
		this._buildMesh();
	},	
	_serialize : function(){
		
	}	
};












