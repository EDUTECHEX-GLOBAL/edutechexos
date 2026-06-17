import React, { useState, useRef, useEffect } from 'react';

/**
 * ScreenRecorder component
 * - Starts screen capture (with system audio) via navigator.mediaDevices.getDisplayMedia.
 * - Optionally merges webcam video via a secondary MediaStream.
 * - Uses MediaRecorder to record the combined stream.
 * - Shows preview of the recorded video and provides a Send button.
 *
 * Props:
 *   onSend: (blob: Blob) => void "“ callback invoked with the recorded video blob.
 *   includeWebcam?: boolean "“ if true, captures webcam and overlays it on the screen recording.
 */
interface ScreenRecorderProps {
  onSend: (blob: Blob) => void;
  includeWebcam?: boolean;
}

const ScreenRecorder: React.FC<ScreenRecorderProps> = ({ onSend, includeWebcam = false }) => {
  const [recording, setRecording] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const combinedStreamRef = useRef<MediaStream | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (combinedStreamRef.current) {
        combinedStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      // 1ï¸âƒ£ Capture screen (with audio if available)
      const screenStream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: true,
        audio: true,
      });

      let finalStream: MediaStream;

      if (includeWebcam) {
        // 2ï¸âƒ£ Capture webcam video (audio not needed, already captured from screen)
        const webcamStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });

        // Create a canvas to overlay webcam on screen
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Failed to get canvas context');

        // Set canvas size to screen video dimensions
        const screenVideoTrack = screenStream.getVideoTracks()[0];
        const settings = screenVideoTrack.getSettings();
        canvas.width = settings.width ?? 1280;
        canvas.height = settings.height ?? 720;

        const webcamVideo = document.createElement('video');
        webcamVideo.srcObject = webcamStream;
        webcamVideo.play();

        // Draw loop "“ draw screen then overlay webcam picture"‘in"‘picture
        const draw = () => {
          ctx.drawImage(
            // Screen video element "“ use an off"‘screen video element
            (() => {
              const v = document.createElement('video');
              v.srcObject = screenStream;
              v.play();
              return v;
            })(),
            0,
            0,
            canvas.width,
            canvas.height
          );
          // Webcam overlay (bottom"‘right corner, 20% of width)
          const overlayW = canvas.width * 0.2;
          const overlayH =
            (overlayW * (webcamVideo.videoHeight ?? 1)) / (webcamVideo.videoWidth ?? 1);
          ctx.drawImage(
            webcamVideo,
            canvas.width - overlayW - 10,
            canvas.height - overlayH - 10,
            overlayW,
            overlayH
          );
          requestAnimationFrame(draw);
        };
        draw();

        const canvasStream = (canvas as any).captureStream?.();
        // Merge audio track from screen with video from canvas
        const audioTracks = screenStream.getAudioTracks();
        if (audioTracks.length > 0) {
          canvasStream.addTrack(audioTracks[0]);
        }
        finalStream = canvasStream;
        // Stop webcam when done
        combinedStreamRef.current = finalStream;
      } else {
        finalStream = screenStream;
        combinedStreamRef.current = finalStream;
      }

      const options = { mimeType: 'video/webm; codecs=vp9' };
      const mediaRecorder = new MediaRecorder(finalStream, options);
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        onSend(blob);
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      console.error('ScreenRecorder error:', err);
      alert('Unable to start screen recording. Check permissions.');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    // Stop all tracks to release resources
    combinedStreamRef.current?.getTracks().forEach((t) => t.stop());
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md max-w-md mx-auto">
      <h3 className="text-lg font-medium mb-3">Screen Recorder</h3>
      {recording ? (
        <button
          onClick={stopRecording}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
        >
          Stop Recording
        </button>
      ) : (
        <button
          onClick={startRecording}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Start Screen Capture
        </button>
      )}
      {previewUrl && (
        <div className="mt-4">
          <video src={previewUrl} controls className="w-full rounded" />
          <p className="text-sm text-gray-600 mt-1">
            Preview "“ send will happen automatically after stop.
          </p>
        </div>
      )}
    </div>
  );
};

export default ScreenRecorder;
