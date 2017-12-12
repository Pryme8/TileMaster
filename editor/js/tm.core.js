TM = {
	_glslBank : {
		editors : {
			sheetMain :{
vs:
`precision highp float;
// Attributes
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
// Uniforms
uniform mat4 worldViewProjection;

uniform vec2 viewOffset;
uniform vec2 viewportSize;
uniform vec2 sheetSize;

varying vec3 vPosition;
varying vec2 vUV;
varying vec2 pixelCoord;


void main() {
    vec4 p = vec4( position, 1. );    
	vPosition = p.xyz;
	
	gl_Position = worldViewProjection * p;	
	vUV = uv;
	vUV.y = 1.0 - vUV.y;
	
	pixelCoord = (vUV * viewportSize) + viewOffset;
	
}`,
fs:
`uniform vec2 viewOffset;
uniform vec2 viewportSize;
uniform sampler2D sprite;
uniform vec2 sheetSize;
uniform vec2 mousePos;
uniform float tileSize;
uniform vec2 selectedTile;

varying vec3 vPosition;
varying vec2 vUV;
varying vec2 pixelCoord;

void main(){
	vec2 sCoord = pixelCoord/sheetSize;
	if(sCoord.x < 0.  || sCoord.x > 1. || sCoord.y < 0.  || sCoord.y > 1. ){discard;}	
	vec4 cSample = texture2D(sprite, sCoord);	
	vec3 color = cSample.xyz;
	float alpha = cSample.a;
	
	float tileHS = tileSize*0.5;
	
	vec2 tID = floor(pixelCoord/tileSize);
	vec2 mPos = floor(mousePos/tileSize);
	
	vec3 cursorColor = vec3(1.0, 0.5, 1.0);
	vec3 selectedColor = vec3(0.0, 1.0, 1.0);
	
	if(tID == selectedTile){
			color = mix(color, selectedColor, 0.65);
			if(alpha == 0.0){alpha = 1.0;}
	}else{
		if(tID == mPos){
			color = mix(color, cursorColor, 0.65);
			if(alpha == 0.0){alpha = 1.0;}
		}
	}
	
		
	if(alpha == 0.){discard;}
	
	gl_FragColor =  vec4(color, alpha);
}`,			
			},			
			sheetPreview :{
vs:
`precision highp float;
// Attributes
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
// Uniforms
uniform mat4 worldViewProjection;

varying vec3 vPosition;
varying vec2 vUV;



void main() {
    vec4 p = vec4( position, 1. );    
	vPosition = p.xyz;	
	gl_Position = worldViewProjection * p;	
	vUV = uv;
	vUV.y = 1.0 - vUV.y;
}`,
fs:
`uniform sampler2D sprite;
uniform float tileSize;
uniform vec2 selectedTile;
uniform vec2 sheetSize;
uniform float animationType;
uniform float time;
uniform float animationSpeedMul;
uniform float animationSpeedDiv;

varying vec3 vPosition;
varying vec2 vUV;

void main(){
	vec3 color = vec3(1.0);
	float alpha = 1.0;
	vec2 tMax = sheetSize/tileSize;
	int _f;
	vec2 _selectedTile = selectedTile;
	if(selectedTile.x >= 0.0 && selectedTile.y >= 0.0 && selectedTile.x <= tMax.x && selectedTile.y <= tMax.y){
		vec2 pUnit = 1.0/tMax;
		
		float _time = (time/animationSpeedMul)*animationSpeedDiv;
		
		if(animationType == 1.0){
			_f = int(mod(_time, 2.));
			if(_f == 1){_selectedTile.x+=1.0;}
		}else if(animationType == 2.){
			_f = int(mod(_time, 2.));
			if(_f == 1){_selectedTile.y+=1.0;}
		}else if(animationType == 4.){
			_f = int(mod(_time, 4.));
				if(_f == 1){_selectedTile.x+=1.0;}
				if(_f == 2){_selectedTile.x+=2.0;}
				if(_f == 3){_selectedTile.x+=3.0;}
		}else if(animationType == 5.){
			_f = int(mod(_time, 4.));
				if(_f == 1){_selectedTile.x+=1.;}
				if(_f == 2){_selectedTile.y+=1.;}
				if(_f == 3){_selectedTile.x+=1.;_selectedTile.y+=1.;}
		}else if(animationType == 8.){
			_f = int(mod(_time, 6.));
				if(_f == 1){_selectedTile.x+=1.;}
				if(_f == 2){_selectedTile.x+=2.;}
				if(_f == 3){_selectedTile.y+=1.;}
				if(_f == 4){_selectedTile.x+=1.;_selectedTile.y+=1.;}
				if(_f == 5){_selectedTile.x+=2.;_selectedTile.y+=1.;}
		}else if(animationType == 9.){
			_f = int(mod(_time, 6.));
				if(_f == 1){_selectedTile.x+=1.;}
				if(_f == 2){_selectedTile.y+=1.;}
				if(_f == 3){_selectedTile.x+=1.;_selectedTile.y+=1.;}
				if(_f == 4){_selectedTile.y+=2.;}
				if(_f == 5){_selectedTile.x+=1.;_selectedTile.y+=2.;}
		}else if(animationType== 10.){
			_f = int(mod(_time, 8.));
				if(_f == 1){_selectedTile.x+=1.;}
				if(_f == 2){_selectedTile.x+=2.;}
				if(_f == 3){_selectedTile.y+=1.;}
				if(_f == 4){_selectedTile.x+=1.;_selectedTile.y+=1.;}
				if(_f == 5){_selectedTile.x+=2.;_selectedTile.y+=1.;}
				if(_f == 6){_selectedTile.y+=2.;}
				if(_f == 7){_selectedTile.x+=1.;_selectedTile.y+=2.;}			
		}else if(animationType== 11.){
			_f = int(mod(_time, 9.));
				if(_f == 1){_selectedTile.x+=1.;}
				if(_f == 2){_selectedTile.x+=2.;}
				if(_f == 3){_selectedTile.y+=1.;}
				if(_f == 4){_selectedTile.x+=1.;_selectedTile.y+=1.;}
				if(_f == 5){_selectedTile.x+=2.;_selectedTile.y+=1.;}
				if(_f == 6){_selectedTile.y+=2.;}
				if(_f == 7){_selectedTile.x+=1.;_selectedTile.y+=2.;}
				if(_f == 8){_selectedTile.x+=2.;_selectedTile.y+=2.;}
		}
		
				
		vec2 offset = pUnit * _selectedTile;		
		
		vec4 cSample = texture2D(sprite, offset + (pUnit * vUV));		
		
		color = cSample.xyz;
	}	
	gl_FragColor =  vec4(color, alpha);
}`,

			}
		}		
	},
	_startEditor : function(){
		return new TM.EDITOR();
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




