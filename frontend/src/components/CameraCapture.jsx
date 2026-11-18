import { useCallback, useEffect, useRef, useState } from "react";

const MAX_SECONDS = 60;   // keeps a recording comfortably under the 50 MB upload limit

const pickMime = () =>
  window.MediaRecorder &&
  ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"].find((t) => MediaRecorder.isTypeSupported(t));

const describe = (e) => {
  if (!window.isSecureContext) return "The camera only works on HTTPS or http://localhost. Use “Upload files” instead.";
  switch (e?.name) {
    case "NotAllowedError": return "Camera permission was denied. Allow camera access in your browser's site settings, or use “Upload files” instead.";
    case "NotFoundError": return "No camera was found on this device. Use “Upload files” instead.";
    case "NotReadableError": return "The camera is being used by another app. Close it and try again.";
    default: return "Could not start the camera. Use “Upload files” instead.";
  }
};

/** Full-screen camera: take a photo or record a video, review it, then hand the File to the form. */
export default function CameraCapture({ initialMode = "photo", onCapture, onClose }) {
  const [mode, setMode] = useState(initialMode);
  const [facing, setFacing] = useState("environment");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [shot, setShot] = useState(null);                 // { file, url, kind }

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recRef = useRef(null);
  const chunks = useRef([]);
  const timer = useRef(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // (Re)start the camera whenever mode or facing changes; pause while reviewing a shot
  useEffect(() => {
    if (shot) return undefined;
    let cancelled = false;
    setReady(false);
    setError("");
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) return setError(describe());
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: mode === "video",                          // microphone only when recording video
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        const v = videoRef.current;
        v.srcObject = stream;
        await v.play();
        setReady(true);
      } catch (e) {
        if (!cancelled) setError(describe(e));
      }
    })();
    return () => { cancelled = true; stopStream(); };
  }, [mode, facing, shot, stopStream]);

  // Close on Escape, lock page scroll, clean up on unmount
  useEffect(() => {
    const key = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", key);
      document.body.style.overflow = "";
      clearInterval(timer.current);
      if (recRef.current && recRef.current.state !== "inactive") { recRef.current.onstop = null; recRef.current.stop(); }
      stopStream();
    };
  }, [onClose, stopStream]);

  useEffect(() => () => { if (shot) URL.revokeObjectURL(shot.url); }, [shot]);

  const takePhoto = () => {
    const v = videoRef.current;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d").drawImage(v, 0, 0);
    // Exporting from a canvas produces a clean JPEG with no EXIF/GPS data
    c.toBlob((b) => {
      if (!b) return setError("Could not capture the photo. Try again.");
      const file = new File([b], `photo-${Date.now()}.jpg`, { type: "image/jpeg" });
      setShot({ file, url: URL.createObjectURL(file), kind: "image" });
    }, "image/jpeg", 0.9);
  };

  const stopRecording = useCallback(() => {
    clearInterval(timer.current);
    if (recRef.current && recRef.current.state !== "inactive") recRef.current.stop();
    setRecording(false);
  }, []);

  const startRecording = () => {
    const mime = pickMime();
    if (!mime) return setError("Video recording isn't supported in this browser. Use “Upload files” instead.");
    chunks.current = [];
    const rec = new MediaRecorder(streamRef.current, { mimeType: mime, videoBitsPerSecond: 1_200_000, audioBitsPerSecond: 64_000 });
    rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    rec.onstop = () => {
      const type = mime.split(";")[0];
      const file = new File(chunks.current, `video-${Date.now()}.${type === "video/mp4" ? "mp4" : "webm"}`, { type });
      setShot({ file, url: URL.createObjectURL(file), kind: "video" });
    };
    rec.start(1000);
    recRef.current = rec;
    setSeconds(0);
    setRecording(true);
    timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  };

  useEffect(() => { if (recording && seconds >= MAX_SECONDS) stopRecording(); }, [seconds, recording, stopRecording]);

  const use = () => { onCapture(shot.file); onClose(); };
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="cam-overlay" role="dialog" aria-modal="true" aria-label="Camera">
      <div className="cam-box">
        <div className="cam-top">
          {!shot && (
            <div className="seg">
              <button type="button" className={mode === "photo" ? "on" : ""} disabled={recording} onClick={() => setMode("photo")}>Photo</button>
              <button type="button" className={mode === "video" ? "on" : ""} disabled={recording} onClick={() => setMode("video")}>Video</button>
            </div>
          )}
          <button type="button" className="btn ghost small cam-close" onClick={onClose}>Close</button>
        </div>

        <div className="cam-stage">
          <video ref={videoRef} playsInline muted className={`${facing === "user" ? "mirror" : ""} ${shot ? "hidden" : ""}`} />
          {shot?.kind === "image" && <img src={shot.url} alt="Captured photo preview" />}
          {shot?.kind === "video" && <video src={shot.url} controls playsInline />}
          {!shot && !ready && !error && <div className="cam-msg">Starting camera…</div>}
          {error && <div className="cam-msg err">{error}</div>}
          {recording && <div className="rec-badge"><span className="pulse" /> {mm}:{ss} / 01:00</div>}
        </div>

        <div className="cam-controls">
          {shot ? (
            <>
              <button type="button" className="btn ghost" onClick={() => setShot(null)}>Retake</button>
              <button type="button" className="btn" onClick={use}>Use this {shot.kind === "image" ? "photo" : "video"}</button>
            </>
          ) : (
            <>
              <button type="button" className="btn ghost small" disabled={recording || !ready}
                      onClick={() => setFacing(facing === "user" ? "environment" : "user")}>Switch camera</button>
              {mode === "photo" ? (
                <button type="button" className="shutter" aria-label="Take photo" disabled={!ready} onClick={takePhoto} />
              ) : recording ? (
                <button type="button" className="shutter rec on" aria-label="Stop recording" onClick={stopRecording} />
              ) : (
                <button type="button" className="shutter rec" aria-label="Start recording" disabled={!ready} onClick={startRecording} />
              )}
              <span className="cam-hint">{mode === "video" ? (recording ? "Tap to stop" : "Up to 60 s") : "Tap to capture"}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
