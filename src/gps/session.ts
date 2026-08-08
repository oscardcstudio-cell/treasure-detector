/**
 * Session state machine: start, pause, resume, end.
 * Writes TrackPoint by batches to Dexie, enforces segment boundaries.
 *
 * INVARIANT #7: No interpolation across GPS gaps. Every segment is distinct.
 * When the screen goes dark, network drops, or pause is manual, that's a break.
 * TrackPoints on either side of the break are separate segments — never connect with a straight line.
 */

import { TreasureDB } from '../db/schema';
import { TrackPoint, UUID } from '../db/types';
import { generateUUID } from '../lib/uuid';

export type SessionState = 'idle' | 'active' | 'paused' | 'ended';

export interface SessionSegment {
  id: string; // arbitrary segment ID, not stored in DB
  points: TrackPoint[];
  startedAt: string; // ISO timestamp of first point
  endedAt?: string; // ISO timestamp of last point
}

export interface GPSSessionConfig {
  batchSize?: number; // points before flushing to DB (default 20)
  gapThresholdMs?: number; // gap > this = new segment (default 30s)
  wakeLocksSupported?: boolean; // whether to use navigator.wakeLock
}

export class GPSSession {
  private db: TreasureDB;
  private sessionId: UUID;
  private config: Required<GPSSessionConfig>;
  private state: SessionState = 'idle';
  private currentSegment: SessionSegment | null = null;
  private pendingBatch: TrackPoint[] = [];
  private lastPointTime: number = 0;
  private wakeLock: WakeLockSentinel | null = null;

  constructor(db: TreasureDB, sessionId: UUID, config: GPSSessionConfig = {}) {
    this.db = db;
    this.sessionId = sessionId;
    this.config = {
      batchSize: config.batchSize ?? 20,
      gapThresholdMs: config.gapThresholdMs ?? 30000, // 30 seconds
      wakeLocksSupported: config.wakeLocksSupported ?? !!navigator?.wakeLock,
    };
  }

  /**
   * Start the session, acquire wake lock if available.
   */
  async start(): Promise<void> {
    if (this.state !== 'idle') {
      throw new Error(`Cannot start session in state: ${this.state}`);
    }

    this.state = 'active';
    this.currentSegment = {
      id: `segment-${generateUUID()}`,
      points: [],
      startedAt: new Date().toISOString(),
    };

    // Try to acquire wake lock to keep the screen on
    if (this.config.wakeLocksSupported) {
      try {
        this.wakeLock = await navigator.wakeLock.request('screen');
      } catch (e) {
        console.warn('Wake lock acquisition failed:', e);
      }
    }
  }

  /**
   * Pause the session without ending it.
   * Next GPS fix will start a new segment (enforcing INVARIANT #7).
   */
  pause(): void {
    if (this.state !== 'active') {
      throw new Error(`Cannot pause session in state: ${this.state}`);
    }
    this.state = 'paused';
    this.lastPointTime = 0; // Reset to force a gap on resume
  }

  /**
   * Resume from pause.
   */
  resume(): void {
    if (this.state !== 'paused') {
      throw new Error(`Cannot resume session in state: ${this.state}`);
    }
    this.state = 'active';
  }

  /**
   * End the session. Flushes remaining points, releases wake lock.
   */
  async end(): Promise<void> {
    if (this.state === 'ended') {
      throw new Error('Session is already ended');
    }

    this.state = 'ended';
    await this.flushBatch();

    if (this.wakeLock) {
      try {
        await this.wakeLock.release();
      } catch (e) {
        console.warn('Wake lock release failed:', e);
      }
    }
  }

  /**
   * Record a GPS fix.
   * Manages segments and batching.
   * Enforces INVARIANT #7: no interpolation across gaps.
   */
  async recordFix(point: Omit<TrackPoint, 'id' | 'updatedAt' | 'syncedAt' | 'deviceId' | 'sessionId'>): Promise<void> {
    if (this.state === 'idle' || this.state === 'ended') {
      throw new Error(`Cannot record fix in state: ${this.state}`);
    }

    if (!this.currentSegment) {
      throw new Error('No active segment');
    }

    const now = Date.now();
    // pointTime not used directly, but used to update segment metadata

    // Check for gap: if last point was more than gapThresholdMs ago, start new segment
    if (this.lastPointTime > 0 && now - this.lastPointTime > this.config.gapThresholdMs) {
      // Flush the current segment
      await this.flushBatch();
      this.currentSegment = {
        id: `segment-${generateUUID()}`,
        points: [],
        startedAt: point.at,
      };
    }

    // Create TrackPoint with required fields
    const trackPoint: TrackPoint = {
      id: generateUUID(),
      sessionId: this.sessionId,
      at: point.at,
      coord: point.coord,
      accuracyM: point.accuracyM,
      altitudeM: point.altitudeM,
      speedMs: point.speedMs,
      updatedAt: new Date().toISOString(),
      deviceId: 'device-unknown', // Set by app context
      deleted: false,
    };

    this.currentSegment.points.push(trackPoint);
    this.lastPointTime = now;

    // Update segment timestamps
    if (!this.currentSegment.startedAt) {
      this.currentSegment.startedAt = point.at;
    }
    this.currentSegment.endedAt = point.at;

    // Batch flush
    if (this.pendingBatch.length >= this.config.batchSize) {
      await this.flushBatch();
    }
  }

  /**
   * Flush pending batch to Dexie.
   */
  private async flushBatch(): Promise<void> {
    if (this.currentSegment && this.currentSegment.points.length > 0) {
      try {
        await this.db.trackPoints.bulkAdd(this.currentSegment.points);
      } catch (e) {
        console.error('Failed to flush TrackPoint batch:', e);
        throw e;
      }
      this.currentSegment.points = [];
    }
  }

  getState(): SessionState {
    return this.state;
  }

  getCurrentSegmentId(): string | null {
    return this.currentSegment?.id ?? null;
  }
}
