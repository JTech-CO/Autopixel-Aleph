import{rn as e}from"./DhUcoEdH.js";var t=`
float distance_to_segment(vec2 point, vec2 start, vec2 end) {
  vec2 segment = end - start;
  float projection = clamp(
    dot(point - start, segment) / max(dot(segment, segment), 0.0001),
    0.0,
    1.0
  );
  return length(point - (start + projection * segment));
}

vec4 status_marker_color(float status, vec2 source_coordinate, float pixels_per_source) {
  vec2 local = fract(source_coordinate + vec2(0.00001));
  float distance_to_mark;
  vec3 glow_color;
  vec3 core_color;

  if (status > 1.5) {
    distance_to_mark = min(
      distance_to_segment(local, vec2(0.2, 0.2), vec2(0.8, 0.8)),
      distance_to_segment(local, vec2(0.8, 0.2), vec2(0.2, 0.8))
    );
    glow_color = vec3(1.0, 0.08, 0.17);
    core_color = vec3(1.0, 0.86, 0.89);
  } else {
    distance_to_mark = min(
      distance_to_segment(local, vec2(0.28, 0.24), vec2(0.5, 0.16)),
      distance_to_segment(local, vec2(0.5, 0.16), vec2(0.72, 0.24))
    );
    distance_to_mark = min(
      distance_to_mark,
      distance_to_segment(local, vec2(0.72, 0.24), vec2(0.72, 0.43))
    );
    distance_to_mark = min(
      distance_to_mark,
      distance_to_segment(local, vec2(0.72, 0.43), vec2(0.5, 0.58))
    );
    distance_to_mark = min(
      distance_to_mark,
      distance_to_segment(local, vec2(0.5, 0.58), vec2(0.5, 0.67))
    );
    distance_to_mark = min(distance_to_mark, distance(local, vec2(0.5, 0.82)));
    glow_color = vec3(0.62, 0.69, 0.8);
    core_color = vec3(0.98, 0.99, 1.0);
  }

  float core_width = clamp(1.15 / max(pixels_per_source, 1.0), 0.06, 0.2);
  float glow_width = clamp(3.6 / max(pixels_per_source, 1.0), 0.17, 0.42);
  float core = 1.0 - step(core_width, distance_to_mark);
  float marker = 1.0 - step(glow_width, distance_to_mark);
  vec3 marker_color = glow_color;
  marker_color = mix(marker_color, core_color, core);
  return vec4(marker_color, marker);
}
`,n={center:3,diagonal:3},r={center:5,diagonal:7},i=8192,a=16777216,o=`
  if (mode != 0) {
    float pattern_resolution = max(1.0, pixel_mode_resolution);
    if (!pixel_mode_detail_supported || pixels_per_source < pattern_resolution) {
      float coverage = mode == 1
        ? pow(max(0.0, pattern_resolution - 2.0) / pattern_resolution, 2.0)
        : (pattern_resolution + 1.0) / (2.0 * pattern_resolution);
      color.a *= coverage;
    } else {
      vec2 local = floor(fract(source_coordinate + vec2(0.00001)) * pattern_resolution);
      if (mode == 1) {
        if (local.x < 1.0 || local.x >= pattern_resolution - 1.0 ||
            local.y < 1.0 || local.y >= pattern_resolution - 1.0) {
          discard;
        }
      } else if (local.x + local.y >= pattern_resolution) {
        discard;
      }
    }
  }
`,s=`
attribute vec2 a_position;
uniform vec2 u_source_origin;
uniform vec2 u_source_span;
varying highp vec2 v_source_coordinate;

void main() {
  vec2 viewport_coordinate = vec2(
    a_position.x * 0.5 + 0.5,
    0.5 - a_position.y * 0.5
  );
  v_source_coordinate = u_source_origin + viewport_coordinate * u_source_span;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`,c=`
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform sampler2D u_texture;
uniform vec2 u_source_size;
uniform int u_mode;
uniform float u_pixels_per_source;
uniform float u_pixel_mode_resolution;
uniform bool u_pixel_mode_detail_supported;
uniform bool u_status_highlights_enabled;
varying highp vec2 v_source_coordinate;

${t}

void main() {
  vec2 source_pixel = clamp(
    floor(v_source_coordinate),
    vec2(0.0),
    u_source_size - vec2(1.0)
  );
  vec4 color = texture2D(u_texture, (source_pixel + 0.5) / u_source_size);
  if (color.a < 1.0 / 255.0) {
    discard;
  }

  if (u_status_highlights_enabled) {
    float status_alpha = floor(color.a * 255.0 + 0.5);
    if (status_alpha == 253.0 || status_alpha == 254.0) {
      vec4 marker = status_marker_color(status_alpha == 254.0 ? 2.0 : 1.0, v_source_coordinate, u_pixels_per_source);
      color.a = 1.0;
      if (marker.a >= 0.5) { gl_FragColor = marker; return; }
    }
  }
  int mode = u_mode;
  float pixels_per_source = u_pixels_per_source;
  float pixel_mode_resolution = u_pixel_mode_resolution;
  bool pixel_mode_detail_supported = u_pixel_mode_detail_supported;
  vec2 source_coordinate = v_source_coordinate;
${o}

  gl_FragColor = color;
}
`;function l(e,t=n){return e===`center`?t.center:e===`diagonal`?t.diagonal:1}function u(e,t=3){return e===`center`?((t-2)/t)**2:e===`diagonal`?(t+1)/(2*t):1}function d(e,t,n){if(e<=0||t<=0)return 1;let r=Math.max(1,n||1),o=Math.min(i/e,i/t),s=Math.sqrt(a/(e*t));return Math.max(1,Math.min(r,o,s))}function f(e){let{bounds:t,scale:n}=e;if(e.viewportWidth<=0||e.viewportHeight<=0||n<=0||t.width<=0||t.height<=0||e.sourceWidth<=0||e.sourceHeight<=0)return;let r=e.offsetX+t.x*n,i=e.offsetY+t.y*n,a=t.width*n,o=t.height*n,s=Math.max(0,r),c=Math.max(0,i),l=Math.min(e.viewportWidth,r+a),u=Math.min(e.viewportHeight,i+o),f=l-s,p=u-c;if(f<=0||p<=0)return;let m=s-r,h=c-i,g=e.sourceWidth/a,_=e.sourceHeight/o,v=d(f,p,e.pixelRatio);return{left:m,top:h,width:f,height:p,outputWidth:Math.max(1,Math.round(f*v)),outputHeight:Math.max(1,Math.round(p*v)),sourceX:m*g,sourceY:h*_,sourceWidth:f*g,sourceHeight:p*_,pixelsPerSource:Math.min(a/e.sourceWidth,o/e.sourceHeight)*v}}var p=class{constructor(t,n=!0){e(this,`canvas`,void 0),e(this,`gl`,void 0),e(this,`maxOutputWidth`,void 0),e(this,`maxOutputHeight`,void 0),e(this,`maxTextureSize`,void 0),e(this,`detailSupported`,void 0),e(this,`program`,void 0),e(this,`texture`,void 0),e(this,`buffer`,void 0),e(this,`positionLocation`,void 0),e(this,`uniforms`,void 0),e(this,`uploadedSource`,void 0),e(this,`fallbackSource`,void 0),e(this,`fallbackStatusHighlights`,!1),e(this,`fallbackCanvas`,void 0),this.canvas=t;let r=null;try{r=n?t.getContext(`webgl`,{alpha:!0,antialias:!1,premultipliedAlpha:!1,preserveDrawingBuffer:!1}):null}catch{r=null}if(r!=null&&r.isContextLost()&&(r=null),this.gl=r,!r){this.maxOutputWidth=i,this.maxOutputHeight=i,this.maxTextureSize=0,this.detailSupported=!1,this.program=null,this.texture=null,this.buffer=null,this.positionLocation=-1;return}let a=r.getParameter(r.MAX_VIEWPORT_DIMS),o=r.getParameter(r.MAX_RENDERBUFFER_SIZE);if(this.maxOutputWidth=Math.min(a[0],o),this.maxOutputHeight=Math.min(a[1],o),this.maxTextureSize=r.getParameter(r.MAX_TEXTURE_SIZE),this.detailSupported=v(r),this.program=g(r,s,c),this.texture=r.createTexture(),this.buffer=r.createBuffer(),!this.program||!this.texture||!this.buffer){this.positionLocation=-1;return}this.positionLocation=r.getAttribLocation(this.program,`a_position`),this.uniforms={texture:r.getUniformLocation(this.program,`u_texture`),sourceSize:r.getUniformLocation(this.program,`u_source_size`),sourceOrigin:r.getUniformLocation(this.program,`u_source_origin`),sourceSpan:r.getUniformLocation(this.program,`u_source_span`),mode:r.getUniformLocation(this.program,`u_mode`),pixelsPerSource:r.getUniformLocation(this.program,`u_pixels_per_source`),pixelModeResolution:r.getUniformLocation(this.program,`u_pixel_mode_resolution`),pixelModeDetailSupported:r.getUniformLocation(this.program,`u_pixel_mode_detail_supported`),statusHighlights:r.getUniformLocation(this.program,`u_status_highlights_enabled`)},r.bindBuffer(r.ARRAY_BUFFER,this.buffer),r.bufferData(r.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),r.STATIC_DRAW),r.bindTexture(r.TEXTURE_2D,this.texture),h(r)}render(e){var t;if(e.outputWidth<=0||e.outputHeight<=0)return!0;if((t=this.gl)!=null&&t.isContextLost())return!1;let n=Math.min(1,this.maxOutputWidth/e.outputWidth,this.maxOutputHeight/e.outputHeight),r=Math.max(1,Math.floor(e.outputWidth*n)),i=Math.max(1,Math.floor(e.outputHeight*n)),a=e.pixelsPerSource*n;(this.canvas.width!==r||this.canvas.height!==i)&&(this.canvas.width=r,this.canvas.height=i);let o=this.gl;if(!o||!this.program||!this.texture||!this.buffer||!this.uniforms)return this.renderFallback(e,r,i,a);if(e.source.width>this.maxTextureSize||e.source.height>this.maxTextureSize)return!1;if(o.viewport(0,0,r,i),o.disable(o.BLEND),o.disable(o.DEPTH_TEST),o.disable(o.CULL_FACE),o.clearColor(0,0,0,0),o.clear(o.COLOR_BUFFER_BIT),o.useProgram(this.program),o.bindBuffer(o.ARRAY_BUFFER,this.buffer),this.positionLocation>=0&&(o.enableVertexAttribArray(this.positionLocation),o.vertexAttribPointer(this.positionLocation,2,o.FLOAT,!1,0,0)),o.activeTexture(o.TEXTURE0),o.bindTexture(o.TEXTURE_2D,this.texture),this.uploadedSource!==e.source){if(o.pixelStorei(o.UNPACK_ALIGNMENT,4),o.pixelStorei(o.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),o.texImage2D(o.TEXTURE_2D,0,o.RGBA,e.source.width,e.source.height,0,o.RGBA,o.UNSIGNED_BYTE,e.source.data),o.getError()!==o.NO_ERROR)return!1;this.uploadedSource=e.source}return o.uniform1i(this.uniforms.texture,0),o.uniform2f(this.uniforms.sourceSize,e.source.width,e.source.height),o.uniform2f(this.uniforms.sourceOrigin,e.sourceX,e.sourceY),o.uniform2f(this.uniforms.sourceSpan,e.sourceWidth,e.sourceHeight),o.uniform1i(this.uniforms.mode,m(e.mode)),o.uniform1f(this.uniforms.pixelsPerSource,a),o.uniform1f(this.uniforms.pixelModeResolution,e.patternResolution),o.uniform1i(this.uniforms.pixelModeDetailSupported,+!!this.detailSupported),o.uniform1i(this.uniforms.statusHighlights,+!!e.statusHighlights),o.drawArrays(o.TRIANGLES,0,6),!0}destroy(){let e=this.gl;e&&(this.texture&&e.deleteTexture(this.texture),this.buffer&&e.deleteBuffer(this.buffer),this.program&&e.deleteProgram(this.program)),this.fallbackCanvas&&(this.fallbackCanvas.width=0,this.fallbackCanvas.height=0),this.canvas.width=0,this.canvas.height=0}renderFallback(e,t,n,r){if(this.gl)return!1;let i=null;try{i=this.canvas.getContext(`2d`,{colorSpace:`srgb`})}catch{i=null}if(!i)return!1;if(i.clearRect(0,0,t,n),i.imageSmoothingEnabled=!1,this.fallbackCanvas||(this.fallbackCanvas=document.createElement(`canvas`)),this.fallbackSource!==e.source||this.fallbackStatusHighlights!==!!e.statusHighlights){this.fallbackCanvas.width=e.source.width,this.fallbackCanvas.height=e.source.height;let t=this.fallbackCanvas.getContext(`2d`,{colorSpace:`srgb`});if(!t)return!1;let n=e.statusHighlights?new ImageData(e.source.data.slice(),e.source.width,e.source.height):e.source;if(e.statusHighlights)for(let e=0;e<n.data.length;e+=4)n.data[e+3]===254?n.data.set([224,71,90,255],e):n.data[e+3]===253&&n.data.set([195,204,218,255],e);t.putImageData(n,0,0),this.fallbackSource=e.source,this.fallbackStatusHighlights=!!e.statusHighlights}if(e.mode===`normal`||r<e.patternResolution)return i.globalAlpha=u(e.mode,e.patternResolution),i.drawImage(this.fallbackCanvas,e.sourceX,e.sourceY,e.sourceWidth,e.sourceHeight,0,0,t,n),i.globalAlpha=1,!0;let a=Math.max(0,Math.floor(e.sourceX)),o=Math.max(0,Math.floor(e.sourceY)),s=Math.min(e.source.width,Math.ceil(e.sourceX+e.sourceWidth)),c=Math.min(e.source.height,Math.ceil(e.sourceY+e.sourceHeight)),l=t/e.sourceWidth,d=n/e.sourceHeight;for(let t=o;t<c;t++)for(let n=a;n<s;n++){let r=(t*e.source.width+n)*4,a=e.source.data[r+3];if(a===0)continue;let o=(n-e.sourceX)*l,s=(t-e.sourceY)*d,c=(n+1-e.sourceX)*l,u=(t+1-e.sourceY)*d,f=e.statusHighlights&&(a===254||a===253);if(i.fillStyle=f?a===254?`rgb(224 71 90)`:`rgb(195 204 218)`:`rgba(${e.source.data[r]}, ${e.source.data[r+1]}, ${e.source.data[r+2]}, ${a/255})`,e.mode===`center`){let t=(c-o)/e.patternResolution,n=(u-s)/e.patternResolution;i.fillRect(o+t,s+n,c-o-t*2,u-s-n*2)}else{let t=(c-o)/e.patternResolution,n=(u-s)/e.patternResolution;for(let r=0;r<e.patternResolution;r++)i.fillRect(o,s+r*n,t*(e.patternResolution-r),n)}}return!0}};function m(e){return e===`center`?1:e===`diagonal`?2:0}function h(e){e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE)}function g(e,t,n){let r=_(e,e.VERTEX_SHADER,t),i=_(e,e.FRAGMENT_SHADER,n),a=e.createProgram();return!r||!i||!a?(r&&e.deleteShader(r),i&&e.deleteShader(i),a&&e.deleteProgram(a),null):(e.attachShader(a,r),e.attachShader(a,i),e.linkProgram(a),e.deleteShader(r),e.deleteShader(i),e.getProgramParameter(a,e.LINK_STATUS)?a:(e.deleteProgram(a),null))}function _(e,t,n){let r=e.createShader(t);return r?(e.shaderSource(r,n),e.compileShader(r),e.getShaderParameter(r,e.COMPILE_STATUS)?r:(e.deleteShader(r),null)):null}function v(e){var t;return(((t=e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.HIGH_FLOAT))==null?void 0:t.precision)??0)>0}export{f as a,p as i,r as n,l as o,o as r,t as s,n as t};