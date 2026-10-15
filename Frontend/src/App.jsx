
import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import "./App.css";

function App() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expression, setExpression] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
          faceapi.nets.faceExpressionNet.loadFromUri("/models"),
        ]);

        if (cancelled) return;

        const stream =
          await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        videoRef.current.srcObject = stream;

        await videoRef.current.play();

        if (!cancelled) setReady(true);
      } catch (err) {
        if (!cancelled) {
          setError(
            "Could not start the scanner. Check camera permission and model files."
          );
          console.error(err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    setup();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function scanFace() {
    const video = videoRef.current;

    if (!video || video.readyState < 2) return;

    try {
      setError("");
      setExpression("Scanning...");

      const result = await faceapi
        .detectSingleFace(
          video,
          new faceapi.TinyFaceDetectorOptions()
        )
        .withFaceExpressions();

      if (!result) {
        setExpression("");
        setError("No face detected. Face the camera and try again.");
        return;
      }

      const scores = result.expressions;
      const best = Object.entries(scores).reduce((a, b) =>
        b[1] > a[1] ? b : a
      );

      const labels = {
        happy: "Happy",
        sad: "Sad-looking",
        angry: "Angry-looking",
        fearful: "Fearful-looking",
        disgusted: "Disgusted-looking",
        surprised: "Surprised",
        neutral: "Neutral",
      };

      setExpression(
        `${labels[best[0]]} (${Math.round(best[1] * 100)}%)`
      );
    } catch (err) {
      console.error(err);
      setError("Face scanning failed. Please try again.");
      setExpression("");
    }
  }

  return (
    <main className="app">
      <h1>🎧 Moody Player</h1>
      <p>Let your expression inspire your next playlist.</p>

      {loading && <p>Loading face detection models...</p>}

      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="camera"
      />

      {ready && (
        <button onClick={scanFace}>
          Scan My Expression
        </button>
      )}

      {expression && (
        <h2>Expression: {expression}</h2>
      )}

      {error && <p className="error">{error}</p>}

      <p className="note">
        This is an estimated facial expression, not a reliable
        measurement of your actual mood.
      </p>
    </main>
  );
}

export default App;
