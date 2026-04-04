"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { Icon } from "@/components/ui/icon";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useAuth } from "@/components/providers/auth-provider";
import { getSessionById, type ApiSession } from "@/lib/firebaseServices";

// ─── Types ────────────────────────────────────────────────────────────────────

type CallPhase = "idle" | "connecting" | "connected" | "ended";

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

  // ── Session + access control state ────────────────────────────────────────
  const [session, setSession]     = useState<ApiSession | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  // ── WebRTC hook — scoped to this session ID ────────────────────────────────
  const myUid = user?._id ?? "";
  const {
    localStream,
    remoteStream,
    isConnected,
    error: rtcError,
    startCall,
    joinCall,
    endCall,
  } = useWebRTC({ callId: sessionId, myUid });

  // ── Video refs ─────────────────────────────────────────────────────────────
  const localVideoRef  = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [phase, setPhase]             = useState<CallPhase>("idle");
  const [isMuted, setIsMuted]         = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [elapsed, setElapsed]         = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load session + enforce access ─────────────────────────────────────────
  useEffect(() => {
    if (!isAuthReady || !sessionId) return;
    if (!user) {
      router.replace(`/auth?next=/call/${sessionId}`);
      return;
    }

    let mounted = true;

    async function load() {
      try {
        setSessionLoading(true);
        const data = await getSessionById(sessionId);
        if (!mounted) return;

        // ── Access gate: only mentor or learner may enter ──────────────────
        const isParticipant =
          data.mentor?._id === user!._id || data.learner?._id === user!._id;

        if (!isParticipant) {
          setAccessDenied(true);
          return;
        }

        setSession(data);
      } catch (err) {
        if (!mounted) return;
        setSessionError(err instanceof Error ? err.message : "Session not found.");
      } finally {
        if (mounted) setSessionLoading(false);
      }
    }

    void load();
    return () => { mounted = false; };
  }, [isAuthReady, sessionId, user, router]);

  // ── Bind streams ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  // ── Sync phase with connection ─────────────────────────────────────────────
  useEffect(() => {
    if (isConnected) {
      setPhase("connected");
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isConnected]);

  // ── Determine caller vs callee role ───────────────────────────────────────
  // Mentor is always the initiator (caller); learner joins.
  const isMentor = session?.mentor?._id === user?._id;

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleStartCall = useCallback(async () => {
    setPhase("connecting");
    await startCall();
  }, [startCall]);

  const handleJoinCall = useCallback(async () => {
    setPhase("connecting");
    await joinCall();
  }, [joinCall]);

  const handleEndCall = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("ended");
    await endCall();
    setTimeout(() => router.push("/sessions"), 1500);
  }, [endCall, router]);

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

  // ─── Status config ─────────────────────────────────────────────────────────

  const statusConfig: Record<CallPhase, { label: string; color: string; dot: string }> = {
    idle:       { label: "Ready",       color: "text-stone-400",   dot: "bg-stone-500" },
    connecting: { label: "Connecting",  color: "text-amber-400",   dot: "bg-amber-400 animate-pulse" },
    connected:  { label: formatDuration(elapsed), color: "text-emerald-400", dot: "bg-emerald-400" },
    ended:      { label: "Call Ended",  color: "text-red-400",     dot: "bg-red-500" },
  };
  const status = statusConfig[phase];

  // ─── Guard renders ─────────────────────────────────────────────────────────

  if (sessionLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-950">
        <div className="flex flex-col items-center gap-4 text-white">
          <svg className="h-8 w-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
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

      {/* Placeholder when no remote stream yet */}
      {!remoteStream && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-stone-900 via-stone-950 to-black">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10">
            <Icon name="person" className="text-5xl text-stone-500" />
          </div>
          <p className="text-sm font-medium text-stone-500">
            {phase === "idle"
              ? isMentor
                ? "Press Start Call to begin"
                : "Press Join Call to connect"
              : "Waiting for the other participant…"}
          </p>
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
              {isMentor ? "You are the mentor" : "You are the learner"}
              {" · "}
              {session?.mentor?.name && session?.learner?.name
                ? `${session.mentor.name} & ${session.learner.name}`
                : sessionId}
            </p>
          </div>
        </div>

        {/* Status pill */}
        <div className="flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-stone-900/70 px-3 py-1.5 backdrop-blur-md">
          <span className={`h-2 w-2 rounded-full ${status.dot}`} />
          <span className={`text-xs font-semibold tabular-nums ${status.color}`}>
            {status.label}
          </span>
        </div>
      </header>

      {/* Participant chips */}
      {session && phase !== "ended" && (
        <div className="absolute left-5 top-20 z-20 flex flex-col gap-1.5 sm:left-6 md:left-10 md:top-24">
          <ParticipantChip
            name={session.mentor?.name ?? "Mentor"}
            role="Mentor"
            isYou={isMentor}
            online={isConnected || isMentor}
          />
          <ParticipantChip
            name={session.learner?.name ?? "Learner"}
            role="Learner"
            isYou={!isMentor}
            online={isConnected || !isMentor}
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
        {(isCameraOff || !localStream) && (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-900/90">
            <Icon name="videocam_off" className="text-3xl text-stone-500" />
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

      {/* Error banner */}
      {rtcError && (
        <div className="absolute left-1/2 top-20 z-30 -translate-x-1/2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-medium text-red-300 backdrop-blur-md">
          {rtcError}
        </div>
      )}

      {/* Control bar */}
      <nav className="absolute bottom-5 left-1/2 z-30 flex w-[calc(100%-2.5rem)] max-w-3xl -translate-x-1/2 items-center justify-center gap-3 rounded-2xl border border-white/10 bg-stone-900/80 px-4 py-3 shadow-2xl backdrop-blur-2xl sm:w-auto sm:px-6 md:bottom-8 md:gap-4 md:px-8 md:py-4">

        {/* Mute */}
        <ControlButton id="btn-mute" icon={isMuted ? "mic_off" : "mic"} label={isMuted ? "Unmute" : "Mute"} active={isMuted} onClick={toggleMute} disabled={!localStream} />

        {/* Camera */}
        <ControlButton id="btn-camera" icon={isCameraOff ? "videocam_off" : "videocam"} label={isCameraOff ? "Cam On" : "Cam Off"} active={isCameraOff} onClick={toggleCamera} disabled={!localStream} />

        <div className="hidden h-10 w-px bg-white/10 md:block" />

        {/* Start Call — mentor only, idle only */}
        {phase === "idle" && isMentor && (
          <ControlButton id="btn-start-call" icon="call" label="Start Call" highlight="green" onClick={handleStartCall} />
        )}

        {/* Join Call — learner only, idle only */}
        {phase === "idle" && !isMentor && (
          <ControlButton id="btn-join-call" icon="call_received" label="Join Call" highlight="blue" onClick={handleJoinCall} />
        )}

        {/* Connecting spinner */}
        {phase === "connecting" && (
          <div className="flex flex-col items-center gap-1">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-500/20 md:h-14 md:w-14">
              <svg className="h-5 w-5 animate-spin text-amber-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
            <span className="text-[10px] uppercase tracking-tight text-amber-400">Connecting</span>
          </div>
        )}

        <div className="hidden h-10 w-px bg-white/10 md:block" />

        {/* End Call */}
        <button
          id="btn-end-call"
          type="button"
          onClick={handleEndCall}
          disabled={phase === "idle" || phase === "ended"}
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
      {phase === "ended" && (
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

// ─── ParticipantChip ─────────────────────────────────────────────────────────

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

function ControlButton({ id, icon, label, onClick, active = false, disabled = false, highlight }: ControlButtonProps) {
  const bgMap = { green: "bg-emerald-600 hover:bg-emerald-700", blue: "bg-blue-600 hover:bg-blue-700" };
  const bg = highlight ? bgMap[highlight] : active ? "bg-white/25 hover:bg-white/30" : "bg-white/10 hover:bg-white/20";

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
