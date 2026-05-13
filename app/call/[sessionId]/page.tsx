"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { Icon } from "@/components/ui/icon";
import { useWebRTC, type ConnectionPhase, type MediaMode } from "@/hooks/useWebRTC";
import { useAuth } from "@/components/providers/auth-provider";
import {
  canJoinSession,
  completeSession,
  listenSessionById,
  listenToSessionCallStatus,
  startSession,
  updateSessionCallStatus,
  type ApiSession,
  type CallStatus,
} from "@/lib/firebaseServices";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CallPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const { user, isAuthReady } = useAuth();

  // ── Session + access control ───────────────────────────────────────────────
  const [session, setSession]           = useState<ApiSession | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  // ── Determine role (mentor = initiator) ───────────────────────────────────
  const isMentor = session?.mentor?._id === user?._id;

  // ── WebRTC hook ────────────────────────────────────────────────────────────
  const myUid = user?._id ?? "";
  const {
    localStream,
    remoteStream,
    isConnected,
    connectionPhase,
    mediaMode,
    error: rtcError,
    startCall,
    joinCall,
    endCall,
  } = useWebRTC({ callId: sessionId, myUid });

  // Convenience: does the local stream actually have video tracks?
  const hasLocalVideo = (localStream?.getVideoTracks().length ?? 0) > 0;

  // ── Video refs ─────────────────────────────────────────────────────────────
  const localVideoRef  = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [isMuted,          setIsMuted]          = useState(false);
  const [isCameraOff,      setIsCameraOff]      = useState(false);
  const [elapsed,          setElapsed]          = useState(0);
  const [showJoinToast,    setShowJoinToast]    = useState(false);
  /** Live callStatus synced from Firestore — drives learner gating. */
  const [sharedCallStatus, setSharedCallStatus] = useState<CallStatus | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load session + enforce access ─────────────────────────────────────────
  useEffect(() => {
    if (!isAuthReady || !sessionId) return;
    if (!user) {
      router.replace(`/auth?next=/call/${sessionId}`);
      return;
    }

    setSessionLoading(true);
    const unsubscribe = listenSessionById(
      sessionId,
      (data) => {
        if (!data) {
          setSessionError("Session not found.");
          setSessionLoading(false);
          return;
        }

        const isParticipant =
          data.mentorId === user._id || data.learnerId === user._id;
        if (!isParticipant) {
          setAccessDenied(true);
          setSessionLoading(false);
          return;
        }

        const allowedStatus =
          data.status === "live" ||
          data.status === "accepted" ||
          data.status === "upcoming";
        if (!allowedStatus) {
          setSessionError(
            data.status === "pending"
              ? "This session request has not been accepted yet."
              : `This session is ${data.status}. Calls are only available for accepted or live sessions.`,
          );
          setSessionLoading(false);
          return;
        }

        if (data.status !== "live" && !canJoinSession(data)) {
          setSessionError("The call room opens 15 minutes before the scheduled start time.");
          setSessionLoading(false);
          return;
        }

        setSession(data);
        setSessionError(null);
        setSessionLoading(false);
      },
      (err) => {
        setSessionError(err.message || "Session not found.");
        setSessionLoading(false);
      },
    );

    return () => unsubscribe();
  }, [isAuthReady, sessionId, user, router]);

  // ── Bind streams ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (connectionPhase === "connected") {
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      setElapsed(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [connectionPhase]);

  // ── Real-time shared callStatus listener ───────────────────────────────
  // Subscribes to sessions/{sessionId}.callStatus via onSnapshot.
  // Learner uses this to know when the mentor has started (→ show Join button).
  useEffect(() => {
    if (!sessionId || !session) return; // wait for session to load first
    const unsub = listenToSessionCallStatus(sessionId, (status) => {
      setSharedCallStatus(status);
    });
    return () => unsub();
  }, [sessionId, session]);

  // ── Show "other user joined" toast once when first connected ──────────────
  const prevConnectedRef = useRef(false);
  useEffect(() => {
    if (isConnected && !prevConnectedRef.current) {
      prevConnectedRef.current = true;
      setShowJoinToast(true);
    }
    if (!isConnected) {
      prevConnectedRef.current = false;
    }
  }, [isConnected]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleStartCall = useCallback(async () => {
    // 1. Write "started" to Firestore — learner will see this and unlock Join
    await updateSessionCallStatus(sessionId, "started").catch(() => {/* best-effort */});
    // 2. Begin WebRTC initiation
    await startCall();
  }, [sessionId, startCall]);

  const handleJoinCall = useCallback(async () => {
    // 1. Write "joined" to Firestore so both sides know learner is connecting
    await updateSessionCallStatus(sessionId, "joined").catch(() => {/* best-effort */});
    // 2. Begin WebRTC answer
    await joinCall();
  }, [sessionId, joinCall]);

  const handleEndCall = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    // Reset shared call state to idle so the room can be reused
    await updateSessionCallStatus(sessionId, "idle").catch(() => {/* best-effort */});
    await endCall();
    setTimeout(() => router.push("/sessions"), 1500);
  }, [sessionId, endCall, router]);

  const toggleMute = useCallback(() => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach((t) => { t.enabled = isMuted; });
    setIsMuted((m) => !m);
  }, [localStream, isMuted]);

  const toggleCamera = useCallback(() => {
    if (!localStream) return;
    localStream.getVideoTracks().forEach((t) => { t.enabled = isCameraOff; });
    setIsCameraOff((c) => !c);
  }, [localStream, isCameraOff]);

  // ── Status pill config ────────────────────────────────────────────────────
  type PillConfig = { label: string; color: string; dot: string };
  const pillConfig: Record<ConnectionPhase, PillConfig> = {
    idle:       { label: "Ready",               color: "text-stone-400",   dot: "bg-stone-500" },
    waiting:    { label: "Waiting…",            color: "text-sky-400",     dot: "bg-sky-400 animate-pulse" },
    ringing:    { label: "Ringing…",            color: "text-amber-400",   dot: "bg-amber-400 animate-pulse" },
    connecting: { label: "Connecting…",         color: "text-amber-400",   dot: "bg-amber-400 animate-pulse" },
    connected:  { label: formatDuration(elapsed), color: "text-emerald-400", dot: "bg-emerald-400" },
    ended:      { label: "Call Ended",          color: "text-red-400",     dot: "bg-red-500" },
  };
  const pill = pillConfig[connectionPhase];

  // Controls: mute available when any local stream exists; camera only when video tracks exist
  const canMute   = !!localStream && connectionPhase === "connected";
  const canCamera = hasLocalVideo && connectionPhase === "connected";

  // Phases where a spinner should show in the control bar
  const isInProgress =
    connectionPhase === "waiting" ||
    connectionPhase === "ringing" ||
    connectionPhase === "connecting";

  // ─── Guard renders ─────────────────────────────────────────────────────────

  if (sessionLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-950">
        <div className="flex flex-col items-center gap-4 text-white">
          <Spinner className="h-8 w-8 text-primary" />
          <p className="text-sm text-stone-400">Loading session…</p>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-stone-950 text-white">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 ring-1 ring-red-500/30">
          <Icon name="lock" className="text-3xl text-red-400" />
        </div>
        <div className="text-center">
          <h1 className="text-xl font-bold">Access Denied</h1>
          <p className="mt-2 text-sm text-stone-400">
            Only the session mentor and learner may join this call.
          </p>
        </div>
        <button
          id="btn-back-sessions"
          type="button"
          onClick={() => router.push("/sessions")}
          className="rounded-xl bg-white/10 px-6 py-2.5 text-sm font-semibold transition hover:bg-white/20"
        >
          Back to Sessions
        </button>
      </div>
    );
  }

  if (sessionError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-stone-950 text-white">
        <Icon name="error" className="text-4xl text-red-400" />
        <p className="text-lg font-semibold">{sessionError}</p>
        <button
          id="btn-back-sessions-error"
          type="button"
          onClick={() => router.push("/sessions")}
          className="rounded-xl bg-white/10 px-6 py-2.5 text-sm font-semibold transition hover:bg-white/20"
        >
          Back to Sessions
        </button>
      </div>
    );
  }

  // ─── Main Call UI ──────────────────────────────────────────────────────────

  return (
    <main className="relative flex min-h-screen overflow-hidden bg-stone-950 text-white">

      {/* Remote video — full background */}
      <video
        ref={remoteVideoRef}
        id="remote-video"
        autoPlay
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Remote stream placeholder */}
      {!remoteStream && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-gradient-to-br from-stone-900 via-stone-950 to-black">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10">
            {connectionPhase === "waiting" || connectionPhase === "ringing" || connectionPhase === "connecting" ? (
              <Spinner className="h-9 w-9 text-sky-400" />
            ) : (
              <Icon name="person" className="text-5xl text-stone-500" />
            )}
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <p className="text-sm font-semibold text-white">
              {connectionPhase === "idle" && (
                isMentor ? "Press Start Call to begin" : "Press Join Call to connect"
              )}
              {connectionPhase === "waiting" && (
                isMentor
                  ? "Waiting for learner to join…"
                  : "Waiting for mentor to start the call…"
              )}
              {connectionPhase === "ringing" && "Mentor started the session — tap Join Call"}
              {connectionPhase === "connecting" && "Connecting…"}
              {connectionPhase === "ended" && "Call Ended"}
            </p>
            {(connectionPhase === "waiting" || connectionPhase === "ringing" || connectionPhase === "connecting") && (
              <p className="text-xs text-stone-500">
                This may take a moment
              </p>
            )}
          </div>
        </div>
      )}

      {/* Scrim */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/60" />

      {/* Header */}
      <header className="absolute left-0 right-0 top-0 z-20 flex items-start justify-between gap-4 px-5 py-5 sm:px-6 md:px-10 md:py-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary font-headline text-sm font-bold text-on-primary">
            SC
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-headline text-base font-bold leading-tight">
              {session?.title ?? "Session Call"}
            </h1>
            <p className="text-[11px] font-medium text-stone-400">
              <span className={isMentor ? "text-emerald-400" : "text-sky-400"}>
                {isMentor ? "Mentor" : "Learner"}
              </span>
              {" · "}
              {session?.mentor?.name && session?.learner?.name
                ? `${session.mentor.name} & ${session.learner.name}`
                : sessionId}
            </p>
          </div>
        </div>

        {/* Status pill */}
        <div
          className="flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-stone-900/70 px-3 py-1.5 backdrop-blur-md"
          aria-live="polite"
          aria-label={`Connection status: ${pill.label}`}
        >
          <span className={`h-2 w-2 rounded-full ${pill.dot}`} />
          <span className={`text-xs font-semibold tabular-nums ${pill.color}`}>
            {pill.label}
          </span>
        </div>
      </header>

      {/* Participant chips */}
      {session && connectionPhase !== "ended" && (
        <div className="absolute left-5 top-20 z-20 flex flex-col gap-1.5 sm:left-6 md:left-10 md:top-24">
          <ParticipantChip
            name={session.mentor?.name ?? "Mentor"}
            role="Mentor"
            isYou={isMentor}
            online={
              isMentor || isConnected || sharedCallStatus === "started" || sharedCallStatus === "joined"
            }
          />
          <ParticipantChip
            name={session.learner?.name ?? "Learner"}
            role="Learner"
            isYou={!isMentor}
            online={
              !isMentor || isConnected || sharedCallStatus === "joined"
            }
          />
        </div>
      )}

      {/* Local (self) PiP */}
      <div className="absolute bottom-28 right-5 z-20 h-44 w-32 overflow-hidden rounded-2xl border-2 border-white/20 shadow-2xl sm:h-52 sm:w-40 md:bottom-32 md:right-10 md:h-64 md:w-48">
        <video
          ref={localVideoRef}
          id="local-video"
          autoPlay
          muted
          playsInline
          className="h-full w-full object-cover"
        />
        {(isCameraOff || !hasLocalVideo) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-stone-900/90">
            <Icon name="videocam_off" className="text-3xl text-stone-500" />
            {mediaMode === "audio-only" && (
              <span className="text-[9px] font-semibold uppercase tracking-wide text-amber-400">Audio Only</span>
            )}
            {mediaMode === "none" && (
              <span className="text-[9px] font-semibold uppercase tracking-wide text-stone-500">No Media</span>
            )}
          </div>
        )}
        <div className="absolute bottom-2 left-2 rounded-md bg-stone-900/50 px-2 py-0.5 text-[10px] text-white backdrop-blur-md">
          You
        </div>
        {isMuted && (
          <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600/80">
            <Icon name="mic_off" className="text-[10px] text-white" />
          </div>
        )}
      </div>

      {/* Media mode banner — shown when camera unavailable */}
      {(connectionPhase === "connected" || connectionPhase === "connecting" || connectionPhase === "waiting") &&
        mediaMode !== "full" && (
        <MediaModeBanner mode={mediaMode} />
      )}

      {/* RTC Error banner */}
      {rtcError && (
        <div
          role="alert"
          className="absolute left-1/2 top-20 z-30 -translate-x-1/2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-medium text-red-300 backdrop-blur-md"
        >
          {rtcError}
        </div>
      )}

      {/* ── Connection status overlay (waiting / ringing / connecting) ── */}
      {(connectionPhase === "waiting" || connectionPhase === "ringing" || connectionPhase === "connecting") && remoteStream === null && (
        <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 mt-16">
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-stone-900/80 px-6 py-4 backdrop-blur-xl shadow-2xl">
            <Spinner className="h-5 w-5 text-sky-400" />
            <span className="text-xs font-semibold text-sky-300 uppercase tracking-widest">
              {connectionPhase === "waiting" ? "Waiting" : connectionPhase === "ringing" ? "Ringing" : "Connecting"}
            </span>
            <p className="text-[11px] text-stone-400 text-center max-w-[180px]">
              {connectionPhase === "waiting" && isMentor
                ? "Waiting for learner to join…"
                : connectionPhase === "waiting" && !isMentor
                ? "Waiting for mentor to start…"
                : connectionPhase === "ringing"
                ? "Mentor started the session"
                : "Establishing secure stream…"}
            </p>
          </div>
        </div>
      )}

      {/* ── "Other user joined" toast ── */}
      {showJoinToast && (
        <JoinedToast
          name={isMentor ? session?.learner?.name : session?.mentor?.name}
          onDismiss={() => setShowJoinToast(false)}
        />
      )}

      {/* Control bar */}
      <nav className="absolute bottom-5 left-1/2 z-30 flex w-[calc(100%-2.5rem)] max-w-3xl -translate-x-1/2 items-center justify-center gap-3 rounded-2xl border border-white/10 bg-stone-900/80 px-4 py-3 shadow-2xl backdrop-blur-2xl sm:w-auto sm:px-6 md:bottom-8 md:gap-4 md:px-8 md:py-4">

        {/* Mute — enabled when any local stream active */}
        <ControlButton
          id="btn-mute"
          icon={isMuted ? "mic_off" : "mic"}
          label={isMuted ? "Unmute" : "Mute"}
          active={isMuted}
          onClick={toggleMute}
          disabled={!canMute}
        />

        {/* Camera — enabled only when video tracks available */}
        <ControlButton
          id="btn-camera"
          icon={isCameraOff || !hasLocalVideo ? "videocam_off" : "videocam"}
          label={!hasLocalVideo ? "No Cam" : isCameraOff ? "Cam On" : "Cam Off"}
          active={isCameraOff || !hasLocalVideo}
          onClick={toggleCamera}
          disabled={!canCamera}
        />

        <div className="hidden h-10 w-px bg-white/10 md:block" />

        {/* ── Action button: changes by phase + role + sharedCallStatus ── */}

        {/* Mentor: always show Start Call when idle */}
        {connectionPhase === "idle" && isMentor && (
          <ControlButton
            id="btn-start-call"
            icon="call"
            label="Start Call"
            highlight="green"
            onClick={handleStartCall}
          />
        )}

        {/* Learner: show a gated Join Call button */}
        {connectionPhase === "idle" && !isMentor && (
          <div className="flex flex-col items-center gap-1">
            {sharedCallStatus === "started" || sharedCallStatus === "joined" || sharedCallStatus === "connected" ? (
              // Mentor has started — learner can join
              <ControlButton
                id="btn-join-call"
                icon="call_received"
                label="Join Call"
                highlight="blue"
                onClick={handleJoinCall}
              />
            ) : (
              // Mentor hasn't started yet — locked
              <div className="flex flex-col items-center gap-1">
                <div className="flex h-11 w-11 cursor-not-allowed items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10 md:h-14 md:w-14">
                  <Icon name="call_received" className="text-xl text-stone-600 md:text-2xl" />
                </div>
                <span className="text-[10px] uppercase tracking-tight text-stone-600">Waiting…</span>
              </div>
            )}
          </div>
        )}

        {/* Learner in ringing state: show Join button even if connectionPhase advanced */}
        {connectionPhase === "ringing" && !isMentor && (
          <ControlButton
            id="btn-join-call-ringing"
            icon="call_received"
            label="Join Call"
            highlight="blue"
            onClick={handleJoinCall}
          />
        )}

        {/* Spinner shown while waiting, ringing, or connecting */}
        {isInProgress && (
          <div className="flex flex-col items-center gap-1">
            <div className={`flex h-11 w-11 items-center justify-center rounded-full md:h-14 md:w-14 ${
              connectionPhase === "waiting" ? "bg-sky-500/20" : "bg-amber-500/20"
            }`}>
              <Spinner className={`h-5 w-5 ${
                connectionPhase === "waiting" ? "text-sky-400" : "text-amber-400"
              }`} />
            </div>
            <span className={`text-[10px] uppercase tracking-tight ${
              connectionPhase === "waiting" ? "text-sky-400" : "text-amber-400"
            }`}>
              {connectionPhase === "waiting" ? "Waiting" : connectionPhase === "ringing" ? "Ringing" : "Joining"}
            </span>
          </div>
        )}

        <div className="hidden h-10 w-px bg-white/10 md:block" />

        {/* End Call */}
        <button
          id="btn-end-call"
          type="button"
          onClick={handleEndCall}
          disabled={connectionPhase === "idle" || connectionPhase === "ended"}
          className="group flex flex-col items-center gap-1 disabled:pointer-events-none disabled:opacity-30"
        >
          <div className="flex h-11 w-14 items-center justify-center rounded-full bg-red-600 px-4 transition-all group-hover:bg-red-700 md:h-14 md:w-16 md:px-6">
            <Icon name="call_end" filled className="text-xl text-white md:text-2xl" />
          </div>
          <span className="text-[10px] uppercase tracking-tight text-red-400">End</span>
        </button>
      </nav>

      {/* Watermark */}
      <div className="pointer-events-none absolute right-5 top-5 z-10 font-headline text-3xl font-black tracking-tighter text-white/10 sm:right-6 md:right-10 md:top-10">
        SkillCache
      </div>

      {/* Ended overlay */}
      {connectionPhase === "ended" && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-black/80 backdrop-blur-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600/20 ring-1 ring-red-500/40">
            <Icon name="call_end" filled className="text-3xl text-red-400" />
          </div>
          <p className="text-xl font-semibold text-white">Call Ended</p>
          <p className="text-sm text-stone-400">Redirecting you back…</p>
        </div>
      )}
    </main>
  );
}

