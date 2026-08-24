import React, { useEffect, useMemo, useState } from 'react';
import type { ExerciseDefinition, CharacterRole, JointRotationAxis } from '../../types/character.types';
import { KidModel3D } from '../characters3d/KidModel3D';
import { PhysioModel3D } from '../characters3d/PhysioModel3D';

interface SkeletonDemoProps {
  exercise: ExerciseDefinition;
  userRole?: CharacterRole;
}

export const SkeletonDemo: React.FC<SkeletonDemoProps> = ({ exercise, userRole = 'patient' }) => {
  const [progress, setProgress] = useState(0);
  const [selectedRole, setSelectedRole] = useState<CharacterRole>(
    userRole === 'physio' ? 'physio' : 'patient'
  );

  useEffect(() => {
    setProgress(0);
    let direction = 1;
    const interval = window.setInterval(() => {
      setProgress((previous) => {
        const next = previous + direction * 0.025;
        if (next >= 1) {
          direction = -1;
          return 1;
        }
        if (next <= 0) {
          direction = 1;
          return 0;
        }
        return next;
      });
    }, 40);
    return () => window.clearInterval(interval);
  }, [exercise.id]);

  const currentJointAngles: Record<string, number> = {};
  const jointAxes = useMemo<Partial<Record<string, JointRotationAxis>>>(() => {
    return exercise.targetJoints.reduce((axes, joint) => {
      axes[joint.joint] = joint.axis ?? 'x';
      return axes;
    }, {} as Partial<Record<string, JointRotationAxis>>);
  }, [exercise.targetJoints]);
  let overallStatusColor = '#10B981';

  exercise.targetJoints.forEach((j) => {
    const neutral = j.neutralAngle ?? 0;
    const angle = neutral + (j.targetAngle - neutral) * progress;
    currentJointAngles[j.joint] = angle;
    const diff = Math.abs(angle - j.targetAngle);
    const tolerance = j.tolerance ?? 5;
    if (diff > tolerance + 10) {
      overallStatusColor = '#EF4444';
    } else if (diff > tolerance && overallStatusColor !== '#EF4444') {
      overallStatusColor = '#F59E0B';
    }
  });

  return (
    <div className="glass-panel p-4 sm:p-6 rounded-3xl text-on-surface flex flex-col items-center w-full max-w-sm mx-auto shadow-2xl border border-outline-variant/20">
      <div className="w-full flex justify-between items-start mb-4">
        <div>
          <h4 className="text-base font-bold text-on-surface">{exercise.name}</h4>
          <p className="text-xs text-on-surface-variant line-clamp-1">{exercise.description}</p>
        </div>
        <div
          className="px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shrink-0"
          style={{ backgroundColor: `${overallStatusColor}20`, color: overallStatusColor }}
        >
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: overallStatusColor }} />
          {progress >= 0.9 ? 'Rango Óptimo' : 'En Ejecución'}
        </div>
      </div>

      <div className="flex bg-surface-variant/30 p-1 rounded-xl w-full mb-3" aria-label="Seleccionar personaje">
        <button
          type="button"
          onClick={() => setSelectedRole('patient')}
          aria-pressed={selectedRole === 'patient'}
          className={`flex-1 px-3 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 text-sm ${
            selectedRole === 'patient' ? 'bg-primary text-on-primary font-semibold' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span aria-hidden="true">🧒</span>
          Niño
        </button>
        <button
          type="button"
          onClick={() => setSelectedRole('physio')}
          aria-pressed={selectedRole === 'physio'}
          className={`flex-1 px-3 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 text-sm ${
            selectedRole === 'physio' ? 'bg-primary text-on-primary font-semibold' : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span aria-hidden="true">🩺</span>
          Fisioterapeuta
        </button>
      </div>

      <div className="w-full h-[min(66vw,24rem)] min-h-[18rem] sm:h-96 relative bg-surface-variant/20 rounded-2xl p-2 sm:p-4 border border-outline-variant/20 flex items-center justify-center overflow-hidden">
        {selectedRole === 'patient' ? (
          <KidModel3D key={`${exercise.id}-niño-3d`} jointAngles={currentJointAngles} jointAxes={jointAxes} statusColor={overallStatusColor} className="w-full h-full min-h-0" />
        ) : (
          <PhysioModel3D key={`${exercise.id}-fisio-3d`} jointAngles={currentJointAngles} jointAxes={jointAxes} statusColor={overallStatusColor} className="w-full h-full min-h-0" />
        )}
      </div>

      <div className="w-full mt-4 space-y-2">
        <div className="grid grid-cols-2 gap-2 text-xs bg-surface-variant/20 p-2.5 rounded-xl border border-outline-variant/20">
          {exercise.targetJoints.map((j) => (
            <div key={j.joint} className="flex justify-between">
              <span className="text-on-surface-variant capitalize">{j.joint.replace('_', ' ')}:</span>
              <span className="font-semibold text-primary">
                {Math.round(currentJointAngles[j.joint] ?? 0)}° / {j.targetAngle}°
              </span>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-on-surface-variant px-1 pt-1">
          <span>
            Series: <strong className="text-on-surface">{exercise.sets}</strong>
          </span>
          <span>
            Repeticiones: <strong className="text-on-surface">{exercise.reps}</strong>
          </span>
          <span>
            Sostener: <strong className="text-on-surface">{exercise.holdDurationSec}s</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
