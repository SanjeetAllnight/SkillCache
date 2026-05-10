/**
 * lib/webrtc.ts
 * @deprecated This file is no longer used by useWebRTC.ts.
 * The hook now uses native RTCPeerConnection directly (no simple-peer).
 * Kept for reference only — safe to delete once all call routes confirmed stable.
 *
 * WebRTC helper service previously built on top of simple-peer.
 */

// simple-peer only works in the browser (it needs window/RTCPeerConnection).
// Guard against accidental SSR imports.
if (typeof window === "undefined") {
  throw new Error(
    "[webrtc] simple-peer must be imported from a Client Component (`use client`)."
  );
}

import Peer, { type Instance, type Options } from "simple-peer";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PeerOptions {
  /** Whether this side should initiate the connection (i.e. send the first offer). */
  initiator: boolean;
  /** Local MediaStream obtained from getUserMedia / getDisplayMedia. Optional for data-only peers. */
  stream?: MediaStream;
  /** Ordered list of TURN/STUN servers. Defaults to Google's public STUN server. */
  iceServers?: RTCIceServer[];
  /** Called when an ICE candidate or SDP offer/answer is ready to be sent to the remote peer. */
  onSignal?: (data: Peer.SignalData) => void;
  /** Called when the remote peer's media stream arrives. */
  onStream?: (stream: MediaStream) => void;
  /** Called when the P2P data channel is open and ready. */
  onConnect?: () => void;
  /** Called on any peer error. */
  onError?: (err: Error) => void;
  /** Called when the connection closes. */
  onClose?: () => void;
}

export type PeerInstance = Instance;

// ─── Default ICE configuration ────────────────────────────────────────────────

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * Creates and wires up a simple-peer instance with the supplied callbacks.
 * Returns the raw Peer instance so callers can call `.signal()` and `.destroy()`.
 */
export function createPeer({
  initiator,
  stream,
  iceServers = DEFAULT_ICE_SERVERS,
  onSignal,
  onStream,
  onConnect,
  onError,
  onClose,
}: PeerOptions): Instance {
  const opts: Options = {
    initiator,
    trickle: true, // Send ICE candidates incrementally for faster connection
    config: { iceServers },
    ...(stream ? { stream } : {}),
  };

  const peer = new Peer(opts);

  if (onSignal) peer.on("signal", onSignal);
  if (onStream) peer.on("stream", onStream);
  if (onConnect) peer.on("connect", onConnect);
  if (onError) peer.on("error", onError);
  if (onClose) peer.on("close", onClose);

  return peer;
}

// ─── Media helpers ────────────────────────────────────────────────────────────

/** Asks the browser for camera + microphone access. */
export async function getUserMediaStream(
  constraints: MediaStreamConstraints = { video: true, audio: true }
): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (err) {
    throw new Error(
      `[webrtc] Failed to get user media: ${(err as Error).message}`
    );
  }
}

/** Stops all tracks on a MediaStream, effectively releasing the camera/mic. */
export function stopStream(stream: MediaStream | null | undefined): void {
  stream?.getTracks().forEach((t) => t.stop());
}

/** Safely destroys a peer and frees resources. */
export function destroyPeer(peer: Instance | null | undefined): void {
  try {
    peer?.destroy();
  } catch {
    // ignore destroy errors
  }
}