// ─── MediaModeBanner ──────────────────────────────────────────────────────────

/**
 * Shown when the local camera is unavailable or in audio-only mode.
 * Positioned at the bottom of the screen above the control bar.
 */
function MediaModeBanner({ mode }: { mode: "audio-only" | "none" }) {
  const config = {
    "audio-only": {
      icon: "mic",
      text: "Audio-only mode — camera unavailable",
      bg: "bg-amber-500/10 border-amber-500/30 text-amber-300",
    },
    none: {
      icon: "videocam_off",
      text: "Joined without camera or microphone",
      bg: "bg-stone-700/60 border-stone-600/30 text-stone-300",
    },
  }[mode];

  return (
    <div
      aria-live="polite"
      className={`absolute bottom-28 left-1/2 z-20 -translate-x-1/2 flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold backdrop-blur-md md:bottom-32 ${config.bg}`}
    >
      <Icon name={config.icon} className="text-sm" />
      {config.text}
    </div>
  );
}

// ─── JoinedToast ──────────────────────────────────────────────────────────────
/**
 * Briefly shown when the remote peer first connects.
 * Auto-dismisses after 3 s, then calls onDismiss to clear parent state.
 */
function JoinedToast({ name, onDismiss }: { name?: string; onDismiss: () => void }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, 3000);
    return () => clearTimeout(t);
  }, [onDismiss]);
  if (!visible) return null;
  return (
    <div
      aria-live="polite"
      className="absolute left-1/2 top-24 z-30 -translate-x-1/2 animate-in fade-in slide-in-from-top-2 duration-300"
    >
      <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-300 backdrop-blur-md shadow-lg">
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
        {name ? `${name} joined the call` : "Other user joined"}
      </div>
    </div>
  );
}

