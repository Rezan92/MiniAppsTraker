import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Custom hook for capturing voice audio in browser via MediaRecorder API.
 * Encapsulates audio stream lifecycle, cross-browser MIME type selection,
 * active recording duration timer, and automatic audio track cleanup.
 */
export const useAudioRecorder = ({ maxDurationSeconds = 900, onAutoStop } = {}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingError, setRecordingError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const autoStopTimeoutRef = useRef(null);
  const mimeTypeRef = useRef('audio/webm');
  const durationRef = useRef(0);
  const onAutoStopRef = useRef(onAutoStop);
  const stopRecordingRef = useRef(null);

  useEffect(() => {
    onAutoStopRef.current = onAutoStop;
  }, [onAutoStop]);

  // Clean up any active microphone stream and timers on unmount
  const cleanupStream = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (autoStopTimeoutRef.current) {
      clearTimeout(autoStopTimeoutRef.current);
      autoStopTimeoutRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => cleanupStream();
  }, [cleanupStream]);

  /**
   * Stops recording, releases hardware tracks, and resolves the base64-encoded audio payload.
   * @returns {Promise<{ base64: string, mimeType: string, durationSeconds: number }>}
   */
  const stopRecording = useCallback(() => {
    return new Promise((resolve, reject) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        cleanupStream();
        setIsRecording(false);
        return reject(new Error('Recorder is not active.'));
      }

      recorder.onstop = () => {
        try {
          const finalMime = mimeTypeRef.current || 'audio/webm';
          const audioBlob = new Blob(audioChunksRef.current, { type: finalMime });
          cleanupStream();
          setIsRecording(false);

          if (audioBlob.size === 0) {
            return reject(new Error('Recorded audio was empty.'));
          }

          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result;
            const base64 = typeof result === 'string' ? result : '';
            resolve({
              base64,
              mimeType: finalMime,
              durationSeconds: durationRef.current
            });
          };
          reader.onerror = () => reject(new Error('Failed to read audio file buffer.'));
          reader.readAsDataURL(audioBlob);
        } catch (procErr) {
          cleanupStream();
          setIsRecording(false);
          reject(procErr);
        }
      };

      try {
        recorder.stop();
      } catch (stopErr) {
        cleanupStream();
        setIsRecording(false);
        reject(stopErr);
      }
    });
  }, [cleanupStream]);

  stopRecordingRef.current = stopRecording;

  /**
   * Starts microphone recording.
   */
  const startRecording = useCallback(async () => {
    setRecordingError(null);
    setRecordingDuration(0);
    durationRef.current = 0;
    audioChunksRef.current = [];

    if (!navigator.mediaDevices?.getUserMedia || typeof window.MediaRecorder === 'undefined') {
      const err = 'Microphone recording is not supported in this browser.';
      setRecordingError(err);
      throw new Error(err);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      mediaStreamRef.current = stream;

      // Determine the best supported audio MIME type
      let chosenMime = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        chosenMime = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        chosenMime = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        chosenMime = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        chosenMime = 'audio/ogg';
      }
      mimeTypeRef.current = chosenMime;

      const options = chosenMime ? { mimeType: chosenMime } : {};
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start(250); // Slice data every 250ms
      setIsRecording(true);

      // Duration counter
      const startTime = Date.now();
      timerIntervalRef.current = setInterval(() => {
        const sec = Math.floor((Date.now() - startTime) / 1000);
        durationRef.current = sec;
        setRecordingDuration(sec);
      }, 500);

      // Auto-stop safety cap after maxDurationSeconds (default: 900s = 15 minutes)
      // If the maximum duration is ever reached, auto-transcribe instead of discarding
      autoStopTimeoutRef.current = setTimeout(async () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          try {
            const result = await stopRecordingRef.current?.();
            if (result && onAutoStopRef.current) {
              onAutoStopRef.current(result);
            }
          } catch (autoErr) {
            console.error('Auto-stop recording error:', autoErr);
          }
        }
      }, maxDurationSeconds * 1000);

    } catch (err) {
      cleanupStream();
      setIsRecording(false);
      let message = 'Failed to access microphone.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'Microphone permission was denied. Please allow microphone access in your browser settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = 'No microphone device found on your system.';
      }
      setRecordingError(message);
      throw new Error(message);
    }
  }, [cleanupStream, maxDurationSeconds]);

  /**
   * Cancels the active recording without saving or transcribing.
   */
  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore stop error on cancellation
      }
    }
    audioChunksRef.current = [];
    cleanupStream();
    setIsRecording(false);
    setRecordingDuration(0);
    durationRef.current = 0;
  }, [cleanupStream]);

  return {
    isRecording,
    recordingDuration,
    recordingError,
    startRecording,
    stopRecording,
    cancelRecording
  };
};
