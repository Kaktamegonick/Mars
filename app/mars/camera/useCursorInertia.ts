import { useEffect, useRef, type RefObject } from 'react';
import * as THREE from 'three';

const SPRING_STRENGTH = 5.2;
const SPRING_DAMPING = 0.82;

type CursorInertiaState = {
  target: THREE.Vector2;
  offset: THREE.Vector2;
  velocity: THREE.Vector2;
  pointerDown: boolean;
};

export function useCursorInertia() {
  const stateRef = useRef<CursorInertiaState>({
    target: new THREE.Vector2(),
    offset: new THREE.Vector2(),
    velocity: new THREE.Vector2(),
    pointerDown: false,
  });

  useEffect(() => {
    const updateCursor = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      const state = stateRef.current;
      state.target.set(
        THREE.MathUtils.clamp((event.clientX / window.innerWidth) * 2 - 1, -1, 1),
        THREE.MathUtils.clamp((event.clientY / window.innerHeight) * 2 - 1, -1, 1),
      );
    };
    const beginInteraction = (event: PointerEvent) => {
      if (event.pointerType !== 'touch') stateRef.current.pointerDown = true;
    };
    const endInteraction = () => { stateRef.current.pointerDown = false; };
    const centerCursor = () => { stateRef.current.target.set(0, 0); };

    window.addEventListener('pointermove', updateCursor, { passive: true });
    window.addEventListener('pointerdown', beginInteraction, { passive: true });
    window.addEventListener('pointerup', endInteraction, { passive: true });
    window.addEventListener('pointercancel', endInteraction, { passive: true });
    document.documentElement.addEventListener('mouseleave', centerCursor);
    window.addEventListener('blur', centerCursor);

    return () => {
      window.removeEventListener('pointermove', updateCursor);
      window.removeEventListener('pointerdown', beginInteraction);
      window.removeEventListener('pointerup', endInteraction);
      window.removeEventListener('pointercancel', endInteraction);
      document.documentElement.removeEventListener('mouseleave', centerCursor);
      window.removeEventListener('blur', centerCursor);
    };
  }, []);

  return stateRef;
}

export function stepCursorInertia(
  stateRef: RefObject<CursorInertiaState>,
  delta: number,
  maxYaw: number,
  maxPitch: number,
) {
  const state = stateRef.current;
  if (state.pointerDown) return state.offset;

  const step = Math.min(delta, 0.033);
  const targetX = state.target.x * maxYaw;
  const targetY = state.target.y * maxPitch;
  const accelerationX = (targetX - state.offset.x) * SPRING_STRENGTH * SPRING_STRENGTH
    - state.velocity.x * 2 * SPRING_DAMPING * SPRING_STRENGTH;
  const accelerationY = (targetY - state.offset.y) * SPRING_STRENGTH * SPRING_STRENGTH
    - state.velocity.y * 2 * SPRING_DAMPING * SPRING_STRENGTH;

  state.velocity.x += accelerationX * step;
  state.velocity.y += accelerationY * step;
  state.offset.x += state.velocity.x * step;
  state.offset.y += state.velocity.y * step;
  return state.offset;
}

export function resetCursorInertia(stateRef: RefObject<CursorInertiaState>) {
  const state = stateRef.current;
  state.offset.set(0, 0);
  state.velocity.set(0, 0);
}
