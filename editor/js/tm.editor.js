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
		this._buildShader();
		this._project = null;
		
		this.viewportSize = new BABYLON.Vector2(this.canvas.width, this.canvas.height);
		
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
	_buildShader : function(){
var _vs =
`precision highp float;
// Attributes
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
// Uniforms
uniform mat4 worldViewProjection;
uniform float time;
uniform float fps;
uniform vec2 viewOffset;
uniform vec2 viewportSize;
uniform vec2 inverseStageSize;
uniform float spriteSize;

varying vec3 vPosition;
varying vec2 vUV;
varying vec2 pixelCoord;
varying vec2 texCoord;


void main() {
    vec4 p = vec4( position, 1. );
    vPosition = p.xyz;	
	gl_Position = worldViewProjection * p;
	vUV = uv;
	vUV.y = 1.0 - vUV.y;
	pixelCoord = (vUV * viewportSize) + viewOffset;
	texCoord = pixelCoord * inverseStageSize * (1.0/spriteSize);
	
	
}`;
var _fs =
`const float pU = 0.00392156862;

uniform float time;
uniform float fps;
uniform vec2 viewOffset;
uniform vec2 viewportSize;
uniform float spriteSize;
uniform vec2 inverseStageSize;
uniform vec2 mousePos;

uniform float isActive;

#ifdef SHEETS
uniform sampler2D sprites[SHEETS];
uniform vec2 inverseSheetSizes[SHEETS];
#endif

#ifdef LAYERS
uniform sampler2D layers[LAYERS];
#endif

varying vec3 vPosition;
varying vec2 vUV;
varying vec2 pixelCoord;
varying vec2 texCoord;


void main(){
#ifdef SHEETS
#ifdef LAYERS
vec4 tile = texture2D(layers[0], texCoord);
vec2 spriteOffset = floor(tile.xy * 256.0) * spriteSize;
vec2 spriteCoord = mod(pixelCoord, spriteSize);
vec4 tSample = texture2D(sprites[0], vec2((spriteOffset + spriteCoord) * vec2(1.0/480., 1./256.)));
vec3 color = tSample.xyz;
float alpha = 1.0;
if((texCoord.x > 1.0  || texCoord.x < 0.0 || texCoord.y > 1.0 || texCoord.y < 0.0)){color = vec3(0.0); alpha = 0.0; }

if(isActive == 1.0){
	color.x = 1.0;
}


gl_FragColor =  vec4(color, alpha);
#else
	vec3 color = vec3(0.0);
	float alpha = 1.0;
	gl_FragColor =  vec4(vec3(0.,0.,0.), 0.);
#endif
#else
	vec3 color = vec3(0.0);
	float alpha = 1.0;
	gl_FragColor =  vec4(vec3(0.,0.,0.), 0.);
	
#endif
}
`;
	BABYLON.Effect.ShadersStore["editorVertexShader"] = _vs;
	BABYLON.Effect.ShadersStore["editorFragmentShader"] = _fs;
	
	
	
	
	},
	_startRender : function(){
		var self = this;	
		self.engine.runRenderLoop(function () {
			self.scene.render();
			self._updatePlanes();
		});
		window.addEventListener("resize", function () {
			self.engine.resize();
			self._refresh();
		}); 
			
	},
	_updatePlanes : function(){
		if((this._project) && this._project.stages.length){
			for(var i=0; i<this._project.stages.length; i++){
				for(var j=0; j<this._project.stages[i].planes.length; j++){
					var plane = this._project.stages[i].planes[j];
					if(i == this._project.activeStage && j == this._project.activePlane){
							plane._setMousePos();
							if(!plane._isActive){plane._setActive(true);}
					}else{
						if(plane._isActive){plane._setActive(false);}
						if(!plane._clearMouse){
							plane._clearMousePos();
						}
					}
				}
			}
		}
		
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
				
		document.addEventListener('mousemove', (e)=>{
			//console.log(e.clientX, e.clientY);
				self._mousePos = new BABYLON.Vector2(e.clientX, e.clientY);
		}, false);
		
		document.addEventListener('mouseout', (e)=>{
				self._mousePos = null;
		}, false);
	},
	_refresh : function(refreshAll){
		if(!this._project){return;}
		this.viewportSize = new BABYLON.Vector2(this.canvas.width, this.canvas.height);
		for(var i =0; i<this._project.stages.length; i++){
			var stage = this._project.stages[i];
			if(i != this._project.activeStage){continue;}
			for(var j =0; j<stage.planes.length; j++){
				var plane = stage.planes[j];
				plane._resize();
				if(refreshAll){plane._setAll();}
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
			var project = new TM.PROJECT(parent);
			project.name = nameIn.value+'';
			parent._project = project;
			pane.classList.remove('active');
			(document.body.querySelector('.full-wrap.hidden')).classList.remove('hidden');
		}		
	},
	'create-stage' : function(e, parent){
		var pane = document.body.querySelector('.pane.active');
		var nameIn = pane.querySelector('[id="stage-name"]');		
		
		if(nameIn.value == '' || !nameIn.value){alert('Please Set Stage Name!');return;}else{
			
			var oldActive = document.body.querySelector('.item.stage.active');
			if(oldActive){oldActive.classList.remove('active');}
			
			var stage = new TM.STAGE(parent);
			stage.name = nameIn.value;
			parent._project.stages.push(stage);
			parent._project.activeStage = parent._project.stages.length-1;
			pane.classList.remove('active');
			TM.EDITOR.ACTS['refreshUI'](e, parent);
		}
		
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
				var ihs = stages[i].name;
				ihs+='<div class="settings-menu">';
					ihs+= "<a href='#' class='button small inline' act='stage-settings' t='"+i+"'>Settings</a>";
				ihs+='</div>';
				ihs+='<hr>';
				
					for(var j=0; j<stages[i].planes.length; j++){
						var p = stages[i].planes[j];
						ihs +='<div class="item plane';
						if(j == parent._project.activePlane && i== parent._project.activeStage){ihs+=" active"}
						ihs +='" id="'+j+'">'+
						p.name+"<hr>";
						for(var k=0; k<stages[i].planes[j].layers.length; k++){
							ihs +='<div class="item layer small';
							if(j == parent._project.activePlane && i== parent._project.activeStage && k== parent._project.activeLayer){ihs+=" active"}
							ihs +='" id="'+k+'">';
							ihs += "Layer - "+k+"<br>";
							ihs +="<a href='#' class='button inline' act='make-layer-active' s='"+i+"' p='"+j+"' t='"+k+"'>Make Active</a>";
							ihs += "</div>";
						
						}						
						ihs += "<hr>"+
						"<a href='#' class='button small inline' act='add-layer' p='"+i+"' t='"+j+"'>Add Layer</a>"+
						"<br>"+
						"<a href='#' class='button small inline' act='assign-sheet' p='"+i+"' t='"+j+"'>Assign Sheet</a>"+
						//"<a href='#' class='button small inline' act='make-plane-active' p='"+i+"' t='"+j+"'>Make Active</a>"+
						"<a href='#' class='button small inline' act='delete-plane' p='"+i+"' t='"+j+"'>Delete Plane</a>"+
						"<a href='#' class='button small inline' act='plane-settings' p='"+i+"' t='"+j+"'>Settings</a>"+
						'</div>';						
					}				
				ihs += "<hr>";
				ihs+= "<a href='#' class='button small inline' act='make-stage-active' t='"+i+"'>Make Active Stage</a>";
				ihs += "<a href='#' class='button small inline' act='add-plane' t='"+i+"'>Add Plane</a>";
				
				item.innerHTML = ihs;
				
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
			texture.tileSize = 32.0;
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
		texture.tileSize = data.tileSize;
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
			
		TM.EDITOR.ACTS['add-sheet-to-assign-list'](data, parent);
	},
	'add-sheet-to-assign-list' : function(data, parent){
		
		pane = document.body.querySelector('[id="assign-sheets"].pane');
		var list = pane.querySelector('[id="sheet-list"]');
		var item = document.createElement('div');
		item.setAttribute('id', data.i);
						
			var cvas = document.createElement('canvas');
			cvas.width = data.width;
			cvas.height = data.height;
			
			var ctx = cvas.getContext('2d');
			ctx.putImageData(data.iDat, 0, 0);

			var itemAdd = "<input id='assigned-to-0' type='checkbox' value='0' act='change-sheet-assignments'></input>"+
			"<input id='assigned-to-1' type='checkbox' value='1' act='change-sheet-assignments'></input>"+
			"<input id='assigned-to-2' type='checkbox' value='2' act='change-sheet-assignments'></input>"+
			"<input id='assigned-to-3' type='checkbox' value='3' act='change-sheet-assignments'></input>";
			
			item.innerHTML += itemAdd;
			
			item.appendChild(cvas);			
			list.appendChild(item);			
		
	},
	/*SHEET LOADING END*/
	
	/* STAGE MANAGMENT */
	'make-stage-active' : function(e, parent){
		var sID = parseInt(e.target.getAttribute('t'));
		if(sID == parent._project.activeStage){return};
		parent._project.activePlane = -1;		
		parent._project.activeStage = sID;	
		TM.EDITOR.ACTS['refreshUI'](e, parent);
		
	},
	'make-plane-active' : function(e, parent){
		var sID = parseInt(e.target.getAttribute('p'));
		if(sID != parent._project.activeStage){return};
		var pID = parseInt(e.target.getAttribute('t'));
		if(pID == parent._project.activePlane){return};
		parent._project.activePlane = pID;		
		TM.EDITOR.ACTS['refreshUI'](e, parent);		
	},
	'add-plane' : function(e, parent){
		var sID = parseInt(e.target.getAttribute('t'));
		var stage = parent._project.stages[sID];
		stage['add-plane']();
		TM.EDITOR.ACTS['refreshUI'](e, parent);
		parent._refresh();		
	},
	'add-layer' : function(e, parent){
		var sID = parseInt(e.target.getAttribute('p'));
		var pID = parseInt(e.target.getAttribute('t'));	
		var plane = parent._project.stages[sID].planes[pID];
		plane._addLayer(plane);
		TM.EDITOR.ACTS['refreshUI'](e, parent);
	},
	'stage-settings' : function(e, parent){
		var sID = parseInt(e.target.getAttribute('t'));
		var pane = document.body.querySelector('.pane.active');
		if(pane){pane.classList.remove('active');}
		pane = document.body.querySelector('[id="stage-settings"].pane');
		pane.querySelector('[id="stage-id"]').value = sID;
		
		var stage = parent._project.stages[sID];
		pane.querySelector('[id="stage-name"]').value = stage.name; 
		pane.querySelector('[id="stage-width"]').value = stage.stageSize.x; 
		pane.querySelector('[id="stage-height"]').value = stage.stageSize.y;
			
		pane.classList.add('active');
		
	},
	'stage-settings-update' : function(e, parent){
		var pane = document.body.querySelector('[id="stage-settings"].pane');
		pane.classList.remove('active');
		
		var sID = parseInt(pane.querySelector('[id="stage-id"]').value);		
		var stage = parent._project.stages[sID];
		stage.name = pane.querySelector('[id="stage-name"]').value;
		stage.stageSize.x =  parseFloat(pane.querySelector('[id="stage-width"]').value);  
		stage.stageSize.y =  parseFloat(pane.querySelector('[id="stage-height"]').value);
		
		TM.EDITOR.ACTS['refreshUI'](e, parent);
		parent._refresh(true);
		
		
	},
	'plane-settings' : function(e, parent){
		var sID = parseInt(e.target.getAttribute('p'));
		var pID = parseInt(e.target.getAttribute('t'));
		var pane = document.body.querySelector('.pane.active');
		if(pane){pane.classList.remove('active');}
		pane = document.body.querySelector('[id="plane-settings"].pane');
		pane.querySelector('[id="stage-id"]').value = sID;
		pane.querySelector('[id="plane-id"]').value = pID;
		
		var plane = parent._project.stages[sID].planes[pID];

			console.log(plane);	
		
		pane.querySelector('[id="plane-name"]').value = plane.name; 
		pane.querySelector('[id="plane-offset-x"]').value = plane.planeOffset.x; 
		pane.querySelector('[id="plane-offset-y"]').value = plane.planeOffset.y; 
		pane.querySelector('[id="plane-scale"]').value = plane.planeScale;
		pane.querySelector('[id="plane-move-scale-x"]').value = plane.planeMoveScale.x;
		pane.querySelector('[id="plane-move-scale-y"]').value = plane.planeMoveScale.y;
		
		pane.classList.add('active');
		
	},
	'plane-settings-update' : function(e, parent){		
		pane = document.body.querySelector('[id="plane-settings"].pane');
		pane.classList.remove('active');
		var sID = pane.querySelector('[id="stage-id"]').value;
		var pID = pane.querySelector('[id="plane-id"]').value;
		
		var plane = parent._project.stages[sID].planes[pID];
	
		
		plane.name = pane.querySelector('[id="plane-name"]').value; 
		plane.planeOffset.x = parseFloat(pane.querySelector('[id="plane-offset-x"]').value); 
		plane.planeOffset.y = parseFloat(pane.querySelector('[id="plane-offset-y"]').value); 
		plane.planeScale = parseFloat(pane.querySelector('[id="plane-scale"]').value);
		plane.planeMoveScale.x =  parseFloat(pane.querySelector('[id="plane-move-scale-x"]').value);
		plane.planeMoveScale.y =  parseFloat(pane.querySelector('[id="plane-move-scale-y"]').value);
		
		
		TM.EDITOR.ACTS['refreshUI'](e, parent);
		parent._refresh(true);		
		
	},
	'assign-sheet': function(e, parent){
		var sID = parseInt(e.target.getAttribute('p'));
		var pID = parseInt(e.target.getAttribute('t'));
		var pane = document.body.querySelector('.pane.active');
		if(pane){pane.classList.remove('active');}
		pane = document.body.querySelector('[id="assign-sheets"].pane');
		pane.querySelector('[id="stage-id"]').value = sID;
		pane.querySelector('[id="plane-id"]').value = pID;
		
		pane.classList.add('active');
	},
	'change-sheet-assignments' : function(e, parent){
		var pane = document.body.querySelector('[id="assign-sheets"].pane');
		var list = pane.querySelector('[id="sheet-list"]');
		
		var item = e.target.parentNode;
		var selects = item.querySelectorAll('input[type="checkbox"]');
		for(var i = 0; i<selects.length; i++){
			selects[i].checked = false;
		}
		e.target.checked = true;
		
		var id = parseInt(item.getAttribute('id'));
		
		var items = list.querySelectorAll('div');
		for(var i = 0; i<items.length; i++){
			if(id==i){continue};
			(items[i].querySelector('input[type="checkbox"][value="'+e.target.getAttribute('value')+'"]')).checked = false;
		}		
	},
	'accept-sheet-assignments': function(e, parent){
		var pane = document.body.querySelector('[id="assign-sheets"].pane');
		var sID = parseInt(pane.querySelector('[id="stage-id"]').value);
		var pID = parseInt(pane.querySelector('[id="plane-id"]').value);
		var plane = parent._project.stages[sID].planes[pID];
		
		var list = pane.querySelector('[id="sheet-list"]');
		
		var checked = list.querySelectorAll('input[type="checkbox"]:checked');
		
		pane.classList.remove('active');
		
		var out = new Array(4);
		
		for(var i=0; i<checked.length; i++){
			var value = parseInt(checked[i].value);
			var sheet = checked[i].parentNode.getAttribute('id');
			sheet = parent._project.assets.sheets[sheet];
			out[value] = sheet;
		}
		
		for(var i=0; i<out.length; i++){
				if(!out[i]){out.splice(i,1); i--;}
		}
		
		plane._assignedSheets = out;
		plane._rebuild();
		
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
				tileSize : sheet.tileSize,
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
			
			var project = new TM.PROJECT(parent);
			
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

TM.PROJECT = function(parent){
	this._parent = parent;
	this.name = 'New Project';
	this.stages = [];
	this.assets = {
		sheets : []		
	};
	this.activeStage = -1;
	this.activePlane = -1;
	this.activeLayer = -1;
	return this;
};

TM.STAGE = function(parent){
	this._parent = parent;
	this.name = 'New Stage';	
	this.planes = [];
	this.actors = [];
	
	this.viewOffset = new BABYLON.Vector2(0,0);
	this.spriteScale = 1.0;
	this.viewZoom = 1.0;
	this.spriteSize = 32.0;
	
	this.stageSize = new BABYLON.Vector2(10,10);
	
	
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
	this.name = 'New Plane';
	this.layers = [];
	this._assignedSheets = [];
	
	this.planeOffset = new BABYLON.Vector2(0,0);
	this.planeScale = 1.0;
	this.planeMoveScale = new BABYLON.Vector2(1.0,1.0);
	this._clearMouse = false;
	this._isActive = false;
	this._buildShader();
	this._setAll();
	this._buildMesh();
	
};

TM.PLANE.prototype = {
	_buildMesh : function(){
		console.log(this.name+":REFRESH");
		var scene = this._core.scene;
		var engine = this._core.engine;
		if(this.mesh){this.mesh.dispose();}else{engine.resize();}
		var c = scene.activeCamera;
		var fov = c.fov;
		var aspectRatio = engine.getAspectRatio(c);
		var d = c.position.length();
		var y = 2 * d * Math.tan(fov / 2);
		var x = y * aspectRatio;		
		this.mesh = BABYLON.MeshBuilder.CreatePlane("output-plane", {width: x, height:y}, this._core.scene);
		this.mesh.material = this.shader;
	},
	_buildShader : function(){
		var defines = [];
		defines.push('precision highp float;');
		
		if(this._assignedSheets.length){
		defines.push("#define SHEETS "+this._assignedSheets.length);
		}
		
		if(this.layers.length){
		defines.push("#define LAYERS "+this.layers.length);
		}
		
		this.shader = new BABYLON.ShaderMaterial("basicShader", this._core.scene, {
			vertex: "editor",
			fragment: "editor",
			},{
			attributes: ["position", "normal", "uv"],
			defines: defines,
			samplers: ['layers', 'sprites'],
			uniforms: ["world",
			"worldView", 
			"worldViewProjection",
			"view", "viewOffset",
			"viewportSize",
			"time", "spriteSize", "inverseSheetSizes",
			"isActive"
			]
			});			
	},
	_rebuild : function(){
		this._buildShader();
		this._setAll();
		this.mesh.material = this.shader;
	},
	_setAll : function(){
		this._setViewportSize();
		this._setViewOffset();
		this._setInverseStageSize();
		this._setSpriteSize();
		this._setSheets();
		this._setLayers();
	},
	_setMousePos : function(){
		if(this._core._mousePos){
		var pickResult = this._core.scene.pick(this._core._mousePos.x, this._core._mousePos.y);
		this._clearMouse = false;
		//console.log(pickResult);
		}else{
			this._clearMousePos();
		}
	},
	_clearMousePos : function(){
		this.shader.setVector2('mousePos', new BABYLON.Vector2(-1.0,-1.0));
		this._clearMouse = true;
	},
	_setViewportSize : function(){
		this.viewportScaled = new BABYLON.Vector2(this._core.viewportSize.x/((this._parent.viewZoom+this._parent.spriteScale+this.planeScale)/3), this._core.viewportSize.y/((this._parent.viewZoom+this._parent.spriteScale+this.planeScale)/3));
		this.shader.setVector2('viewportSize', this.viewportScaled);
	},
	_setViewOffset : function(){
		this.shader.setVector2('viewOffset', this._parent.viewOffset);
	},
	_setSpriteSize : function(){
		this.shader.setFloat('spriteSize', this._parent.spriteSize);
	},
	_setInverseStageSize : function(){
		this.inverseStageSize = new BABYLON.Vector2(1/this._parent.stageSize.x, 1/this._parent.stageSize.y);
		this.shader.setVector2('inverseStageSize', this.inverseStageSize);
	},
	_setSheets : function(){
		this.shader.setTextureArray('sprites', this._assignedSheets);
	},
	_setLayers : function(){
		var la = [];
		for(var i = 0; i < this.layers.length; i++){
			la.push(this.layers[i].map);
		}
		this.shader.setTextureArray('layers', la);
	},
	_resize : function(){
		this._buildMesh();
		this._setViewportSize();
	},	
	_serialize : function(){
		
	},
	_addLayer : function(){
		if(this.layers.length < 4){
			var layer = new TM.LAYER(this);
			this.layers.push(layer);
		}
		this._rebuild();
	},
	_addSheet : function(sheet){
		if(this._assignedSheets.length < 4){
			this._assignedSheets.push(sheet);
		}
		this._rebuild();
	},
	_setActive : function(state){
		if(state){state=1.0;}else{state=0.0;}
		this._isActive = state;
		this.shader.setFloat('isActive', state);		
	},
	
};

TM.LAYER = function(parent){
	this._parent = parent;
	this._core = parent._core;
	this.map = new BABYLON.DynamicTexture(parent.name+"-layer-"+parent.layers.length, {width:parent._parent.stageSize.x , height:parent._parent.stageSize.y}, this._core.scene, false, 1);	
	this.context = this.map._context;
		this.context.fillStyle = 'rgba(0, 0, 0, 1.0)';
		this.context.fillRect(0, 0, 10, 10);
		this.map.update(false);
		
	
};

TM.LAYER.prototype = {
	
};












