import * as THREE from 'three';

// Simple 3D noise for terrain displacement
function noise3D(x, y, z) {
  let n = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = x - ix, fy = y - iy, fz = z - iz;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), sz = fz * fz * (3 - 2 * fz);

  const n000 = noise3D(ix, iy, iz);
  const n100 = noise3D(ix + 1, iy, iz);
  const n010 = noise3D(ix, iy + 1, iz);
  const n110 = noise3D(ix + 1, iy + 1, iz);
  const n001 = noise3D(ix, iy, iz + 1);
  const n101 = noise3D(ix + 1, iy, iz + 1);
  const n011 = noise3D(ix, iy + 1, iz + 1);
  const n111 = noise3D(ix + 1, iy + 1, iz + 1);

  const nx00 = n000 + sx * (n100 - n000);
  const nx10 = n010 + sx * (n110 - n010);
  const nx01 = n001 + sx * (n101 - n001);
  const nx11 = n011 + sx * (n111 - n011);
  const nxy0 = nx00 + sy * (nx10 - nx00);
  const nxy1 = nx01 + sy * (nx11 - nx01);
  return nxy0 + sz * (nxy1 - nxy0);
}

function fbm(x, y, z, octaves = 4) {
  let value = 0, amplitude = 0.5, frequency = 1, max = 0;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * smoothNoise(x * frequency, y * frequency, z * frequency);
    max += amplitude;
    amplitude *= 0.5;
    frequency *= 2.0;
  }
  return value / max;
}

