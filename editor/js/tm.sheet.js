TM = TM || {};

TM.SHEET = function(args, parent){
	this.args = args || {};
	this.parent = parent || null;
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
		this.name = (document.getElementById('sheet-name')).value;
		this.tileSize = parseInt((document.getElementById('sheet-tile-size')).value);
		var hc = document.getElementById('hiddenCanvas');
		this.iDat = (hc.getContext('2d')).getImageData(0,0,hc.width, hc.height);
		var size = {x:Math.floor(hc.width/this.tileSize), y:Math.floor(hc.height/this.tileSize)};
		
		var tempCvas = document.createElement('canvas');
		tempCvas.width = size.width;
		tempCvas.height = size.height;
		var tempCtx = tempCvas.getContext('2d');
		
		this.animationDat = tempCtx.getImageData(0,0, size.x, size.y);		
			
		var i = 0;
		for(var y=0; y<size.y; y++){
			for(var x=0; x<size.x; x++){
				var id = x+":"+y;
				var dat = animationData[id];
				var r,g,b;
				if(dat){
					r = dat.type;
					g = Math.floor(255*dat.sMul);
					b = Math.floor(255*dat.sDiv);
					if(r==0){
					r = 0; g = 0; b = 0;
					}					
				}else{
					r = 0; g = 0; b = 0;				
				}	
				
				this.animationDat.data[i] = r;
				this.animationDat.data[i+1] = g;
				this.animationDat.data[i+2] = b;
				
				if(r==0&&g==0&&b==0){
					this.animationDat.data[i+3] = 0;
				}else{
					this.animationDat.data[i+3] = 1;
				}				
				
				i+=4;
				
			}
		}		
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
	_import : function(file){
		
		
	},
};