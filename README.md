# Galaxy Shader

A Three.js custom shader for rendering spiral galaxy point clouds with black hole effects.

## Features

- Spiral galaxy geometry
- Black hole distortion
- Customizable star colors

## Usage

1. Install dependencies:
   ```bash
   npm install three
   ```
2. Import and use `GalaxyShader` in your Three.js project.


## Examples

### React
```tsx
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GalaxyGeometry, GalaxyShader } from 'threejs-galaxy-shader';
let isFirst = true;
const ThreeScene = () => {
    const mountRef = useRef(null);
    const sceneRef = useRef(null);
    const rendererRef = useRef(null);
    const frameRef = useRef(null);

    useEffect(() => {
        if (isFirst) {
            isFirst = false;
            return;
        }
        if (!mountRef.current) return;

        // Scene setup
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000011);

        // Camera setup
        const camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        camera.position.z = 3; // Closer view for galaxy

        // Renderer setup
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        mountRef.current.appendChild(renderer.domElement);

        // Create a simple galaxy using the GalaxyShaderLibrary
        const galaxyConfig = {
            spiralCount: 3,
            turnsPerSpiral: 1.0,
            totalStars: 15000,
            pointSize: 2.0,
            blackHoleRadius: 0.1,
            colorMode: 2, // Single color mode
            color: new THREE.Color(0x00ff88), // Fixed green color
            colorIntensity: 1.0
        };

        // Create galaxy geometry and shader material
        const geometry = new GalaxyGeometry(galaxyConfig.totalStars);
        const material = new GalaxyShader({
            resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
            color: galaxyConfig.color,
            pointSize: galaxyConfig.pointSize,
            totalStars: galaxyConfig.totalStars,
            time: 0,
            blackHoleRadius: galaxyConfig.blackHoleRadius,
            blackHolePosition: new THREE.Vector3(0, 0, 0),
            spiralCount: galaxyConfig.spiralCount,
            turnsPerSpiral: galaxyConfig.turnsPerSpiral,
            colorMode: galaxyConfig.colorMode,
            colorIntensity: galaxyConfig.colorIntensity,
            fadeNear: 5.0,
            fadeFar: 100.0,
        });

        const points = new THREE.Points(geometry, material);

        // Add a simple black hole visualization
        const blackHoleGeometry = new THREE.SphereGeometry(galaxyConfig.blackHoleRadius, 16, 16);
        const blackHoleMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const blackHole = new THREE.Mesh(blackHoleGeometry, blackHoleMaterial);

        scene.add(points);
        scene.add(blackHole);

        // Store references
        sceneRef.current = scene;
        rendererRef.current = renderer;

        // Animation loop
        const animate = () => {
            frameRef.current = requestAnimationFrame(animate);

            // Update time uniform for galaxy animation
            const time = performance.now() / 10000 / 5;
            material.uniforms.u_time.value = time;
            renderer.render(scene, camera);
            // console.log(material.uniforms.u_time.value);
        };

        animate();

        // Handle window resize
        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);

            // Update resolution uniform
            material.uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
        };

        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
            if (frameRef.current) {
                cancelAnimationFrame(frameRef.current);
            }
            if (mountRef.current && renderer.domElement) {
                mountRef.current.removeChild(renderer.domElement);
            }
            renderer.dispose();
            geometry.dispose();
            material.dispose();
        };
    }, []);

    return <div ref={mountRef} style={{ width: '100%', height: '100vh' }} />;
};

export default ThreeScene;

```


### CommonJs

Example is under `exmaples/index.html`


## License

MIT (add your license file)
