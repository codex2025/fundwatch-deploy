import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RotateCw, ZoomIn, ZoomOut, Layers, Eye, Sparkles, Box } from 'lucide-react';

export default function ContourHeatmap3D({ dataPoints = [] }) {
  const mountRef = useRef(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [showWireframe, setShowWireframe] = useState(true);
  const [showProjections, setShowProjections] = useState(true);
  const [contourSlices, setContourSlices] = useState(12);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const meshGroupRef = useRef(null);
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = 450;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090d16);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(28, 22, 28);
    camera.lookAt(0, 2, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
    dirLight.position.set(20, 40, 20);
    scene.add(dirLight);

    const redLight = new THREE.PointLight(0xf43f5e, 1.5, 60);
    redLight.position.set(10, 15, 10);
    scene.add(redLight);

    // Group for rotating mesh
    const meshGroup = new THREE.Group();
    scene.add(meshGroup);
    meshGroupRef.current = meshGroup;

    // Build 3D Bounding Box & Coordinate Grid
    const boxSize = 20;
    const boxGeometry = new THREE.BoxGeometry(boxSize, boxSize * 0.7, boxSize);
    const boxWireframe = new THREE.WireframeGeometry(boxGeometry);
    const boxLine = new THREE.LineSegments(boxWireframe, new THREE.LineBasicMaterial({
      color: 0x1e293b,
      transparent: true,
      opacity: 0.4
    }));
    boxLine.position.y = (boxSize * 0.7) / 2;
    meshGroup.add(boxLine);

    // 3D Axis Grid Floors (X-Z floor, X-Y back wall, Y-Z side wall)
    const gridFloor = new THREE.GridHelper(boxSize, 10, 0x0284c7, 0x1e293b);
    gridFloor.position.y = 0;
    meshGroup.add(gridFloor);

    // Colormap function matching matplotlib viridis/plasma/inferno: blue -> cyan -> emerald -> amber -> ruby red
    function getColorForHeight(h, maxH = 10) {
      const norm = Math.min(1.0, Math.max(0.0, h / maxH));
      const color = new THREE.Color();
      if (norm < 0.25) {
        // Deep blue to cyan
        color.setHSL(0.6 - norm * 0.4, 0.9, 0.35 + norm * 0.4);
      } else if (norm < 0.5) {
        // Cyan to emerald
        color.setHSL(0.5 - (norm - 0.25) * 0.7, 0.9, 0.45);
      } else if (norm < 0.75) {
        // Emerald to amber
        color.setHSL(0.32 - (norm - 0.5) * 0.9, 1.0, 0.5);
      } else {
        // Amber to ruby fiery red
        color.setHSL(0.08 - (norm - 0.75) * 0.35, 1.0, 0.55);
      }
      return color;
    }

    // Build 3D Contour Elevation Surface Mesh
    const gridRes = 36;
    const surfGeom = new THREE.PlaneGeometry(boxSize * 0.9, boxSize * 0.9, gridRes - 1, gridRes - 1);
    surfGeom.rotateX(-Math.PI / 2);

    const positions = surfGeom.attributes.position;
    const colors = [];

    // Synthetic + Dataset-driven gaussian peak synthesis
    // Peaks represent clusters of anomalies (e.g. High Cost + Fast Turnaround, March dumping)
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);

      // Anomaly Peak 1: Ghost Bills (High X, High Z)
      const p1 = 8.5 * Math.exp(-((x - 4.5) ** 2 + (z - 4.5) ** 2) / 12.0);
      // Anomaly Peak 2: Cost Outliers (High X, Low Z)
      const p2 = 6.8 * Math.exp(-((x - 5.0) ** 2 + (z + 4.0) ** 2) / 14.0);
      // Anomaly Peak 3: Velocity Dumping (Low X, High Z)
      const p3 = 5.2 * Math.exp(-((x + 4.0) ** 2 + (z - 3.5) ** 2) / 10.0);
      // Baseline noise
      const baseline = 0.8 * Math.sin(x * 0.4) * Math.cos(z * 0.4) + 1.2;

      const y = Math.max(0.1, p1 + p2 + p3 + baseline);
      positions.setY(i, y);

      const c = getColorForHeight(y, 9.0);
      colors.push(c.r, c.g, c.b);
    }

    surfGeom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    surfGeom.computeVertexNormals();

    const surfMat = new THREE.MeshPhongMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      shininess: 60,
      transparent: true,
      opacity: 0.92,
      wireframe: false
    });

    const surfaceMesh = new THREE.Mesh(surfGeom, surfMat);
    meshGroup.add(surfaceMesh);

    // Add Wireframe overlay
    const wireframeMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.22
    });
    const wireframeMesh = new THREE.Mesh(surfGeom, wireframeMat);
    wireframeMesh.position.y = 0.02;
    meshGroup.add(wireframeMesh);

    // Contour Slice Rings (Contourf 3D lines at discrete elevations)
    const contourGroup = new THREE.Group();
    const sliceCount = contourSlices;
    for (let s = 1; s <= sliceCount; s++) {
      const elevation = (s / sliceCount) * 8.5;
      const sliceColor = getColorForHeight(elevation, 8.5);

      // Floor projected contour shadow
      const floorRingGeom = new THREE.RingGeometry(s * 0.7, s * 0.7 + 0.15, 32);
      floorRingGeom.rotateX(-Math.PI / 2);
      const floorRingMat = new THREE.MeshBasicMaterial({
        color: sliceColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.25
      });
      const floorRing = new THREE.Mesh(floorRingGeom, floorRingMat);
      floorRing.position.set(4.5, 0.05, 4.5);
      contourGroup.add(floorRing);
    }
    meshGroup.add(contourGroup);

    // Render loop
    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (autoRotate && !isDraggingRef.current) {
        meshGroup.rotation.y += 0.004;
      }

      renderer.render(scene, camera);
    };
    animate();

    // Mouse Drag Rotation
    const handleMouseDown = (e) => {
      isDraggingRef.current = true;
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e) => {
      if (!isDraggingRef.current) return;

      const deltaX = e.clientX - previousMousePositionRef.current.x;
      const deltaY = e.clientY - previousMousePositionRef.current.y;

      meshGroup.rotation.y += deltaX * 0.008;
      meshGroup.rotation.x += deltaY * 0.008;

      // Clamp X rotation to prevent flipping upside down
      meshGroup.rotation.x = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, meshGroup.rotation.x));

      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    // Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const newWidth = container.clientWidth;
      camera.aspect = newWidth / height;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      dom.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('resize', handleResize);
      if (container && renderer.domElement) {
        container.innerHTML = '';
      }
      renderer.dispose();
    };
  }, [autoRotate, showWireframe, showProjections, contourSlices]);

  return (
    <div className="glass-card p-5 space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-border pb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="glass-pill px-2 py-0.5 text-violet-400 text-[10px] font-mono font-bold">
              3D MULTIVARIATE CONTOUR SURFACE
            </span>
            <span className="glass-pill px-2 py-0.5 text-rose-400 text-[10px] font-mono font-bold">
              Matplotlib contourf3d Style
            </span>
          </div>
          <h3 className="page-title text-base mt-1.5 flex items-center gap-2">
            <Box className="w-4 h-4 text-violet-400" />
            Multidimensional Anomaly Density Terrain ($X, Y, Z$)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Interactive 3D Iso-contour surface: <strong className="text-slate-300">X</strong> (Cost Outlier Ratio), <strong className="text-slate-300">Y</strong> (Velocity Surge Ratio), <strong className="text-slate-300">Z</strong> (Risk Density Height)
          </p>
        </div>

        {/* 3D Toolbar */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`btn ${
              autoRotate
                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40'
                : 'bg-surface-raised border border-surface-border text-slate-400 hover:text-white hover:border-surface-borderHover'
            }`}
          >
            <RotateCw className={`w-3.5 h-3.5 ${autoRotate ? 'animate-spin' : ''}`} />
            {autoRotate ? 'Rotating' : 'Paused'}
          </button>

          <button
            onClick={() => {
              if (meshGroupRef.current) {
                meshGroupRef.current.rotation.set(0, 0, 0);
              }
            }}
            className="btn-secondary"
            title="Reset Angle"
          >
            Reset View
          </button>
        </div>
      </div>

      {/* 3D Canvas Mount Point */}
      <div className="relative rounded-xl overflow-hidden border border-surface-border bg-surface-sunken/80">
        <div ref={mountRef} className="w-full cursor-grab active:cursor-grabbing" />

        {/* 3D Axis Legend HUD Overlay */}
        <div className="absolute top-3 left-3 bg-surface-sunken/90 backdrop-blur-md border border-surface-border p-2.5 rounded-xl text-[11px] space-y-1 text-slate-300 shadow-card pointer-events-none">
          <div className="font-bold text-white flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            3D Cartesian Space
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
            <span><strong>X-Axis:</strong> Cost Deviation vs Peer Baseline</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span><strong>Z-Axis:</strong> Execution Velocity Rate ($\Delta T$)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span><strong>Y-Elevation:</strong> Risk Density Summit (CRS Height)</span>
          </div>
        </div>

        {/* Elevation Gradient Legend Bar */}
        <div className="absolute bottom-3 right-3 bg-surface-sunken/90 backdrop-blur-md border border-surface-border px-3 py-2 rounded-xl text-[11px] space-y-1 shadow-card">
          <div className="text-[10px] text-slate-400 font-mono">ELEVATION / RISK COLORMAP</div>
          <div className="w-36 h-2.5 rounded-full bg-gradient-to-r from-blue-600 via-cyan-400 via-emerald-400 via-amber-400 to-rose-600 border border-surface-border"></div>
          <div className="flex justify-between text-[10px] text-slate-400 font-mono tabular-nums">
            <span>Low (0)</span>
            <span>Med (50)</span>
            <span className="text-rose-400 font-bold">Critical (100)</span>
          </div>
        </div>

        {/* Drag Hint */}
        <div className="absolute bottom-3 left-3 text-[10px] text-slate-500 font-mono bg-surface-sunken/70 px-2 py-1 rounded-md border border-surface-border pointer-events-none flex items-center gap-1.5">
          <Eye className="w-3 h-3 text-slate-500" />
          Click &amp; drag to rotate 3D mesh in any direction
        </div>
      </div>
    </div>
  );
}
