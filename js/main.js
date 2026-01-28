
// Basic Three.js Setup
const canvas = document.querySelector('#bg-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

// Shader Material
const vertexShader = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
    }
`;

const fragmentShader = `
    uniform float iTime;
    uniform vec2 iResolution;
    uniform vec2 iMouse;
    
    varying vec2 vUv;

    // Fractional Brownian Motion
    float random (in vec2 _st) {
        return fract(sin(dot(_st.xy, vec2(12.9898,78.233)))*43758.5453123);
    }

    float noise (in vec2 _st) {
        vec2 i = floor(_st);
        vec2 f = fract(_st);

        // Quintic interpolation
        vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);

        float a = random(i);
        float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0));
        float d = random(i + vec2(1.0, 1.0));

        return mix(a, b, u.x) +
                (c - a)* u.y * (1.0 - u.x) +
                (d - b) * u.x * u.y;
    }

    float fbm ( in vec2 _st) {
        float v = 0.0;
        float a = 0.5;
        // Rotate
        mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
        
        for (int i = 0; i < 6; ++i) { // Increased octaves for detail
            v += a * noise(_st);
            _st = rot * _st * 2.1 + vec2(1.4, 2.3);
            a *= 0.45;
        }
        return v;
    }

    void main() {
        vec2 st = gl_FragCoord.xy/iResolution.xy;
        st.x *= iResolution.x/iResolution.y;

        vec3 color = vec3(0.0);

        // Domain warping for fluid look
        vec2 q = vec2(0.);
        q.x = fbm( st + 0.05*iTime );
        q.y = fbm( st + vec2(1.0) );

        vec2 r = vec2(0.);
        r.x = fbm( st + 1.0*q + vec2(1.7,9.2)+ 0.15*iTime );
        r.y = fbm( st + 1.0*q + vec2(8.3,2.8)+ 0.126*iTime);

        float f = fbm(st + r);

        // Mapping to colors - Ink style (Black on Dark Grey)
        // Ensure background isn't pitch black to allow smoke to appear darker
        
        // Base dark grey
        vec3 bg = vec3(0.12, 0.12, 0.12);
        
        // Ink color (Black)
        vec3 ink = vec3(0.0, 0.0, 0.0);
        
        // Mixing based on noise
        float mixVal = smoothstep(0.2, 0.9, f);
        
        // Make the smoke look heavy
        color = mix(bg, ink, mixVal);

        // Add some highlights for volume
        color += mix(vec3(0.0), vec3(0.05), smoothstep(0.4, 0.6, r.x));
        
        // Vignette
        float vignette = 1.0 - smoothstep(0.5, 1.5, length(vUv - 0.5));
        color *= vignette;
        
        gl_FragColor = vec4(color, 1.0);
    }
`;

const uniforms = {
    iTime: { value: 0 },
    iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    iMouse: { value: new THREE.Vector2(0, 0) }
};

const material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: vertexShader,
    fragmentShader: fragmentShader
});

const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
scene.add(plane);

// Animation Loop
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    uniforms.iTime.value = clock.getElapsedTime() * 0.5; // Slow down slightly for majesty
    renderer.render(scene, camera);
}

animate();

// Resizing
function resize() {
    const container = document.querySelector('.content-area') || document.body;
    const width = container.clientWidth;
    const height = container.clientHeight;

    renderer.setSize(width, height);
    uniforms.iResolution.value.set(width, height);
}

window.addEventListener('resize', resize);
resize(); // Initial call

