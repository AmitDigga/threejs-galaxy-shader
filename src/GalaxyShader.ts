import * as THREE from "three";

const VERTEX_SHADER = `
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

  uniform float u_spiralCount;
  uniform float u_turnsPerSpiral;
  uniform float u_fadeNear;
  uniform float u_fadeFar;

  vec3 getSpiralCoordinate(float originalIndex) {
      v_index = originalIndex;
      float totalSpirals = u_spiralCount;
      float totalTurns = u_turnsPerSpiral;
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
`;

const FRAGMENT_SHADER = `
    uniform vec3 u_color;
    uniform float u_fadeNear;
    uniform float u_fadeFar;
    uniform int u_colorMode; // 0: fixed array, 1: gradient by radius, 2: single color
    uniform vec3 u_colorPalette[8]; // Up to 8 custom colors
    uniform int u_paletteSize; // Number of colors in palette (1-8)
    uniform float u_colorIntensity; // Overall color intensity multiplier
    varying float v_index;
    varying float vDistanceFromCamera;
    varying float radius;
    uniform float u_blackHoleRadius;
    uniform vec3 u_blackHolePosition;

    // Default color palettes for different galaxy types
    vec3 getDefaultColor(int paletteType, int colorIndex) {
        if (paletteType == 0) { // Classic mixed stars
            vec3 colors[4] = vec3[4](
                vec3(0.96, 0.87, 0.70),  // Light golden
                vec3(0.68, 0.85, 0.90),  // Light blue
                vec3(0.95, 0.75, 0.95),  // Soft pink/magenta
                vec3(0.70, 0.95, 0.85)   // Pale cyan/mint
            );
            return colors[colorIndex % 4];
        } else if (paletteType == 1) { // Hot blue-white stars
            vec3 colors[4] = vec3[4](
                vec3(0.7, 0.8, 1.0),     // Blue
                vec3(0.8, 0.9, 1.0),     // Light blue
                vec3(0.9, 0.95, 1.0),    // White-blue
                vec3(1.0, 1.0, 1.0)      // Pure white
            );
            return colors[colorIndex % 4];
        } else if (paletteType == 2) { // Warm red-orange stars
            vec3 colors[4] = vec3[4](
                vec3(1.0, 0.6, 0.4),     // Orange-red
                vec3(1.0, 0.7, 0.5),     // Orange
                vec3(1.0, 0.8, 0.6),     // Light orange
                vec3(1.0, 0.9, 0.7)      // Pale yellow
            );
            return colors[colorIndex % 4];
        }
        // Default fallback
        return vec3(1.0, 1.0, 1.0);
    }

    float randM1To1(vec2 co){
        return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
    }

    vec3 getColorByMode(float index, float radius) {
        if (u_colorMode == 0) {
            // Fixed array cycling - using custom palette if provided
            int colorIndex = int(floor(index)) % max(1, u_paletteSize);
            if (u_paletteSize > 0) {
                return u_colorPalette[colorIndex];
            } else {
                return getDefaultColor(0, colorIndex);
            }
        } else if (u_colorMode == 1) {
            // Gradient by radius (center to edge)
            if (u_paletteSize >= 2) {
                float t = clamp(radius, 0.0, 1.0);
                int baseIndex = int(floor(t * float(u_paletteSize - 1)));
                int nextIndex = min(baseIndex + 1, u_paletteSize - 1);
                float blend = fract(t * float(u_paletteSize - 1));
                return mix(u_colorPalette[baseIndex], u_colorPalette[nextIndex], blend);
            } else {
                // Default blue to red gradient
                float t = clamp(radius, 0.0, 1.0);
                return mix(vec3(0.2, 0.4, 1.0), vec3(1.0, 0.4, 0.2), t);
            }
        } else if (u_colorMode == 2) {
            // Single color
            return u_color.rgb;
        }
        
        // Fallback
        return vec3(1.0, 1.0, 1.0);
    }

    void main() {
        // Round points with soft edge
        vec2 p = gl_PointCoord * 2.0 - 1.0;
        float d = dot(p, p);
        if (d > 1.0) { discard; }
        
        float cameraFade = 1.0 - smoothstep(u_fadeNear, u_fadeFar, vDistanceFromCamera);
        float galaxyFade = 1.0;
        float fade = cameraFade * galaxyFade;
        
        vec3 finalColor = getColorByMode(v_index, radius) * u_colorIntensity;
        gl_FragColor = vec4(finalColor, fade);
    }
`;

type GalaxyShaderParams = {
  resolution?: THREE.Vector2;
  color?: THREE.Color;
  pointSize?: number;
  totalStars?: number;
  time?: number;
  blackHoleRadius?: number;
  blackHolePosition?: THREE.Vector3;
  spiralCount?: number;
  turnsPerSpiral?: number;
  fadeNear?: number;
  fadeFar?: number;
  // New color parameters
  colorMode?: number; // 0: fixed array, 1: gradient by radius, 2: single color
  colorPalette?: THREE.Color[]; // Array of colors for custom palettes
  colorIntensity?: number; // Overall color intensity multiplier
};

export class GalaxyShader extends THREE.ShaderMaterial {
  constructor(params: GalaxyShaderParams = {}) {
    // Prepare color palette array - pad with default colors if needed
    const colorPalette = params.colorPalette || [];
    const paletteSize = Math.min(colorPalette.length, 8); // Max 8 colors
    const paddedPalette = new Array(8);

    // Fill with provided colors or defaults
    for (let i = 0; i < 8; i++) {
      const color = colorPalette[i];
      if (i < colorPalette.length && color) {
        paddedPalette[i] = new THREE.Vector3(color.r, color.g, color.b);
      } else {
        // Default fallback colors
        paddedPalette[i] = new THREE.Vector3(1.0, 1.0, 1.0);
      }
    }

    super({
      uniforms: {
        u_resolution: {
          value: params.resolution ?? new THREE.Vector2(1200, 1200),
        },
        u_color: { value: params.color ?? new THREE.Color(0xffffff) },
        u_pointSize: { value: params.pointSize ?? 2.0 },
        u_totalPoints: { value: params.totalStars ?? 10000 },
        u_time: { value: params.time ?? 0 },
        u_blackHoleRadius: { value: params.blackHoleRadius ?? 0.2 },
        u_blackHolePosition: {
          value: params.blackHolePosition ?? new THREE.Vector3(0, 0, 0),
        },
        u_spiralCount: { value: params.spiralCount ?? 3 },
        u_turnsPerSpiral: { value: params.turnsPerSpiral ?? 1 },
        u_fadeNear: { value: params.fadeNear ?? 1.0 },
        u_fadeFar: { value: params.fadeFar ?? 5.0 },
        // New color uniforms
        u_colorMode: { value: params.colorMode ?? 0 },
        u_colorPalette: { value: paddedPalette },
        u_paletteSize: { value: paletteSize },
        u_colorIntensity: { value: params.colorIntensity ?? 1.0 },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }
}
