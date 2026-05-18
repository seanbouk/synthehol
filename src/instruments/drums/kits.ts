/**
 * Built-in drum kits. The spine milestone only ships one, but the
 * shape supports a kit browser later.
 */

import type { KitDef } from './kit';
import { LANE_COLORS } from './kit';
import {
  kickVoice,
  snareVoice,
  closedHatVoice,
  openHatVoice,
  clapVoice,
  tomVoice,
  rimVoice,
  percVoice
} from './voices';

export const CLASSIC_808: KitDef = {
  id: 'classic-808',
  name: 'Classic 808',
  lanes: [
    { name: 'KICK', color: LANE_COLORS[0], voice: { kind: 'synth', trigger: kickVoice      } },
    { name: 'SNR',  color: LANE_COLORS[1], voice: { kind: 'synth', trigger: snareVoice     } },
    { name: 'CHH',  color: LANE_COLORS[2], voice: { kind: 'synth', trigger: closedHatVoice } },
    { name: 'OHH',  color: LANE_COLORS[3], voice: { kind: 'synth', trigger: openHatVoice   } },
    { name: 'CLP',  color: LANE_COLORS[4], voice: { kind: 'synth', trigger: clapVoice      } },
    { name: 'TOM',  color: LANE_COLORS[5], voice: { kind: 'synth', trigger: tomVoice       } },
    { name: 'RIM',  color: LANE_COLORS[6], voice: { kind: 'synth', trigger: rimVoice       } },
    { name: 'PRC',  color: LANE_COLORS[7], voice: { kind: 'synth', trigger: percVoice      } }
  ]
} as const;

export const DEFAULT_KIT = CLASSIC_808;
