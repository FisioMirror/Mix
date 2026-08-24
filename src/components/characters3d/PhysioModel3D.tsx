import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { JointRotationAxis } from '../../types/character.types';

export interface PhysioModel3DProps {
  jointAngles?: Partial<Record<string, number>>;
  /** Mapa de articulaciones y su eje de movimiento 3D. */
  jointAxes?: Partial<Record<string, JointRotationAxis>>;
  statusColor?: string;
  autoAnimate?: boolean;
  className?: string;
}

export const PhysioModel3D: React.FC<PhysioModel3DProps> = ({
  jointAngles = {},
  jointAxes = {},
  statusColor,
  autoAnimate = false,
  className = 'w-full h-full min-h-[320px]',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const jointsRef = useRef<Record<string, THREE.Group>>({});
  const statusMeshesRef = useRef<THREE.Mesh[]>([]);
  const anglesRef = useRef(jointAngles);
  const axesRef = useRef(jointAxes);
  const statusColorRef = useRef(statusColor);
  const autoAnimateRef = useRef(autoAnimate);

  useEffect(() => {
    anglesRef.current = jointAngles;
    axesRef.current = jointAxes;
    statusColorRef.current = statusColor;
    autoAnimateRef.current = autoAnimate;
  }, [jointAngles, jointAxes, statusColor, autoAnimate]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const width = container.clientWidth || 300;
    const height = container.clientHeight || 400;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.45, 4.4);
    camera.lookAt(0, 1.15, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const mainLight = new THREE.DirectionalLight(0xfffaed, 0.85);
    mainLight.position.set(4, 8, 5);
    mainLight.castShadow = true;
    scene.add(mainLight);
    const fillLight = new THREE.DirectionalLight(0x90b5d8, 0.35);
    fillLight.position.set(-4, 4, -3);
    scene.add(fillLight);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 8),
      new THREE.ShadowMaterial({ opacity: 0.14 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const matSkin = new THREE.MeshLambertMaterial({ color: 0xFEDBC5 });
    const matHair = new THREE.MeshLambertMaterial({ color: 0x613626 });
    const matScrub = new THREE.MeshLambertMaterial({ color: 0x206E54 });
    const matPants = new THREE.MeshLambertMaterial({ color: 0x134E39 });
    const matBadge = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    const matShoe = new THREE.MeshLambertMaterial({ color: 0x1E293B });
    const matEyes = new THREE.MeshBasicMaterial({ color: 0x24150E });
    const matJointPivot = new THREE.MeshStandardMaterial({ color: 0x2C6351, roughness: 0.35, metalness: 0.4 });

    const joints: Record<string, THREE.Group> = {};
    const statusMeshes: THREE.Mesh[] = [];

    const createPivotMesh = (r = 0.045) => {
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

    const pelvis = new THREE.Group();
    pelvis.position.set(0, 1.15, 0);
    scene.add(pelvis);
    joints['tronco_pelvis'] = pelvis;
    const pMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.17, 0.15, 16), matPants);
    pMesh.castShadow = true;
    pelvis.add(pMesh);

    const abdomen = new THREE.Group();
    abdomen.position.set(0, 0.11, 0);
    pelvis.add(abdomen);
    joints['tronco_abdomen'] = abdomen;
    const abMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.19, 0.17, 16), matScrub);
    abMesh.position.y = 0.085;
    abMesh.castShadow = true;
    abdomen.add(abMesh);

    const torax = new THREE.Group();
    torax.position.set(0, 0.17, 0);
    abdomen.add(torax);
    joints['tronco_torax'] = torax;
    const txMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.21, 0.25, 16), matScrub);
    txMesh.position.y = 0.125;
    txMesh.castShadow = true;
    torax.add(txMesh);
    const badge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.01), matBadge);
    badge.position.set(0.11, 0.15, 0.22);
    torax.add(badge);

    const cuello = new THREE.Group();
    cuello.position.set(0, 0.25, 0);
    torax.add(cuello);
    joints['cuello'] = cuello;

    const cabeza = new THREE.Group();
    cabeza.position.set(0, 0.08, 0);
    cuello.add(cabeza);
    joints['cabeza'] = cabeza;
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 24), matSkin);
    headMesh.position.y = 0.17;
    headMesh.castShadow = true;
    cabeza.add(headMesh);
    const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.218, 16, 16), matHair);
    hairCap.position.set(0, 0.2, -0.03);
    cabeza.add(hairCap);

    const curlsCoords: [number, number, number][] = [
      [-0.12, 0.31, 0.08], [0, 0.35, 0.1], [0.12, 0.31, 0.08],
      [-0.15, 0.25, 0.12], [0.15, 0.25, 0.12], [-0.08, 0.36, 0.02],
      [0.08, 0.36, 0.02], [-0.17, 0.18, 0.04], [0.17, 0.18, 0.04],
    ];
    curlsCoords.forEach(([x, y, z]) => {
      const curl = new THREE.Mesh(new THREE.DodecahedronGeometry(0.075), matHair);
      curl.position.set(x, y, z);
      cabeza.add(curl);
    });

    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.017, 12, 12), matEyes);
    eyeL.position.set(-0.065, 0.17, 0.185);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.065;
    cabeza.add(eyeL, eyeR);

    const addArm = (side: number) => {
      const p = side === 1 ? 'izquierdo' : 'derecho';
      const sp = side === 1 ? 'izquierda' : 'derecha';
      const sh = new THREE.Group();
      sh.position.set(side * 0.28, 0.22, 0);
      torax.add(sh);
      sh.add(createPivotMesh(0.048));
      joints[`hombro_${p}`] = sh;
      const arm = new THREE.Group();
      sh.add(arm);
      joints[`hueso_brazo_${p}`] = arm;
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.052, 0.11, 14), matScrub);
      sleeve.position.y = -0.055;
      sleeve.castShadow = true;
      arm.add(sleeve);
      const skinArm = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.042, 0.16, 14), matSkin);
      skinArm.position.y = -0.18;
      skinArm.castShadow = true;
      arm.add(skinArm);
      const el = new THREE.Group();
      el.position.set(0, -0.26, 0);
      arm.add(el);
      el.add(createPivotMesh(0.04));
      joints[`codo_${p}`] = el;
      const fa = new THREE.Group();
      el.add(fa);
      joints[`hueso_antebrazo_${p}`] = fa;
      const faMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.036, 0.23, 14), matSkin);
      faMesh.position.y = -0.115;
      faMesh.castShadow = true;
      fa.add(faMesh);
      const wr = new THREE.Group();
      wr.position.set(0, -0.23, 0);
      fa.add(wr);
      wr.add(createPivotMesh(0.032));
      joints[`muñeca_${sp}`] = wr;
      const hand = new THREE.Group();
      wr.add(hand);
      joints[`mano_${sp}`] = hand;
      const hMesh = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.08, 0.03), matSkin);
      hMesh.position.y = -0.04;
      hMesh.castShadow = true;
      hand.add(hMesh);
    };
    addArm(1);
    addArm(-1);

    const addLeg = (side: number) => {
      const p = side === 1 ? 'izquierdo' : 'derecho';
      const sp = side === 1 ? 'izquierda' : 'derecha';
      const hp = new THREE.Group();
      hp.position.set(side * 0.12, -0.07, 0);
      pelvis.add(hp);
      hp.add(createPivotMesh(0.052));
      joints[`cadera_${sp}`] = hp;
      const th = new THREE.Group();
      hp.add(th);
      joints[`hueso_muslo_${p}`] = th;
      const thMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.42, 16), matPants);
      thMesh.position.y = -0.21;
      thMesh.castShadow = true;
      th.add(thMesh);
      const kn = new THREE.Group();
      kn.position.set(0, -0.42, 0);
      th.add(kn);
      kn.add(createPivotMesh(0.046));
      joints[`rodilla_${sp}`] = kn;
      const shn = new THREE.Group();
      kn.add(shn);
      joints[`hueso_pantorrilla_${sp}`] = shn;
      const shnMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.052, 0.4, 16), matPants);
      shnMesh.position.y = -0.2;
      shnMesh.castShadow = true;
      shn.add(shnMesh);
      const ank = new THREE.Group();
      ank.position.set(0, -0.4, 0);
      shn.add(ank);
      ank.add(createPivotMesh(0.038));
      joints[`tobillo_${p}`] = ank;
      const ft = new THREE.Group();
      ank.add(ft);
      joints[`pie_${p}`] = ft;
      const ftMesh = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.055, 0.18), matShoe);
      ftMesh.position.set(0, -0.027, 0.04);
      ftMesh.castShadow = true;
      ft.add(ftMesh);
    };
    addLeg(1);
    addLeg(-1);

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
        Object.values(joints).forEach((grp) => {
          grp.rotation.set(0, 0, 0);
        });
        Object.entries(currentAngles).forEach(([jointName, degAngle]) => {
          if (joints[jointName] && typeof degAngle === 'number') {
            const axis: JointRotationAxis = currentAxes[jointName] ?? 'x';
            const rad = THREE.MathUtils.degToRad(degAngle);
            let signedRad = rad;
            if (axis === 'z' && jointName.includes('derecho')) {
              signedRad = -rad;
            }
            joints[jointName].rotation[axis] = signedRad;
          }
        });
      } else if (autoAnimateRef.current) {
        const t = clock.getElapsedTime() * 2.0;
        if (joints['hombro_izquierdo']) joints['hombro_izquierdo'].rotation.x = 0.35 + Math.sin(t) * 0.06;
        if (joints['codo_izquierdo']) joints['codo_izquierdo'].rotation.x = -0.55;
        if (joints['hombro_derecho']) joints['hombro_derecho'].rotation.x = 0.35 - Math.sin(t) * 0.06;
        if (joints['codo_derecho']) joints['codo_derecho'].rotation.x = -0.55;
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
