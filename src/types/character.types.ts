export type CharacterRole = 'physio' | 'patient';

export type LoginState =
  | 'idle'
  | 'emailFocus'
  | 'emailValid'
  | 'passwordFocus'
  | 'passwordPeek'
  | 'loading'
  | 'error'
  | 'success';

export type StandardJointName =
  | 'cabeza'
  | 'cuello'
  | 'tronco_torax'
  | 'tronco_abdomen'
  | 'tronco_pelvis'
  | 'hombro_izquierdo'
  | 'hombro_derecho'
  | 'codo_izquierdo'
  | 'codo_derecho'
  | 'muñeca_izquierda'
  | 'muñeca_derecha'
  | 'mano_izquierda'
  | 'mano_derecha'
  | 'cadera_izquierda'
  | 'cadera_derecha'
  | 'rodilla_izquierda'
  | 'rodilla_derecha'
  | 'tobillo_izquierdo'
  | 'tobillo_derecho'
  | 'pie_izquierdo'
  | 'pie_derecho'
  | 'hueso_brazo_izquierdo'
  | 'hueso_brazo_derecho'
  | 'hueso_antebrazo_izquierdo'
  | 'hueso_antebrazo_derecho'
  | 'hueso_muslo_izquierdo'
  | 'hueso_muslo_derecho'
  | 'hueso_pantorrilla_izquierda'
  | 'hueso_pantorrilla_derecha';

export type JointRotationAxis = 'x' | 'y' | 'z';

/**
 * Posición corporal para la demostración del ejercicio en 3D.
 * - 'pie'        → De pie (vertical, posición por defecto).
 * - 'sentado'    → Sentado (caderas flexionadas ~90°, cuerpo más bajo).
 * - 'acostado'   → Acostado / decúbito supino (modelo tumbado, rotación -90° en X).
 * - 'decubito_lateral' → Decúbito lateral (modelo de costado, rotación 90° en Z).
 */
export type ExercisePosition = 'pie' | 'sentado' | 'acostado' | 'decubito_lateral';

export interface JointAngleConfig {
  joint: StandardJointName;
  targetAngle: number;
  neutralAngle?: number;
  tolerance?: number;
  /**
   * Eje de rotación 3D para esta articulación en la demostración.
   * 'x' = plano sagital (flexión/extensión hacia adelante-atrás),
   * 'y' = plano transversal (rotación horizontal),
   * 'z' = plano frontal (abducción/aducción, inclinación lateral).
   * Por defecto 'x'.
   */
  axis?: JointRotationAxis;
}

export interface ExerciseDefinition {
  id: string;
  name: string;
  description: string;
  targetJoints: JointAngleConfig[];
  sets: number;
  reps: number;
  holdDurationSec: number;
}

export interface JointAngle {
  joint: string;
  targetAngle: number;
  currentAngle: number;
  tolerance: number;
}
