TM = {
	_glslBank : {
	},
	_convertImageData : function(data, compressed){
		var out;
		if(!compressed){
			out = {};
			out.width = data.width;
			out.height = data.height;
			out.data = [];
			for(var i=0; i<data.data.length; i++){
				out.data.push(data.data[i]);
			}			
		}else{
			var tmpCvas = document.createElement('canvas');
			var ctx = tmpCvas.getContext('2d');
			var iDat = ctx.createImageData(data.width, data.height);
			var d = iDat.data;		
			for (var i = 0; i < d.length; i += 4) {
				d[i]     = data.data[i];    
				d[i + 1] = data.data[i + 1]; 
				d[i + 2] = data.data[i + 2]; 
				d[i + 3] = data.data[i + 3]; 
			}
			out = iDat;
			delete tmpCvas;
			delete ctx;
		}
		return out;
	}
};




