TM = TM || {};

TM.SHEET = function(args, parent){
	this.args = args;
	this.parent = parent;
	this.name = 'blank-sheet';
	this.iDat = null;
	this.texture = null;
	this.animationDat = null;
	this.animationMap = null;
	this.tileSize = null;	
	return this;
};

TM.SHEET.prototype = {
	_buildFromEditor : function(animationData){
		this.name = (document.getElementById('name')).value;
		this.tileSize = parseInt((document.getElementById('size')).value);
		var hc = document.getElementById('hiddenCanvas');
		this.iDat = (hc.getContext('2d')).getImageData(0,0,hc.width, hc.height);
		var size = {x:Math.floor(hc.width/this.tileSize), y:Math.floor(hc.height/this.tileSize)};
		
		var tempCvas = document.createElement('canvas');
		tempCvas.width = size.width;
		tempCvas.height = size.height;
		var tempCtx = tempCvas.getContext('2d');			
			
		for(var y=0; y<size.y; y++){
			for(var x=0; x<size.x; x++){
				var id = x+":"+y;
				var dat = animationData[id];
				if(dat){
					var r = dat.type;
					var g = Math.floor(255*dat.sMul);
					var b = Math.floor(255*dat.sDiv);
					if(r==0){
						tempCtx.fillStyle = 'rgba(255, 255, 255, 0)';
					}else{
						tempCtx.fillStyle = 'rgba('+r+', '+g+', '+b+', 1)';
					}					
				}else{
					tempCtx.fillStyle = 'rgba(255, 255, 255, 0)';					
				}	
				
				tempCtx.fillRect(x, y, 1, 1);
			}
		}
		
		this.animationDat = tempCtx.getImageData(0,0,size.x, size.y);
		
		
		return this;
	},	
	_serialize : function(){
		var out = {};
		out.name = this.name;
		out.tileSize = this.tileSize;
		out.iDat = TM._convertImageData(this.iDat, false);
		out.animationDat = TM._convertImageData(this.animationDat, false);
		
		return out;		
	},
	_export : function(data){		
		data = JSON.stringify(data);		
		var a = document.createElement('a');		
			var file = new Blob([data], {type: 'text/plain'});
			a.download = this.name+'.tms';
			a.href = URL.createObjectURL(file);			
			a.click();		
	},
};