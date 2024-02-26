import { el } from './dom.mjs';

const GL = WebGL2RenderingContext;

export class Preview {
  constructor() {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.dx = 0;
    this.dy = 0;
    this.scale = 16;
    this.dragging = null;
    this.imageBitmap = null;
    this.stitchImageBitmap = null;
    this.ready = false;
    this.dirty = false;
    this.designW = 1;
    this.designH = 1;

    this.canvas = el('canvas', { 'class': 'grid-view-image' });
    this.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
    }, { passive: false });

    this.canvas.addEventListener('webglcontextrestored', () => {
      this.ready = false;
      this._init();
    }, { passive: true });

    this.ctx = this.canvas.getContext('webgl2', {
      depth: false,
      stencil: false,
      antialias: false,
      preserveDrawingBuffer: false,
    });

    this._md = this._md.bind(this);
    this._mm = this._mm.bind(this);
    this._mu = this._mu.bind(this);
    this._mc = this._mc.bind(this);
    this.render = this.render.bind(this);

    this.canvas.addEventListener('pointerdown', this._md, { passive: false });
    this.canvas.addEventListener('contextmenu', prevent, { passive: false });
    window.addEventListener('resize', this.render, { passive: true });

    const stitch = new Image();
    stitch.addEventListener('error', (e) => {
      console.error(e);
    });
    stitch.addEventListener('load', async () => {
      this.stitchImageBitmap = await createImageBitmap(stitch);
      this._init();
    });
    stitch.src = './stitch.png';
  }

  _removePointerEvents() {
    if (this.dragging) {
      window.removeEventListener('pointermove', this._mm);
      window.removeEventListener('pointerup', this._mu);
      window.removeEventListener('pointercancel', this._mc);
      this.canvas.releasePointerCapture(this.dragging.pointer);
      this.dragging = null;
    }
  }

  destroy() {
    this.canvas.removeEventListener('pointerdown', this._md);
    this.canvas.removeEventListener('contextmenu', prevent);
    window.removeEventListener('resize', this.render);
    this._removePointerEvents();
  }

  _md(e) {
    if (this.dragging) {
      return;
    }
    e.preventDefault();
    this.dragging = { pointer: e.pointerId, x: e.clientX, y: e.clientY, dx0: this.dx, dy0: this.dy };
    this.canvas.setPointerCapture(e.pointerId);
    window.addEventListener('pointermove', this._mm, { passive: false });
    window.addEventListener('pointerup', this._mu, { passive: false });
    window.addEventListener('pointercancel', this._mc, { passive: true });
    this._mm(e);
  }

  _mm(e) {
    if (e.pointerId !== this.dragging.pointer) {
      return;
    }
    e.preventDefault();
    const mx = e.clientX - this.dragging.x;
    const my = e.clientY - this.dragging.y;
    const newDX = this.dragging.dx0 - mx / this.scale;
    const newDY = this.dragging.dy0 - my / this.scale;
    if (newDX !== this.dx || newDY !== this.dy) {
      this.dx = newDX;
      this.dy = newDY;
      if (!this.dirty) {
        this.dirty = true;
        window.requestAnimationFrame(this.render);
      }
    }
  }

  _mu(e) {
    if (e.pointerId !== this.dragging.pointer) {
      return;
    }
    this._mm(e);
    this._removePointerEvents();
  }

  _mc(e) {
    if (e.pointerId !== this.dragging.pointer) {
      return;
    }
    this._removePointerEvents();
  }

  async setTextureFrom(canvas) {
    if (this.imageBitmap) {
      this.imageBitmap.close();
      this.imageBitmap = null;
    }
    this.imageBitmap = await createImageBitmap(canvas);
    this._updateDesign();
    this.render();
  }

  _updateDesign() {
    const ctx = this.ctx;
    if (ctx.isContextLost() || !this.ready || !this.imageBitmap) {
      return;
    }
    ctx.activeTexture(GL.TEXTURE1);
    this.designW = this.imageBitmap.width;
    this.designH = this.imageBitmap.height;
    ctx.texImage2D(
      GL.TEXTURE_2D,
      0,
      GL.RGBA,
      this.designW,
      this.designH,
      0,
      GL.RGBA,
      GL.UNSIGNED_BYTE,
      this.imageBitmap,
    );
  }

  _init() {
    const ctx = this.ctx;
    if (ctx.isContextLost()) {
      console.error('cannot initialise: context lost');
      return;
    }
    if (!this.stitchImageBitmap) {
      return;
    }

    this.stitchTex = ctx.createTexture();
    ctx.activeTexture(GL.TEXTURE0);
    ctx.bindTexture(GL.TEXTURE_2D, this.stitchTex);
    ctx.texImage2D(
      GL.TEXTURE_2D,
      0,
      GL.RGBA,
      this.stitchImageBitmap.width,
      this.stitchImageBitmap.height,
      0,
      GL.RGBA,
      GL.UNSIGNED_BYTE,
      this.stitchImageBitmap,
    );
    ctx.generateMipmap(GL.TEXTURE_2D);
    ctx.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_S, GL.CLAMP_TO_EDGE);
    ctx.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_T, GL.CLAMP_TO_EDGE);
    ctx.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.LINEAR);
    ctx.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.NEAREST_MIPMAP_LINEAR);

    this.designTex = ctx.createTexture();
    ctx.activeTexture(GL.TEXTURE1);
    ctx.bindTexture(GL.TEXTURE_2D, this.designTex);
    ctx.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_S, GL.REPEAT);
    ctx.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_T, GL.REPEAT);
    ctx.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.NEAREST);
    ctx.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.NEAREST);

    this.vShader = ctx.createShader(GL.VERTEX_SHADER);
    ctx.shaderSource(this.vShader, STITCH_VERTEX_SHADER);
    ctx.compileShader(this.vShader);

    this.fShader = ctx.createShader(GL.FRAGMENT_SHADER);
    ctx.shaderSource(this.fShader, STITCH_FRAGMENT_SHADER);
    ctx.compileShader(this.fShader);

    this.stitchProg = ctx.createProgram();
    ctx.attachShader(this.stitchProg, this.vShader);
    ctx.attachShader(this.stitchProg, this.fShader);
    ctx.linkProgram(this.stitchProg);
    ctx.validateProgram(this.stitchProg);

    if (
      !ctx.getShaderParameter(this.vShader, GL.COMPILE_STATUS) ||
      !ctx.getShaderParameter(this.fShader, GL.COMPILE_STATUS) ||
      !ctx.getProgramParameter(this.stitchProg, GL.LINK_STATUS) ||
      !ctx.getProgramParameter(this.stitchProg, GL.VALIDATE_STATUS)
    ) {
      console.error(
        ctx.getShaderInfoLog(this.vShader) + '\n\n' +
        ctx.getShaderInfoLog(this.fShader) + '\n\n' +
        ctx.getProgramInfoLog(this.stitchProg),
      );
      return;
    }

    this.stitchProgPos = ctx.getAttribLocation(this.stitchProg, 'pos');
    this.stitchProgDimX = ctx.getUniformLocation(this.stitchProg, 'dimx');
    this.stitchProgOrigin = ctx.getUniformLocation(this.stitchProg, 'origin');
    this.stitchProgDelta = ctx.getUniformLocation(this.stitchProg, 'delta');
    this.stitchProgDesignOrigin = ctx.getUniformLocation(this.stitchProg, 'designOrigin');
    this.stitchProgDesignDelta = ctx.getUniformLocation(this.stitchProg, 'designDelta');
    this.stitchProgSize = ctx.getUniformLocation(this.stitchProg, 'size');
    this.stitchProgStitch = ctx.getUniformLocation(this.stitchProg, 'stitch');
    this.stitchProgDesign = ctx.getUniformLocation(this.stitchProg, 'design');

    ctx.clearColor(0, 0, 0, 1);
    ctx.enable(GL.BLEND);
    ctx.blendEquation(GL.FUNC_ADD);
    ctx.blendFunc(GL.ONE, GL.ONE);

    const buf = ctx.createBuffer();
    ctx.bindBuffer(GL.ARRAY_BUFFER, buf);
    ctx.bufferData(GL.ARRAY_BUFFER, new Float32Array([
      0.0, 0.0,
      1.0, 0.0,
      0.0, 1.0,
      1.0, 1.0,
    ]), GL.STATIC_DRAW);
    const vao = ctx.createVertexArray();
    ctx.bindVertexArray(vao);
    ctx.enableVertexAttribArray(this.stitchProgPos);
    ctx.vertexAttribPointer(this.stitchProgPos, 2, GL.FLOAT, false, 0, 0);
    ctx.vertexAttribDivisor(this.stitchProgPos, 0);

    ctx.useProgram(this.stitchProg);
    ctx.uniform1i(this.stitchProgStitch, 0);
    ctx.uniform1i(this.stitchProgDesign, 1);

    this.ready = true;
    this._updateDesign();
    this.render();
  }

  render() {
    const ctx = this.ctx;
    this.dirty = false;
    if (!this.ready) {
      return;
    }
    if (ctx.isContextLost()) {
      console.error('cannot render: context lost');
      return;
    }
    const bounds = this.canvas.getBoundingClientRect();
    const w = bounds.width;
    const h = bounds.height;
    const ww = Math.min(w * this.dpr, GL.MAX_VIEWPORT_DIMS);
    const hh = Math.min(h * this.dpr, GL.MAX_VIEWPORT_DIMS);
    if (this.canvas.width !== ww || this.canvas.height !== hh) {
      this.canvas.width = ww;
      this.canvas.height = hh;
      ctx.viewport(0, 0, ww, hh);
    }

    const nx = Math.ceil(w / this.scale) + 2;
    const ny = Math.ceil(h / this.scale) + 2;
    const sx = this.scale / w;
    const sy = this.scale / h;

    ctx.clear(GL.COLOR_BUFFER_BIT);

    const xx = Math.floor(this.dx);
    const yy = Math.floor(this.dy);

    ctx.uniform1i(this.stitchProgDimX, nx);
    ctx.uniform2f(this.stitchProgOrigin, (xx - this.dx) * sx, (yy - this.dy) * sy);
    ctx.uniform2f(this.stitchProgDelta, sx, sy);
    ctx.uniform2f(this.stitchProgDesignOrigin, (xx / this.designW) % 1, (yy / this.designH) % 1);
    ctx.uniform2f(this.stitchProgDesignDelta, 1 / this.designW, 1 / this.designH);
    ctx.uniform2f(this.stitchProgSize, 2 * sx, 2 * sy);

    ctx.drawArraysInstanced(GL.TRIANGLE_STRIP, 0, 4, nx * ny);

    ctx.flush();
  }
}

const STITCH_VERTEX_SHADER = `#version 300 es
precision mediump float;

uniform int dimx;
uniform vec2 origin;
uniform vec2 delta;
uniform vec2 designOrigin;
uniform vec2 designDelta;
uniform vec2 size;

in vec2 pos;

out vec2 stitchUV;
out vec2 designUV;

void main(void) {
  vec2 p = vec2(gl_InstanceID % dimx, gl_InstanceID / dimx);
  stitchUV = pos;
  designUV = designOrigin + p * designDelta;
  gl_Position = vec4(
    (origin + p * delta + (pos - 0.5) * size - 0.5) * vec2(2.0, -2.0),
    0.0,
    1.0
  );
}`;

const STITCH_FRAGMENT_SHADER = `#version 300 es
precision mediump float;

uniform sampler2D stitch;
uniform sampler2D design;

in vec2 stitchUV;
in vec2 designUV;
out vec4 col;

void main(void) {
  vec3 c = texture(stitch, stitchUV).xyz * (texture(design, designUV).xyz * 0.9 + 0.1);
  col = vec4(pow(c, vec3(0.7)) * 1.05, 1.0);
}`;

function prevent(e) {
  e.preventDefault();
}
