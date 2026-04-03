// === PRELOADER & INITIAL REVEAL === //
document.addEventListener("DOMContentLoaded", () => {
  // Force scroll to top to prevent browser caching scroll position bug
  window.scrollTo(0, 0);
  
  setTimeout(() => {
    document.getElementById("uiverse-preloader").classList.add("loaded");
    // Trigger hero text stagger
    setTimeout(() => {
      const hero = document.querySelector('.lab-hero');
      if(hero) hero.classList.add('is-revealed');
    }, 500);
  }, 3500); // 3.5s — enough for bar+ball animation cycle
});

// === THREE.JS ORGANIC PARTICLE ENGINE (True Interactivity via Raycaster) === //
function init3D() {
  const container = document.getElementById("canvas-container");
  if (!container || typeof THREE === 'undefined') return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
  
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  // Generate Particle Grid
  const gridSize = 120;
  const particleSpacing = 0.6;
  const numParticles = Math.floor((gridSize / particleSpacing) * (gridSize / particleSpacing));
  
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(numParticles * 3);
  const baseDistances = new Float32Array(numParticles);
  const basePositions = new Float32Array(numParticles * 3);

  let i = 0, j = 0;
  for(let x = -gridSize/2; x < gridSize/2; x += particleSpacing) {
    for(let z = -gridSize/2; z < gridSize/2; z += particleSpacing) {
      if(i >= numParticles * 3) break;
      positions[i] = x;
      positions[i+1] = 0; 
      positions[i+2] = z;
      
      basePositions[i] = x;
      basePositions[i+2] = z;
      
      baseDistances[j] = Math.sqrt(x*x + z*z);
      i += 3;
      j++;
    }
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  
  const material = new THREE.PointsMaterial({ 
    color: 0x1A1A1A, 
    size: 0.15, 
    transparent: true,
    opacity: 0.5
  });
  
  const particleSystem = new THREE.Points(geometry, material);
  particleSystem.rotation.x = -Math.PI / 2.5;
  particleSystem.position.y = -8;
  scene.add(particleSystem);

  camera.position.z = 25;
  camera.position.y = 8;

  // Raycaster for true particle interactivity
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2(999, 999);
  const planeGeometry = new THREE.PlaneGeometry(gridSize, gridSize);
  planeGeometry.rotateX(-Math.PI / 2.5);
  const invisiblePlane = new THREE.Mesh(planeGeometry, new THREE.MeshBasicMaterial({visible: false}));
  invisiblePlane.position.y = -8;
  scene.add(invisiblePlane);

  let intersectPoint = new THREE.Vector3(999, 999, 999);

  document.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(invisiblePlane);
    if(intersects.length > 0) {
      // Map global intersection back to local particle grid coordinates
      invisiblePlane.worldToLocal(intersectPoint.copy(intersects[0].point));
    } else {
      intersectPoint.set(999, 999, 999);
    }
  });

  let time = 0;
  
  const animate3D = function () {
    requestAnimationFrame(animate3D);
    time += 0.02;

    const positions = particleSystem.geometry.attributes.position.array;
    
    let idx = 0;
    for(let k = 0; k < j; k++) {
      const baseX = basePositions[idx];
      const baseZ = basePositions[idx+2];
      const dist = baseDistances[k];
      
      // Standard Chladni resonance waves
      const wave1 = Math.sin(dist * 0.4 - time) * 1.5;
      const wave2 = Math.cos(baseX * 0.15 + time) * 1.2;
      
      let targetY = wave1 + wave2;

      // True Interactive Repulsion
      // Calculate distance from particle to mouse intersection point on the grid
      const dx = baseX - intersectPoint.x;
      const dz = baseZ - intersectPoint.y; // Intersection point y maps to grid z due to rotation
      const distanceToMouse = Math.sqrt(dx*dx + dz*dz);
      
      if(distanceToMouse < 8) {
        // Force field repels particles upwards intensely based on proximity
        const force = (8 - distanceToMouse) / 8;
        targetY += force * 15; 
      }
      
      // Smooth interpolation for fluid movement
      positions[idx + 1] += (targetY - positions[idx + 1]) * 0.1;
      
      idx += 3;
    }
    
    particleSystem.geometry.attributes.position.needsUpdate = true;
    particleSystem.rotation.z += 0.0003; // Slow rotation mapping to time
    renderer.render(scene, camera);
  };
  animate3D();

  window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });
}
init3D();


// === SCROLL REVEALS & HUD (Robert Fiszer Style) === //
const observerOptions = { threshold: 0.1, rootMargin: "0px 0px -100px 0px" };
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-revealed');
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

document.querySelectorAll('.stagger-reveal, .line-mask').forEach(el => observer.observe(el));

const scrollHud = document.getElementById("scroll-hud");
window.addEventListener("scroll", () => {
  if(scrollHud) {
    const y = window.scrollY;
    scrollHud.innerText = `Y_AXIS: ${y.toString().padStart(4, '0')}`;
  }
});

