import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useAnimationFrame } from 'framer-motion';
import type { JointRotationAxis, ExercisePosition } from '../../types/character.types';

/** Límites anatómicos realistas (en grados) por articulación. */
const JOINT_LIMITS: Record<string, { min: number; max: number }> = {
  cabeza: { min: -45, max: 45 },
  cuello: { min: -45, max: 45 },
  hombro_izquierdo: { min: -180, max: 180 },
  hombro_derecho: { min: -180, max: 180 },
  codo_izquierdo: { min: -150, max: 0 },
  codo_derecho: { min: -150, max: 0 },
  muñeca_izquierda: { min: -80, max: 80 },
  muñeca_derecha: { min: -80, max: 80 },
  cadera_izquierda: { min: -120, max: 120 },
  cadera_derecha: { min: -120, max: 120 },
  rodilla_izquierda: { min: -135, max: 0 },
  rodilla_derecha: { min: -135, max: 0 },
  tobillo_izquierdo: { min: -40, max: 30 },
  tobillo_derecho: { min: -40, max: 30 },
};

const clampAngle = (joint: string, deg: number): number => {
  const limit = JOINT_LIMITS[joint];
  if (!limit) return deg;
  return Math.max(limit.min, Math.min(limit.max, deg));
};

/** Rotación/posición objetivo del grupo raíz según la posición del ejercicio. */
const POSITION_TARGETS: Record<ExercisePosition, { rotX: number; rotY: number; rotZ: number; posY: number }> = {
  pie: { rotX: 0, rotY: 0, rotZ: 0, posY: 0 },
  sentado: { rotX: 0, rotY: 0, rotZ: 0, posY: -0.18 },
  acostado: { rotX: -Math.PI / 2, rotY: 0, rotZ: 0, posY: -0.55 },
  decubito_lateral: { rotX: 0, rotY: 0, rotZ: Math.PI / 2, posY: -0.55 },
};

export interface KidModel3DProps {
  jointAngles?: Partial<Record<string, number>>;
  /**
   * Mapa de nombre de articulación → eje de rotación ('x' | 'y' | 'z').
   * Las articulaciones no listadas usan 'x' por defecto.
   */
  jointAxes?: Partial<Record<string, JointRotationAxis>>;
  statusColor?: string;
  autoAnimate?: boolean;
  className?: string;
  /** Posición corporal del ejercicio. Por defecto 'pie' (de pie). */
  position?: ExercisePosition;
}

