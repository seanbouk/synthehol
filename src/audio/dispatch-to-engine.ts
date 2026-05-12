import type { DispatchedMessage, DeviceProfile } from '../types/midi';
import type { Engine } from './engine';
import { pitchBendValue } from '../midi/decode';

/**
 * Translate a DispatchedMessage into the appropriate Engine method call.
 *
 * The dispatcher has already applied sustain-pedal deferral, so by the
 * time we get here a 'note-off' really means "release this note." CC
 * values that match a slot in the device profile are forwarded as slot
 * inputs; CC 1 (mod wheel) gets its dedicated method; everything else
 * is dropped (for now).
 */
export function dispatchToEngine(
  msg: DispatchedMessage,
  engine: Engine,
  profile: DeviceProfile | null
): void {
  switch (msg.type) {
    case 'note-on':
      engine.noteOn(msg.channel, msg.data1, msg.data2);
      return;
    case 'note-off':
      engine.noteOff(msg.channel, msg.data1);
      return;
    case 'pitch-bend':
      engine.pitchBend(msg.channel, pitchBendValue(msg.data1, msg.data2));
      return;
    case 'cc':
      if (msg.data1 === 1) {
        engine.modWheel(msg.channel, msg.data2);
        return;
      }
      if (profile) {
        const slot = profile.ccToSlot[msg.data1];
        if (slot) engine.slot(slot, msg.data2);
      }
      return;
    default:
      return;
  }
}
