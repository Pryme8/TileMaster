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
		}

		return out;
	}
};