export class MarsScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.clock = new THREE.Clock();
    this.scrollProgress = 0;
    this.atmosphereLevel = 3;
    this.cubeState = 'IDLE';
    this.vineLength = 0;

    this.init();
  }

  init() {
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0A0402);
    this.scene.fog = new THREE.FogExp2(0x1A0E08, 0.00008);

    // Camera
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 80);
    this.camera.position.set(0, 3.5, 9);
    this.camera.lookAt(0, 0.3, 0);

    // Camera target for smooth movement
    this.cameraTarget = new THREE.Vector3(0, 0.3, 0);
    this.targetPos = this.camera.position.clone();
    this.targetLook = this.cameraTarget.clone();

    // Lights
    this.ambientLight = new THREE.AmbientLight(0x3A2010, 0.6);
    this.scene.add(this.ambientLight);

    const sunLight = new THREE.DirectionalLight(0xFFB888, 1.2);
    sunLight.position.set(8, 6, -4);
    this.scene.add(sunLight);
    this.sunLight = sunLight;

    const rimLight = new THREE.DirectionalLight(0x4466AA, 0.3);
    rimLight.position.set(-4, 2, 6);
    this.scene.add(rimLight);

    // Build scene elements
    this.createSky();
    this.createTerrain();
    this.createDustParticles();
    this.createGreenCube();
    this.createSunSphere();
    this.createMeteors();

    // Resize handler
    window.addEventListener('resize', () => this.onResize());
  }

  createSky() {
    const geom = new THREE.SphereGeometry(30, 48, 32);
    const colors = new Float32Array(geom.attributes.position.count * 3);
    const positions = geom.attributes.position;

    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      const t = THREE.MathUtils.smoothstep(y / 30, -0.3, 1.0);
      const c = new THREE.Color();
      c.setHSL(0.09, 0.7, 0.02 + t * 0.06);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.85,
    });
    this.sky = new THREE.Mesh(geom, mat);
    this.scene.add(this.sky);
  }

  createTerrain() {
    const size = 24;
    const segments = 160;
    const geom = new THREE.PlaneGeometry(size, size, segments, segments);
    geom.rotateX(-Math.PI / 2);

    const positions = geom.attributes.position;
    const colors = new Float32Array(positions.count * 3);

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getY(i);

      // Olympus Mons broad shield shape
      const distFromCenter = Math.sqrt(x * x + z * z);
      const olympusRise = distFromCenter < 4.5
        ? (1 - distFromCenter / 4.5) * (1 - distFromCenter / 4.5) * 2.2
        : 0;

      const noiseVal = fbm(x * 0.4, z * 0.4, 0.5, 5) * 0.6;
      const smallNoise = fbm(x * 1.5, z * 1.5, 2.3, 3) * 0.2;
      const h = olympusRise + noiseVal + smallNoise - 0.3;

      positions.setZ(i, h);

      // Vertex color based on height
      const t = THREE.MathUtils.smoothstep(h, -0.3, 1.8);
      const c = new THREE.Color();
      c.setHSL(0.08, 0.85, 0.04 + t * 0.08);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geom.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.05,
      flatShading: false,
    });

    this.terrain = new THREE.Mesh(geom, mat);
    this.terrain.position.y = -2.2;
    this.scene.add(this.terrain);
  }

  createDustParticles() {
    const count = 2500;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    this.dustData = [];
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = Math.random() * 8 - 1;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
      sizes[i] = Math.random() * 0.06 + 0.01;
      this.dustData.push({
        baseX: positions[i * 3],
        baseY: positions[i * 3 + 1],
        baseZ: positions[i * 3 + 2],
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.08,
        speedZ: (Math.random() - 0.5) * 0.15,
        phase: Math.random() * Math.PI * 2,
      });
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
      color: 0xE8A87C,
      size: 0.04,
      transparent: true,
      opacity: 0.5,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });

    this.dustParticles = new THREE.Points(geom, mat);
    this.scene.add(this.dustParticles);
    this.dustOpacity = 0.5;
  }

  createGreenCube() {
    // Main cube
    const size = 0.18;
    const geom = new THREE.BoxGeometry(size, size, size, 2, 2, 2);

    // Slightly round the vertices for a softer look
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const len = Math.sqrt(x * x + y * y + z * z);
      const targetLen = size * 0.7;
      if (len > targetLen) {
        const scale = targetLen / len + (1 - targetLen / len) * 0.5;
        pos.setXYZ(i, x * scale * 0.85 + x * 0.15, y * scale * 0.85 + y * 0.15, z * scale * 0.85 + z * 0.15);
      }
    }
    geom.computeVertexNormals();

    this.cubeMaterial = new THREE.MeshStandardMaterial({
      color: 0x00AA55,
      emissive: 0x00FF88,
      emissiveIntensity: 1.8,
      roughness: 0.2,
      metalness: 0.3,
    });

    this.greenCube = new THREE.Mesh(geom, this.cubeMaterial);
    this.greenCube.position.set(1.5, 0.6, -0.8);
    this.greenCube.userData = {
      baseY: 0.6,
      baseX: 1.5,
      baseZ: -0.8,
      bobPhase: 0,
      jumpTimer: 0,
      jumpCooldown: 3 + Math.random() * 5,
      isJumping: false,
      jumpVelocity: 0,
      jumpY: 0,
    };
    this.scene.add(this.greenCube);

    // Glow sphere around cube
    const glowGeom = new THREE.SphereGeometry(0.22, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x00FF88,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
    });
    this.cubeGlow = new THREE.Mesh(glowGeom, glowMat);
    this.greenCube.add(this.cubeGlow);

    // Inner bright core
    const coreGeom = new THREE.SphereGeometry(0.06, 8, 8);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x88FFBB,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });
    this.cubeCore = new THREE.Mesh(coreGeom, coreMat);
    this.greenCube.add(this.cubeCore);

    // Vine tubes (initially very short)
    this.vineGroup = new THREE.Group();
    this.greenCube.add(this.vineGroup);
  }

  createSunSphere() {
    const geom = new THREE.SphereGeometry(0.5, 32, 32);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xFFDDAA,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.sunSphere = new THREE.Mesh(geom, mat);
    this.sunSphere.position.set(5, 7, -8);
    this.sunSphere.visible = true;
    this.scene.add(this.sunSphere);

    // Sun glow
    const glowGeom = new THREE.SphereGeometry(1.2, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xFFAA66,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.sunGlow = new THREE.Mesh(glowGeom, glowMat);
    this.sunSphere.add(this.sunGlow);
  }

  createMeteors() {
    this.meteorGroup = new THREE.Group();
    for (let i = 0; i < 20; i++) {
      const geom = new THREE.IcosahedronGeometry(0.04 + Math.random() * 0.12, 1);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x887766,
        roughness: 0.7,
        metalness: 0.4,
        transparent: true,
        opacity: 0,
      });
      const rock = new THREE.Mesh(geom, mat);
      rock.position.set(
        (Math.random() - 0.5) * 12,
        3 + Math.random() * 8,
        (Math.random() - 0.5) * 12
      );
      rock.userData = {
        orbitSpeed: 0.05 + Math.random() * 0.2,
        orbitRadius: 3 + Math.random() * 7,
        orbitY: rock.position.y,
        phase: Math.random() * Math.PI * 2,
      };
      this.meteorGroup.add(rock);
    }
    this.meteorGroup.visible = false;
    this.scene.add(this.meteorGroup);
  }

  updateVines(length) {
    // Remove old vines
    while (this.vineGroup.children.length > 0) {
      this.vineGroup.remove(this.vineGroup.children[0]);
    }

    if (length <= 0) return;

    const vineCount = Math.floor(length * 6) + 1;
    for (let i = 0; i < vineCount; i++) {
      const t = i / vineCount;
      const angle = t * Math.PI * 3 + i * 0.8;
      const radius = 0.3 + t * length * 1.5;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(Math.cos(angle) * 0.15, -0.05, Math.sin(angle) * 0.15),
        new THREE.Vector3(Math.cos(angle + 0.3) * radius * 0.5, -0.1 - length * 0.4, Math.sin(angle + 0.3) * radius * 0.5),
        new THREE.Vector3(Math.cos(angle - 0.2) * radius, -0.2 - length * 0.8, Math.sin(angle - 0.2) * radius),
      ]);

      const tubeGeom = new THREE.TubeGeometry(curve, 8, 0.012, 6, false);
      const tubeMat = new THREE.MeshStandardMaterial({
        color: 0x228844,
        emissive: 0x114422,
        emissiveIntensity: 0.6,
        roughness: 0.5,
        metalness: 0.1,
      });
      const tube = new THREE.Mesh(tubeGeom, tubeMat);
      this.vineGroup.add(tube);
    }
  }

  setCubeState(state) {
    this.cubeState = state;
  }

  updateCube(dt) {
    const cube = this.greenCube;
    const ud = cube.userData;

    // Jumping physics (separate from bobbing)
    if (!ud.isJumping) {
      ud.jumpTimer += dt;
      const jumpInterval = this.cubeState === 'AGITATED' ? 0.8 : this.cubeState === 'DIM' ? 8 : 3;
      if (ud.jumpTimer > ud.jumpCooldown) {
        ud.isJumping = true;
        ud.jumpVelocity = 0.3 + Math.random() * 0.5;
        ud.jumpTimer = 0;
        ud.jumpCooldown = jumpInterval * (0.6 + Math.random() * 0.8);
        ud.jumpOffset = 0;
      }
    } else {
      ud.jumpOffset += ud.jumpVelocity * dt * 3;
      ud.jumpVelocity -= dt * 2.5;
      if (ud.jumpOffset <= 0 && ud.jumpVelocity < 0) {
        ud.jumpOffset = 0;
        ud.isJumping = false;
        ud.jumpVelocity = 0;
      }
    }
    if (!ud.jumpOffset) ud.jumpOffset = 0;

    // Bobbing + jump offset
    ud.bobPhase += dt * 1.2;
    const bobAmp = this.cubeState === 'AGITATED' ? 0.15 : this.cubeState === 'DIM' ? 0.03 : 0.06;
    const bobSpeed = this.cubeState === 'AGITATED' ? 2.5 : this.cubeState === 'DIM' ? 0.4 : 1.2;
    cube.position.y = ud.baseY + ud.jumpOffset + Math.sin(ud.bobPhase * bobSpeed) * bobAmp;

    // Rotation
    const rotSpeed = this.cubeState === 'AGITATED' ? 1.8 : this.cubeState === 'DIM' ? 0.3 : 0.7;
    cube.rotation.y += dt * rotSpeed;
    cube.rotation.x += dt * rotSpeed * 0.3;
    cube.rotation.z += dt * rotSpeed * 0.15;

    // Emissive pulsing
    const pulseFreq = this.cubeState === 'AGITATED' ? 3.0 : this.cubeState === 'DIM' ? 0.3 : 0.8;
    const pulseAmp = this.cubeState === 'AGITATED' ? 1.2 : this.cubeState === 'DIM' ? 0.3 : 0.5;
    const baseEmissive = this.cubeState === 'AGITATED' ? 2.2 : this.cubeState === 'DIM' ? 0.8 : 1.8;
    this.cubeMaterial.emissiveIntensity = baseEmissive + Math.sin(Date.now() * 0.001 * pulseFreq) * pulseAmp;

    // Glow opacity
    this.cubeGlow.material.opacity = 0.06 + (this.cubeMaterial.emissiveIntensity / 3) * 0.12;
  }

  updateDust(dt) {
    const positions = this.dustParticles.geometry.attributes.position;
    for (let i = 0; i < this.dustData.length; i++) {
      const d = this.dustData[i];
      let idx = i * 3;
      positions.array[idx] = d.baseX + Math.sin(Date.now() * 0.0003 + d.phase) * 4;
      positions.array[idx + 1] = d.baseY + Math.cos(Date.now() * 0.0005 + d.phase) * 1.5;
      positions.array[idx + 2] = d.baseZ + Math.cos(Date.now() * 0.0004 + d.phase) * 3;
    }
    positions.needsUpdate = true;

    // Opacity based on atmosphere level (1-5) and scroll
    const atmFactor = this.atmosphereLevel / 3; // 0.33 ~ 1.67
    const targetOpacity = this.dustOpacity * atmFactor;
    this.dustParticles.material.opacity += (targetOpacity - this.dustParticles.material.opacity) * 0.02;

    // Atmosphere also affects scene brightness (dramatic range)
    const targetExposure = 1.5 - (this.atmosphereLevel - 1) * 0.35; // 1.5 → 0.1
    this.renderer.toneMappingExposure += (targetExposure - this.renderer.toneMappingExposure) * 0.03;

    // Ambient light strongly dims with thicker atmosphere
    const targetAmbient = 0.7 - (this.atmosphereLevel - 1) * 0.16; // 0.7 → 0.06
    this.ambientLight.intensity += (targetAmbient - this.ambientLight.intensity) * 0.03;

    // Scene background darkens
    const bgLum = 0.04 - (this.atmosphereLevel - 1) * 0.009;
    const targetBg = new THREE.Color(bgLum, bgLum * 0.4, bgLum * 0.15);
    this.scene.background.lerp(targetBg, 0.03);
  }

  updateSun(scrollProgress) {
    // Sun grows and dims in chapter 4 area (roughly 65%-75% progress)
    const inLuoXi = scrollProgress > 0.62 && scrollProgress < 0.78;
    const sunPhase = THREE.MathUtils.smoothstep(scrollProgress, 0.62, 0.72);

    if (scrollProgress > 0.62 && scrollProgress < 0.75) {
      const s = 1 + sunPhase * 2.5;
      this.sunSphere.scale.setScalar(s);
      this.sunSphere.material.opacity = sunPhase * 0.8;
      this.sunGlow.material.opacity = sunPhase * 0.3;
    } else if (scrollProgress >= 0.75) {
      // Sun extinguished
      this.sunSphere.material.opacity = Math.max(0, this.sunSphere.material.opacity - 0.005);
      this.sunGlow.material.opacity = Math.max(0, this.sunGlow.material.opacity - 0.003);
    } else {
      this.sunSphere.material.opacity = Math.max(0, this.sunSphere.material.opacity - 0.01);
      this.sunGlow.material.opacity = Math.max(0, this.sunGlow.material.opacity - 0.005);
    }
  }

  updateMeteors(scrollProgress) {
    const showMeteors = scrollProgress > 0.3 && scrollProgress < 0.82;
    this.meteorGroup.visible = showMeteors;

    if (showMeteors) {
      const intensity = scrollProgress > 0.5 && scrollProgress < 0.7 ? 1 : 0.4;
      const t = Date.now() * 0.001;
      this.meteorGroup.children.forEach((rock) => {
        const ud = rock.userData;
        rock.position.x = Math.cos(t * ud.orbitSpeed + ud.phase) * ud.orbitRadius;
        rock.position.z = Math.sin(t * ud.orbitSpeed + ud.phase) * ud.orbitRadius;
        rock.position.y = ud.orbitY + Math.sin(t * 0.3 + ud.phase) * 1.5;
        rock.material.opacity += (intensity * 0.5 - rock.material.opacity) * 0.02;
      });
    }
  }

  updateCamera() {
    this.camera.position.lerp(this.targetPos, 0.02);
    this.cameraTarget.lerp(this.targetLook, 0.03);
    this.camera.lookAt(this.cameraTarget);
  }

  setFromProgress(progress) {
    this.scrollProgress = progress;

    // Camera position mapped to story progress
    const p = progress;
    let camX, camY, camZ, lookX, lookY, lookZ;
    let dustOpacity = 0.5;
    let cubeState = 'IDLE';
    let vineLen = 0;

    if (p < 0.05) {
      // Title / 导读 - far and calm
      camX = Math.sin(p * 2) * 3; camY = 4.5; camZ = 9;
      lookX = 0; lookY = 0.5; lookZ = 0;
      dustOpacity = 0.25;
      cubeState = 'IDLE';
      vineLen = 0;
    } else if (p < 0.15) {
      // A-side poetry
      const t = (p - 0.05) / 0.1;
      camX = Math.sin(t * 1.5) * 3; camY = 4 + t * 1.5; camZ = 9 - t * 2;
      lookX = 0; lookY = 0.5 + t * 0.5; lookZ = -t * 1;
      dustOpacity = 0.3;
      cubeState = 'IDLE';
      vineLen = 0;
    } else if (p < 0.25) {
      // Prologue
      const t = (p - 0.15) / 0.1;
      camX = Math.sin(t) * 2; camY = 5.5 - t * 3; camZ = 7 - t * 2;
      lookX = 1; lookY = 0.8 - t * 0.5; lookZ = -1;
      dustOpacity = 0.4 + t * 0.3;
      cubeState = 'IDLE';
      vineLen = t * 0.1;
    } else if (p < 0.40) {
      // Chapter 1-2
      const t = (p - 0.25) / 0.15;
      camX = Math.sin(t * 2) * 1.5; camY = 2.5 - t * 1.5; camZ = 5 - t * 1.5;
      lookX = 1.5; lookY = 0.4; lookZ = -0.8;
      dustOpacity = 0.6 + t * 0.3;
      cubeState = t > 0.5 ? 'ACTIVE' : 'IDLE';
      vineLen = t * 0.5;
    } else if (p < 0.55) {
      // Chapter 3
      const t = (p - 0.40) / 0.15;
      camX = Math.sin(t * 3 + 1) * 1.2; camY = 1.0 - t * 0.3; camZ = 3.5 - t * 1;
      lookX = 1.5; lookY = 0.35; lookZ = -0.8;
      dustOpacity = 0.8 + t * 0.2;
      cubeState = 'AGITATED';
      vineLen = 0.5 + t * 0.5;
    } else if (p < 0.70) {
      // Chapter 4 - LuoXi limit
      const t = (p - 0.55) / 0.15;
      camX = Math.sin(t * 2 + 2) * 1; camY = 0.7 + t * 0.8; camZ = 2.5 - t * 0.5;
      lookX = 1.5; lookY = 0.3 + t * 0.3; lookZ = -0.8;
      dustOpacity = 1.0;
      cubeState = 'AGITATED';
      vineLen = 1.0;
    } else if (p < 0.85) {
      // Chapter 5 - Utopia
      const t = (p - 0.70) / 0.15;
      camX = Math.sin(t * 1.5 + 3) * 0.6; camY = 1.5 - t * 0.8; camZ = 2 - t * 0.5;
      lookX = 1.5; lookY = 0.6; lookZ = -0.8;
      dustOpacity = 1.0 - t * 0.6;
      cubeState = 'DIM';
      vineLen = 1.0 - t * 0.3;
    } else {
      // Final
      const t = (p - 0.85) / 0.15;
      camX = Math.sin(t * 1 + 4) * 0.3; camY = 0.7 - t * 0.3; camZ = 1.5 - t * 0.3;
      lookX = 1.5; lookY = 0.5; lookZ = -0.8;
      dustOpacity = 0.4 - t * 0.3;
      cubeState = 'DIM';
      vineLen = 0.7 - t * 0.3;
    }

    this.targetPos.set(camX, camY, camZ);
    this.targetLook.set(lookX, lookY, lookZ);
    this.dustOpacity = dustOpacity;
    this.cubeState = cubeState;

    // Update vines
    const targetVineLen = Math.max(0, vineLen);
    this.vineLength += (targetVineLen - this.vineLength) * 0.03;
    this.updateVines(this.vineLength);

    // Update cube state
    this.cubeState = cubeState;

    // Lighting changes
    const ambientStrength = 0.6 - dustOpacity * 0.3;
    this.ambientLight.intensity = ambientStrength;
  }

  render() {
    const dt = Math.min(this.clock.getDelta(), 0.1);
    this.updateCube(dt);
    this.updateDust(dt);
    this.updateSun(this.scrollProgress);
    this.updateMeteors(this.scrollProgress);
    this.updateCamera();
    this.renderer.render(this.scene, this.camera);
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
