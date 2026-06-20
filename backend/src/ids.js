import { randomBytes } from 'crypto';

// Qisqa, takrorlanmas ID generatori (vaqt + tasodif).
export function newId() {
  return Date.now().toString(36) + randomBytes(4).toString('hex');
}