// ─── ParticipantChip ──────────────────────────────────────────────────────────

function ParticipantChip({
  name,
  role,
  isYou,
  online,
}: {
  name: string;
  role: string;
  isYou: boolean;
  online: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-stone-900/60 px-3 py-1 backdrop-blur-md">
      <span className={`h-1.5 w-1.5 rounded-full ${online ? "bg-emerald-400" : "bg-stone-600"}`} />
      <span className="text-[11px] font-semibold text-white">
        {name}
        {isYou && <span className="ml-1 font-normal text-stone-400">(you)</span>}
      </span>
      <span className="text-[10px] text-stone-500">{role}</span>
    </div>
  );
}

// ─── ControlButton ────────────────────────────────────────────────────────────

interface ControlButtonProps {
  id: string;
  icon: string;
  label: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  highlight?: "green" | "blue";
}

function ControlButton({
  id,
  icon,
  label,
  onClick,
  active = false,
  disabled = false,
  highlight,
}: ControlButtonProps) {
  const bgMap = {
    green: "bg-emerald-600 hover:bg-emerald-700",
    blue:  "bg-blue-600 hover:bg-blue-700",
  };
  const bg = highlight
    ? bgMap[highlight]
    : active
    ? "bg-white/25 hover:bg-white/30"
    : "bg-white/10 hover:bg-white/20";

  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex flex-col items-center gap-1 disabled:pointer-events-none disabled:opacity-30"
    >
      <div className={`flex h-11 w-11 items-center justify-center rounded-full transition-all md:h-14 md:w-14 ${bg}`}>
        <Icon name={icon} filled={active} className="text-xl text-white md:text-2xl" />
      </div>
      <span className="text-[10px] uppercase tracking-tight text-stone-400">{label}</span>
    </button>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className ?? ""}`} fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}