export const KidModel3D: React.FC<KidModel3DProps> = ({
  jointAngles = {},
  jointAxes = {},
  statusColor,
  autoAnimate = false,
  className = 'w-full h-full min-h-[320px]',
  position = 'pie',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const jointsRef = useRef<Record<string, THREE.Group>>({});
  const statusMeshesRef = useRef<THREE.Mesh[]>([]);
  const anglesRef = useRef(jointAngles);
  const axesRef = useRef(jointAxes);
  const statusColorRef = useRef(statusColor);
  const autoAnimateRef = useRef(autoAnimate);
  const positionRef = useRef(position);
  // Valores actuales interpolados de la pose de posición (rotación + traslación).
  const poseRef = useRef({ rotX: 0, rotY: 0, rotZ: 0, posY: 0 });
  // Referencia al grupo 3D que rota/traslada todo el modelo según la posición.
  const poseGroupRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    anglesRef.current = jointAngles;
    axesRef.current = jointAxes;
    statusColorRef.current = statusColor;
    autoAnimateRef.current = autoAnimate;
    positionRef.current = position;
  }, [jointAngles, jointAxes, statusColor, autoAnimate, position]);

  // Interpolación suave de la pose de posición usando Framer Motion.
  // Esto produce transiciones fluidas (tipo ease) al cambiar de posición.
  useAnimationFrame((_, delta) => {
    const poseGroup = poseGroupRef.current;
    if (!poseGroup) return;
    const target = POSITION_TARGETS[positionRef.current];
    const pose = poseRef.current;
    // Factor de suavizado dependiente del tiempo (~transición ~0.4s).
    const k = 1 - Math.pow(0.001, delta / 0.4);
    pose.rotX += (target.rotX - pose.rotX) * k;
    pose.rotY += (target.rotY - pose.rotY) * k;
    pose.rotZ += (target.rotZ - pose.rotZ) * k;
    pose.posY += (target.posY - pose.posY) * k;
    poseGroup.rotation.set(pose.rotX, pose.rotY, pose.rotZ);
    poseGroup.position.y = pose.posY;
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const width = container.clientWidth || 300;
    const height = container.clientHeight || 400;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.35, 3.8);
    camera.lookAt(0, 0.95, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const mainLight = new THREE.DirectionalLight(0xfffaed, 0.85);
    mainLight.position.set(4, 7, 5);
    mainLight.castShadow = true;
    scene.add(mainLight);
    const fillLight = new THREE.DirectionalLight(0x90b0d0, 0.4);
    fillLight.position.set(-4, 3, -3);
    scene.add(fillLight);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 8),
      new THREE.ShadowMaterial({ opacity: 0.14 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const matSkin = new THREE.MeshLambertMaterial({ color: 0xFAD1B5 });
    const matHair = new THREE.MeshLambertMaterial({ color: 0x613626 });
    const matEyes = new THREE.MeshBasicMaterial({ color: 0x261611 });
    const matCheeks = new THREE.MeshBasicMaterial({ color: 0xF59A83 });
    const matShirt = new THREE.MeshLambertMaterial({ color: 0x754432 });
    const matShirtStripe = new THREE.MeshLambertMaterial({ color: 0x1E6B52 });
    const matPants = new THREE.MeshLambertMaterial({ color: 0x165640 });
    const matExoStrap = new THREE.MeshLambertMaterial({ color: 0x1D232C });
    const matJointPivot = new THREE.MeshStandardMaterial({ color: 0x3A4556, roughness: 0.3, metalness: 0.5 });
    const matShoes = new THREE.MeshLambertMaterial({ color: 0x1A2733 });

    const joints: Record<string, THREE.Group> = {};
    const statusMeshes: THREE.Mesh[] = [];

    const createPivotMesh = (r = 0.04) => {
      const pivotGroup = new THREE.Group();
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 16), matJointPivot);
      mesh.castShadow = true;
      pivotGroup.add(mesh);
      const statusIndicator = new THREE.Mesh(
        new THREE.SphereGeometry(r * 1.5, 14, 14),
        new THREE.MeshBasicMaterial({ color: 0x10B981, transparent: true, opacity: 0, wireframe: true })
      );
      pivotGroup.add(statusIndicator);
      statusMeshes.push(statusIndicator);
      return pivotGroup;
    };

    // Grupo exterior que controla la posición corporal (de pie, sentado, acostado...).
    // Permite rotar/trasladar todo el modelo sin alterar la jerarquía articular.
    const poseGroup = new THREE.Group();
    poseGroupRef.current = poseGroup;
    scene.add(poseGroup);

    const tronco_pelvis = new THREE.Group();
    tronco_pelvis.position.set(0, 0.95, 0);
    poseGroup.add(tronco_pelvis);
    joints['tronco_pelvis'] = tronco_pelvis;
    const pelvisMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.16, 0.14, 16), matPants);
    pelvisMesh.castShadow = true;
    tronco_pelvis.add(pelvisMesh);
    const pelvisBelt = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.05, 16), matExoStrap);
    tronco_pelvis.add(pelvisBelt);

    const tronco_abdomen = new THREE.Group();
    tronco_abdomen.position.set(0, 0.1, 0);
    tronco_pelvis.add(tronco_abdomen);
    joints['tronco_abdomen'] = tronco_abdomen;
    const abdomenMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.18, 0.16, 16), matShirt);
    abdomenMesh.position.y = 0.08;
    abdomenMesh.castShadow = true;
    tronco_abdomen.add(abdomenMesh);

    const tronco_torax = new THREE.Group();
    tronco_torax.position.set(0, 0.16, 0);
    tronco_abdomen.add(tronco_torax);
    joints['tronco_torax'] = tronco_torax;
    const toraxMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.19, 0.22, 16), matShirt);
    toraxMesh.position.y = 0.11;
    toraxMesh.castShadow = true;
    tronco_torax.add(toraxMesh);
    const toraxStripe = new THREE.Mesh(new THREE.CylinderGeometry(0.222, 0.205, 0.08, 16), matShirtStripe);
    toraxStripe.position.y = 0.13;
    tronco_torax.add(toraxStripe);
    const strapL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.23, 0.03), matExoStrap);
    strapL.position.set(-0.1, 0.11, 0.18);
    const strapR = strapL.clone();
    strapR.position.x = 0.1;
    tronco_torax.add(strapL, strapR);

    const cuello = new THREE.Group();
    cuello.position.set(0, 0.22, 0);
    tronco_torax.add(cuello);
    joints['cuello'] = cuello;
    const cuelloMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.08, 16), matSkin);
    cuelloMesh.position.y = 0.04;
    cuelloMesh.castShadow = true;
    cuello.add(cuelloMesh);

    const cabeza = new THREE.Group();
    cabeza.position.set(0, 0.08, 0);
    cuello.add(cabeza);
    joints['cabeza'] = cabeza;
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 24), matSkin);
    headMesh.position.y = 0.18;
    headMesh.castShadow = true;
    cabeza.add(headMesh);
    const hairBase = new THREE.Mesh(new THREE.SphereGeometry(0.235, 16, 16), matHair);
    hairBase.position.set(0, 0.22, -0.03);
    cabeza.add(hairBase);
    const hairTuft = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12), matHair);
    hairTuft.position.set(-0.08, 0.36, 0.1);
    cabeza.add(hairTuft);
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 12), matEyes);
    eyeL.position.set(-0.07, 0.19, 0.2);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.07;
    cabeza.add(eyeL, eyeR);
    const cheekL = new THREE.Mesh(new THREE.CircleGeometry(0.03, 12), matCheeks);
    cheekL.position.set(-0.11, 0.14, 0.195);
    cheekL.rotation.y = -0.3;
    const cheekR = cheekL.clone();
    cheekR.position.x = 0.11;
    cheekR.rotation.y = 0.3;
    cabeza.add(cheekL, cheekR);

    const buildArm = (side: number) => {
      const prefix = side === 1 ? 'izquierdo' : 'derecho';
      const sidePrefix = side === 1 ? 'izquierda' : 'derecha';
      const hombro = new THREE.Group();
      hombro.position.set(side * 0.26, 0.2, 0);
      tronco_torax.add(hombro);
      hombro.add(createPivotMesh(0.045));
      joints[`hombro_${prefix}`] = hombro;
      const brazo = new THREE.Group();
      hombro.add(brazo);
      joints[`hueso_brazo_${prefix}`] = brazo;
      const armMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.22, 12), matShirt);
      armMesh.position.y = -0.11;
      armMesh.castShadow = true;
      brazo.add(armMesh);
      const codo = new THREE.Group();
      codo.position.set(0, -0.22, 0);
      brazo.add(codo);
      codo.add(createPivotMesh(0.038));
      joints[`codo_${prefix}`] = codo;
      const antebrazo = new THREE.Group();
      codo.add(antebrazo);
      joints[`hueso_antebrazo_${prefix}`] = antebrazo;
      const forearmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.038, 0.2, 12), matSkin);
      forearmMesh.position.y = -0.1;
      forearmMesh.castShadow = true;
      antebrazo.add(forearmMesh);
      const muñeca = new THREE.Group();
      muñeca.position.set(0, -0.2, 0);
      antebrazo.add(muñeca);
      muñeca.add(createPivotMesh(0.03));
      joints[`muñeca_${sidePrefix}`] = muñeca;
      const mano = new THREE.Group();
      muñeca.add(mano);
      joints[`mano_${sidePrefix}`] = mano;
      const handMesh = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.08, 0.03), matSkin);
      handMesh.position.y = -0.04;
      handMesh.castShadow = true;
      mano.add(handMesh);
    };
    buildArm(1);
    buildArm(-1);

    const buildLeg = (side: number) => {
      const prefix = side === 1 ? 'izquierdo' : 'derecho';
      const sidePrefix = side === 1 ? 'izquierda' : 'derecha';
      const cadera = new THREE.Group();
      cadera.position.set(side * 0.12, -0.07, 0);
      tronco_pelvis.add(cadera);
      cadera.add(createPivotMesh(0.05));
      joints[`cadera_${sidePrefix}`] = cadera;
      const muslo = new THREE.Group();
      cadera.add(muslo);
      joints[`hueso_muslo_${prefix}`] = muslo;
      const thighMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.35, 14), matPants);
      thighMesh.position.y = -0.175;
      thighMesh.castShadow = true;
      muslo.add(thighMesh);
      const exoThigh = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.32, 0.03), matExoStrap);
      exoThigh.position.set(side * 0.08, -0.175, 0);
      muslo.add(exoThigh);
      const rodilla = new THREE.Group();
      rodilla.position.set(0, -0.35, 0);
      muslo.add(rodilla);
      rodilla.add(createPivotMesh(0.045));
      joints[`rodilla_${sidePrefix}`] = rodilla;
      const pantorrilla = new THREE.Group();
      rodilla.add(pantorrilla);
      joints[`hueso_pantorrilla_${sidePrefix}`] = pantorrilla;
      const shinMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.048, 0.32, 14), matSkin);
      shinMesh.position.y = -0.16;
      shinMesh.castShadow = true;
      pantorrilla.add(shinMesh);
      const exoShin = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.3, 0.03), matExoStrap);
      exoShin.position.set(side * 0.065, -0.16, 0);
      pantorrilla.add(exoShin);
      const tobillo = new THREE.Group();
      tobillo.position.set(0, -0.32, 0);
      pantorrilla.add(tobillo);
      tobillo.add(createPivotMesh(0.035));
      joints[`tobillo_${prefix}`] = tobillo;
      const pie = new THREE.Group();
      tobillo.add(pie);
      joints[`pie_${prefix}`] = pie;
      const footMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.16), matShoes);
      footMesh.position.set(0, -0.025, 0.04);
      footMesh.castShadow = true;
      pie.add(footMesh);
    };
    buildLeg(1);
    buildLeg(-1);

    jointsRef.current = joints;
    statusMeshesRef.current = statusMeshes;

    const clock = new THREE.Clock();
    let animationFrameId: number;

    const renderLoop = () => {
      animationFrameId = requestAnimationFrame(renderLoop);
      const currentAngles = anglesRef.current;
      const hasManualAngles = Object.keys(currentAngles).length > 0;
      const currentColor = statusColorRef.current;

      statusMeshes.forEach((mesh) => {
        const mat = mesh.material as THREE.MeshBasicMaterial;
        if (currentColor && hasManualAngles) {
          mat.color.setStyle(currentColor);
          mat.opacity = 0.45;
        } else {
          mat.opacity = 0;
        }
      });

      if (hasManualAngles) {
        const currentAxes = axesRef.current;
        // Resetear rotaciones de todos los ejes antes de aplicar los ángulos
        Object.values(joints).forEach((grp) => {
          grp.rotation.set(0, 0, 0);
        });
        Object.entries(currentAngles).forEach(([jointName, degAngle]) => {
          if (joints[jointName] && typeof degAngle === 'number') {
            const axis: JointRotationAxis = currentAxes[jointName] ?? 'x';
            // Aplicar límites anatómicos realistas antes de convertir a radianes.
            const clampedDeg = clampAngle(jointName, degAngle);
            const rad = THREE.MathUtils.degToRad(clampedDeg);
            // Invertir el signo para el lado derecho en el eje Z (abducción)
            // para que ambos brazos/piernas se abran hacia afuera simétricamente.
            let signedRad = rad;
            if (axis === 'z' && jointName.includes('derecho')) {
              signedRad = -rad;
            }
            joints[jointName].rotation[axis] = signedRad;
          }
        });
      } else if (autoAnimateRef.current) {
        const t = clock.getElapsedTime() * 2.5;
        if (joints['tronco_pelvis']) joints['tronco_pelvis'].position.y = 0.95 + Math.abs(Math.sin(t)) * 0.03;
        if (joints['tronco_torax']) joints['tronco_torax'].rotation.y = Math.sin(t) * 0.08;
        if (joints['cabeza']) joints['cabeza'].rotation.y = -Math.sin(t) * 0.05;
        if (joints['cadera_izquierda']) joints['cadera_izquierda'].rotation.x = Math.sin(t) * 0.45;
        if (joints['rodilla_izquierda']) joints['rodilla_izquierda'].rotation.x = Math.max(0, Math.sin(t - 1.2)) * 0.7;
        if (joints['tobillo_izquierdo']) joints['tobillo_izquierdo'].rotation.x = -Math.sin(t) * 0.15;
        if (joints['cadera_derecha']) joints['cadera_derecha'].rotation.x = -Math.sin(t) * 0.45;
        if (joints['rodilla_derecha']) joints['rodilla_derecha'].rotation.x = Math.max(0, Math.sin(t + Math.PI - 1.2)) * 0.7;
        if (joints['tobillo_derecho']) joints['tobillo_derecho'].rotation.x = Math.sin(t) * 0.15;
        if (joints['hombro_izquierdo']) {
          joints['hombro_izquierdo'].rotation.x = -Math.sin(t) * 0.35;
          if (joints['codo_izquierdo']) joints['codo_izquierdo'].rotation.x = -0.2 - Math.abs(Math.sin(t)) * 0.2;
        }
        if (joints['hombro_derecho']) {
          joints['hombro_derecho'].rotation.x = Math.sin(t) * 0.35;
          if (joints['codo_derecho']) joints['codo_derecho'].rotation.x = -0.2 - Math.abs(Math.cos(t)) * 0.2;
        }
      }

      renderer.render(scene, camera);
    };
    renderLoop();

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newWidth, height: newHeight } = entry.contentRect;
        if (newWidth > 0 && newHeight > 0) {
          camera.aspect = newWidth / newHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(newWidth, newHeight);
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
      scene.clear();
    };
  }, []);

  return <div ref={containerRef} className={className} />;
};
