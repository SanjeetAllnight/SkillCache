"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

import { Icon } from "@/components/ui/icon";
import { useGroupWebRTC, type PeerState } from "@/hooks/useGroupWebRTC";
import { useAuth } from "@/components/providers/auth-provider";
import {
  canJoinSession,
  listenSessionById,
  endLiveSession,
  type ApiSession,
} from "@/lib/firebaseServices";
import { kickParticipant } from "@/lib/callSignaling";

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
}

// ─── Remote Peer Video Component ─────────────────────────────────────────────

function PeerVideo({ peer }: { peer: PeerState }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && peer.stream) {
      videoRef.current.srcObject = peer.stream;
    }
  }, [peer.stream]);

  return (
    <div className="relative flex aspect-video w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-stone-900 shadow-xl">
      {!peer.stream ? (
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10">
            <Icon name="person" className="text-2xl text-stone-500" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-widest text-sky-400">
            {peer.phase === "connecting" ? "Connecting" : "Waiting"}
          </span>
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="h-full w-full object-cover"
        />
      )}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-lg bg-stone-900/80 px-3 py-1.5 text-xs text-white backdrop-blur-md">
        <span className="font-bold">{peer.name}</span>
        <span className={peer.role === "mentor" ? "font-semibold text-emerald-400" : "text-sky-400"}>
          {peer.role === "mentor" ? "Mentor" : "Learner"}
        </span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CallPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const { user, isAuthReady } = useAuth();

  // ── Session state ──
  const [session, setSession] = useState<ApiSession | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  const isMentor = session?.mentorId === user?._id;
  const myRole = isMentor ? "mentor" : "learner";

  // ── WebRTC Hook ──
  const {
    localStream,
    mediaMode,
    peers,
    isConnected,
    isKicked,
    toggleMute,
    toggleVideo,
  } = useGroupWebRTC(
    sessionId,
    user?._id ?? "",
    user?.name ?? "Unknown",
    myRole
  );

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [isLocalMuted, setIsLocalMuted] = useState(false);
  const [isLocalCamOff, setIsLocalCamOff] = useState(false);

  // ── Enforce Session Access ──
  useEffect(() => {
    if (!isAuthReady || !sessionId) return;
    if (!user) {
      router.replace(`/auth?next=/session/${sessionId}`);
      return;
    }

    setSessionLoading(true);
    const unsub = listenSessionById(
      sessionId,
      (data) => {
        if (!data) {
          setSessionError("Session not found");
          setSessionLoading(false);
          return;
        }

        const isParticipant =
          data.mentorId === user._id ||
          data.learnerId === user._id ||
          data.participants?.[user._id]?.status === "accepted";

        if (!isParticipant) {
          setSessionError("Access Denied: Only accepted participants can join.");
          setSessionLoading(false);
          return;
        }

        if (data.status === "completed" || data.status === "cancelled") {
          setSessionError("This session has ended.");
          // Also automatically kick out if it happens mid-call
          setTimeout(() => router.push("/sessions"), 2000);
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
      () => {
        setSessionError("Session not found");
        setSessionLoading(false);
      }
    );

    return () => unsub();
  }, [isAuthReady, sessionId, user, router]);

  // ── Handle Kick ──
  useEffect(() => {
    if (isKicked) {
      router.push(`/sessions/${sessionId}`);
    }
  }, [isKicked, router, sessionId]);

  // ── Bind Local Video ──
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // ── Handlers ──
  const handleEndSession = async () => {
    if (!isMentor) return;
    await endLiveSession(sessionId);
    // Marking the session as completed will trigger the listener and boot everyone
    router.push("/sessions");
  };

  const handleKickParticipant = async (uid: string) => {
    if (!isMentor) return;
    await kickParticipant(sessionId, uid);
  };

  const handleToggleMute = () => {
    toggleMute();
    setIsLocalMuted((prev) => !prev);
  };

  const handleToggleVideo = () => {
    toggleVideo();
    setIsLocalCamOff((prev) => !prev);
  };

  // ── Render Guards ──
  if (sessionLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-950">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (sessionError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-stone-950 text-white">
        <Icon name="error" className="text-4xl text-red-400" />
        <p className="text-lg font-semibold">{sessionError}</p>
        <button
          onClick={() => router.push("/sessions")}
          className="rounded-xl bg-white/10 px-6 py-2.5 text-sm font-semibold transition hover:bg-white/20"
        >
          Back to Sessions
        </button>
      </div>
    );
  }

  const hasLocalVideo = (localStream?.getVideoTracks().length ?? 0) > 0;
  const canMute = !!localStream;
  const canCamera = hasLocalVideo;

  return (
    <main className="flex min-h-screen flex-col bg-stone-950 text-white md:flex-row">
      {/* ── Main Video Area ── */}
      <div className="flex flex-1 flex-col p-4 md:p-6">
        <header className="mb-6 flex items-center justify-between rounded-2xl bg-stone-900/50 px-6 py-4 shadow-sm ring-1 ring-white/5">
          <div>
            <h1 className="font-headline text-lg font-bold">{session?.title}</h1>
            <p className="text-xs font-medium text-stone-400">{peers.length + 1} Participants</p>
          </div>
          {isMentor && (
            <button
              onClick={handleEndSession}
              className="rounded-lg bg-red-600/20 px-4 py-2 text-sm font-bold text-red-400 transition hover:bg-red-600 hover:text-white"
            >
              End Session
            </button>
          )}
        </header>

        {/* Video Grid */}
        <div className="grid flex-1 auto-rows-max grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 content-start">
          {/* Local User */}
          <div className="relative flex aspect-video w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-stone-900 shadow-xl">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-cover"
            />
            {(isLocalCamOff || !hasLocalVideo) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-stone-900/90">
                <Icon name="videocam_off" className="text-3xl text-stone-500" />
                <span className="text-xs uppercase tracking-widest text-stone-400">
                  {mediaMode === "audio-only" ? "Audio Only" : "No Camera"}
                </span>
              </div>
            )}
            <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-lg bg-stone-900/80 px-3 py-1.5 text-xs text-white backdrop-blur-md">
              <span className="font-bold">You</span>
              <span className={isMentor ? "font-semibold text-emerald-400" : "text-sky-400"}>
                {isMentor ? "Mentor" : "Learner"}
              </span>
            </div>
            {isLocalMuted && (
              <div className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-red-600/80">
                <Icon name="mic_off" className="text-sm text-white" />
              </div>
            )}
          </div>

          {/* Remote Peers */}
          {peers.map((peer) => (
            <PeerVideo key={peer.uid} peer={peer} />
          ))}
        </div>

        {/* Control Bar */}
        <div className="mt-6 flex justify-center gap-4">
          <button
            onClick={handleToggleMute}
            disabled={!canMute}
            className={`flex h-14 w-14 items-center justify-center rounded-full transition-all ${
              isLocalMuted ? "bg-red-600 text-white hover:bg-red-700" : "bg-stone-800 text-white hover:bg-stone-700"
            } disabled:opacity-50`}
          >
            <Icon name={isLocalMuted ? "mic_off" : "mic"} className="text-2xl" />
          </button>
          <button
            onClick={handleToggleVideo}
            disabled={!canCamera}
            className={`flex h-14 w-14 items-center justify-center rounded-full transition-all ${
              isLocalCamOff ? "bg-red-600 text-white hover:bg-red-700" : "bg-stone-800 text-white hover:bg-stone-700"
            } disabled:opacity-50`}
          >
            <Icon name={isLocalCamOff ? "videocam_off" : "videocam"} className="text-2xl" />
          </button>
          <button
            onClick={() => router.push(`/sessions/${sessionId}`)}
            className="flex h-14 w-16 items-center justify-center rounded-full bg-red-600 transition-all hover:bg-red-700 md:px-6"
          >
            <Icon name="call_end" filled className="text-2xl text-white" />
          </button>
        </div>
      </div>

      {/* ── Sidebar (Participant List) ── */}
      <aside className="flex w-full flex-col border-t border-white/10 bg-stone-900/40 p-6 md:w-80 md:border-l md:border-t-0">
        <h2 className="mb-6 text-xs font-bold uppercase tracking-widest text-stone-400">
          Participants ({peers.length + 1})
        </h2>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
          {/* You */}
          <div className="flex items-center justify-between rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-bold text-on-primary">
                {(user?.name ?? "U")[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold">You</p>
                <p className={`text-xs ${isMentor ? "text-emerald-400" : "text-sky-400"}`}>
                  {isMentor ? "Mentor" : "Learner"}
                </p>
              </div>
            </div>
          </div>

          {/* Peers */}
          {peers.map((peer) => (
            <div key={peer.uid} className="flex items-center justify-between rounded-xl bg-white/5 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-high font-bold text-on-surface">
                  {peer.name[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold">{peer.name}</p>
                  <p className={`text-xs ${peer.role === "mentor" ? "text-emerald-400" : "text-sky-400"}`}>
                    {peer.role === "mentor" ? "Mentor" : "Learner"}
                  </p>
                </div>
              </div>
              {isMentor && peer.role !== "mentor" && (
                <button
                  onClick={() => handleKickParticipant(peer.uid)}
                  className="rounded-lg bg-red-600/10 px-2 py-1 text-xs font-bold text-red-400 transition hover:bg-red-600 hover:text-white"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </aside>
    </main>
  );
}