// === SMOOTHS CUSTOM MAGNETIC CURSOR PHYSICS === //
const cursor = document.querySelector('.custom-cursor');
const follower = document.querySelector('.cursor-follower');

let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;
let followerX = mouseX;
let followerY = mouseY;

document.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  // Instant dot
  cursor.style.transform = `translate(${mouseX - 3}px, ${mouseY - 3}px)`;
});

function animateCursor() {
  // Lerp easing formula enhanced for buttery smoothness (0.2 factor)
  followerX += (mouseX - followerX) * 0.2;
  followerY += (mouseY - followerY) * 0.2;
  
  follower.style.transform = `translate(${followerX - 20}px, ${followerY - 20}px)`;
  
  requestAnimationFrame(animateCursor);
}
// Remove CSS transform transitions from JS handling to prevent jitter
follower.style.transition = 'width 0.3s, height 0.3s, border-radius 0.3s, background 0.3s, border-color 0.3s';
follower.style.left = "0";
follower.style.top = "0";
animateCursor();

// Magnetic Snap Triggers
const interactiveElements = document.querySelectorAll('.interactive, a, button');
interactiveElements.forEach(el => {
  el.addEventListener('mouseenter', () => {
    follower.classList.add('magnetic-active');
  });
  el.addEventListener('mouseleave', () => {
    follower.classList.remove('magnetic-active');
  });
});

// Pixelation/Image Hover trigger
const pixelElements = document.querySelectorAll('.hover-pixelate');
pixelElements.forEach(el => {
  el.addEventListener('mouseenter', () => follower.classList.add('pixel-active'));
  el.addEventListener('mouseleave', () => follower.classList.remove('pixel-active'));
});


// === EASTER EGG: LAB LOCKDOWN OVERRIDE === //
let clickCount = 0;
const brandTrigger = document.getElementById('monogram-trigger');
const eggAlert = document.getElementById('lab-egg');

if(brandTrigger) {
  brandTrigger.addEventListener('click', (e) => {
    e.preventDefault();
    clickCount++;
    if(clickCount >= 3) {
      eggAlert.classList.add('active');
      document.body.style.filter = "invert(100%)"; 
      
      setInterval(() => {
        document.querySelector('.hero-title').innerText = "SYSTEM_BREACH";
      }, 50);
      
      setTimeout(() => {
        eggAlert.classList.remove('active');
        document.body.style.filter = "none";
        clickCount = 0;
        location.reload(); 
      }, 3000);
    }
  });
}

// === NEW EASTER EGG: KEYBOARD TERMINAL ENTRY === //
let keySequence = "";
const targetWord = "lab";
document.addEventListener("keydown", (e) => {
  keySequence += e.key.toLowerCase();
  if (keySequence.length > targetWord.length) {
    keySequence = keySequence.slice(-targetWord.length);
  }
  
  if (keySequence === targetWord) {
    const terminal = document.getElementById("secret-terminal");
    if(terminal) {
      terminal.classList.add("active");
      terminal.innerHTML = "";
      
      const commands = [
        "INITIALIZING ROOT ACCESS...",
        "BYPASSING FRONTEND UI...",
        "ACCESSING CORE FILES...",
        "... ACCESS GRANTED.",
        "<br>WELCOME TO THE BACKEND, USER. NOTHING TO SEE HERE YET. KEEP EXPLORING."
      ];
      
      let i = 0;
      const typeCommand = setInterval(() => {
        if(i < commands.length) {
          terminal.innerHTML += `<p>> ${commands[i]}</p>`;
          i++;
        } else {
          clearInterval(typeCommand);
          setTimeout(() => { terminal.classList.remove("active"); }, 4000);
        }
      }, 800);
      keySequence = "";
    }
  }
});

// === SMOOTH INTERNAL ROUTING === //
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) { target.scrollIntoView({ behavior: 'smooth' }); }
    });
});

// === AJAX CONTACT FORM (No page redirect) === //
const contactForm = document.getElementById('contact-form');
if (contactForm) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = contactForm.querySelector('.lab-submit');
    const originalHTML = btn.innerHTML;

    // Transmitting state
    btn.innerHTML = `<span class="magnetic-child">TRANSMITTING... <span class="accent-color">_</span></span>`;
    btn.disabled = true;

    try {
      const res = await fetch(contactForm.action, {
        method: 'POST',
        body: new FormData(contactForm),
        headers: { 'Accept': 'application/json' }
      });

      if (res.ok) {
        btn.innerHTML = `<span class="magnetic-child">TRANSMISSION CONFIRMED. <span class="accent-color">✓</span></span>`;
        contactForm.reset();
        setTimeout(() => {
          btn.innerHTML = originalHTML;
          btn.disabled = false;
        }, 4000);
      } else {
        throw new Error('Server error');
      }
    } catch {
      btn.innerHTML = `<span class="magnetic-child accent-color">TRANSMISSION FAILED — RETRY.</span>`;
      setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
      }, 3000);
    }
  });
}
