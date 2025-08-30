import * as THREE from "three";

type Params = {
  u_resolution: THREE.Vector2;
  u_color: THREE.Color;
  u_pointSize: number;
  u_totalPoints: number;
  u_time: number;
  u_blackHoleRadius: number;
  u_blackHolePosition: THREE.Vector3;
};

export class GalaxyShader extends THREE.ShaderMaterial {
  constructor(params: Params) {
    super({
      uniforms: {
        u_resolution: {
          value: params.u_resolution,
        },
        u_color: { value: params.u_color },
        u_pointSize: { value: params.u_pointSize },
        u_totalPoints: { value: params.u_totalPoints },
        u_time: { value: params.u_time },
        u_blackHoleRadius: { value: params.u_blackHoleRadius },
        u_blackHolePosition: { value: params.u_blackHolePosition },
      },
      vertexShader: `
                    uniform vec2 u_resolution;
                    uniform float u_pointSize;
                    uniform float u_totalPoints;
                    uniform float u_time;
                    attribute float a_index;
                    varying float v_index;
                    varying float vDistanceFromCamera;
                    varying float radius;

                    uniform float u_blackHoleRadius; // Radius of the black hole
                    uniform vec3 u_blackHolePosition; // Position of the black hole

                    float randM1To1(vec2 co){
                        return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453) * 2.0 - 1.0; // Center noise around 0
                    }

                    vec3 getNoiseM1To1(float index) {
                        return vec3(randM1To1(vec2(index)), randM1To1(vec2(index + 1.0)), randM1To1(vec2(index + 2.0)));
                    }
                    float getRand01(float index) {
                        return randM1To1(vec2(index,index+5.0)) / 2.0 + 0.5; // Center noise around 0.5
                    }

                    vec3 getSpiralCoordinate(float originalIndex) {
                        v_index = originalIndex;
                        float totalSpirals = 3.0;
                        float totalTurns = 1.0;
                        float pointsPerSpiral = floor(u_totalPoints / totalSpirals);
                        float spiralIndex = floor(originalIndex / pointsPerSpiral);
                        float angleOffset = float(spiralIndex) / totalSpirals * 3.14159 * 2.0;
                        float index = mod(originalIndex, pointsPerSpiral);

                        // Add time
                        float timeOffset = mod(u_time , 1.0);
                        index = mod(index - timeOffset * pointsPerSpiral  ,pointsPerSpiral);

                        // Range from 0 to 1 for the spiral
                        float radiusInSpiral = index / pointsPerSpiral;
                        radius = radiusInSpiral;
                        float angleInSpiral = index / pointsPerSpiral * 3.14159 * 2.0 * totalTurns + angleOffset;

                        // Convert polar to Cartesian coordinates

                        vec3 noise = getNoiseM1To1(originalIndex) * .4;
                        radius *=  (1.0 + noise.x / 2.0);
                        angleInSpiral += noise.y * (10.0) * 3.14159 / 180.0; // Add some noise to the angle
                        float planeAngle = noise.z *  5.0 * 3.14159 / 180.0; // Angle of the spiral plane
                        
            
                        float x = cos(angleInSpiral) * radius;
                        float y = sin(angleInSpiral) * radius;
                        float z = sin(planeAngle) * radius; // Height based on radius
                        // float randomZ = (getRand01(originalIndex) - 0.5) * 0.02;
                        vec3 fullRandom = getNoiseM1To1(originalIndex + 22.2) * .02;
                        return vec3(x + fullRandom.x, y + fullRandom.y, z + fullRandom.z);
                    }

                    vec3 getCoordinateFromBlackHole(vec3 position){
                        vec3 vecFromCenter = position - u_blackHolePosition;
                        float distance = length(vecFromCenter);
                        if( distance > u_blackHoleRadius || distance < 0.001) {
                            return position; // Outside black hole radius, return original position
                        }
                        // scale position towards the black hole
                        float scale = u_blackHoleRadius / distance;
                        return u_blackHolePosition + vecFromCenter * scale;
                    }

                    

                    void main() {
                        vec3 pos = getSpiralCoordinate(a_index);
                        pos = getCoordinateFromBlackHole(pos);
                        vec4 viewPosition = modelViewMatrix * vec4(pos, 1.0);
                        gl_Position = projectionMatrix * viewPosition;
                        vDistanceFromCamera = -viewPosition.z;

                        // Scale point size with screen height for consistent density
                        float pointScale= 4.0 * pow(getRand01(a_index + 7.0)+ 0.1, 3.0) * pow(getRand01(a_index + 9.0)+ 0.1, 3.0);
                        gl_PointSize = u_pointSize * pointScale * (u_resolution.y /1200.0) * (1.0 / vDistanceFromCamera);
                    }
                `,
      fragmentShader: `
                    uniform vec3 u_color;
                    varying float v_index;
                    varying float vDistanceFromCamera;
                    varying float radius;
                    uniform float u_blackHoleRadius; // Radius of the black hole
                    uniform vec3 u_blackHolePosition; // Position of the black hole
                    vec3 starColors[4] = vec3[4](
                     vec3(0.96, 0.87, 0.70),  // Light golden
                    vec3(0.68, 0.85, 0.90),  // Light blue
                    vec3(0.95, 0.75, 0.95),  // Soft pink/magenta
                    vec3(0.70, 0.95, 0.85)   // Pale cyan/mint

                    );

                    float randM1To1(vec2 co){
                        return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
                    }

                    vec3 colorNoise(float index) {
                        index = floor(index);
                        vec3 color = starColors[int(index) % 4];
                        return color;
                    }

                    void main() {
                        // Round points with soft edge
                        vec2 p = gl_PointCoord * 2.0 - 1.0;
                        float d = dot(p, p);
                        if (d > 1.0) { discard; }
                        // float cameraFade = 1.0;
                        float cameraFade = 1.0 - smoothstep(1.0, 5.0, vDistanceFromCamera);
                        float galaxyFade = 1.0;
                        // float galaxyFade = smoothstep(1.0, 0.5, radius);
                        float fade = cameraFade * galaxyFade;
                        // float fade = 1.0;
                        gl_FragColor = vec4(colorNoise(v_index), fade);
                    }
                `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }
}
