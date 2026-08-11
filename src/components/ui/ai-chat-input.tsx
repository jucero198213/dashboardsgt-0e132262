"use client";

import * as React from "react";
import { useRef, useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

function ArrowUpIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M7 12V2M7 2L2.5 6.5M7 2L11.5 6.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="5" y="1" width="4" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2.75 6.5V7a4.25 4.25 0 0 0 8.5 0v-.5M7 11.25V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" fill="currentColor" />
    </svg>
  );
}

export interface SofiaChatInputProps {
  onSubmit?: (value: string) => void;
  placeholder?: string;
  className?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}

export const SofiaChatInput = React.forwardRef<HTMLDivElement, SofiaChatInputProps>(
  (
    {
      onSubmit,
      placeholder = "Pergunte algo para a Sofia...",
      className,
      defaultValue = "",
      value: controlledValue,
      onChange,
      disabled = false,
    },
    ref
  ) => {
    const [localValue, setLocalValue] = useState(defaultValue);

    const [isRecording, setIsRecording] = useState(false);
    const [audioData, setAudioData] = useState<number[]>(new Array(5).fill(0));
    const valueRef = useRef(controlledValue !== undefined ? controlledValue : localValue);

    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const rafRef = useRef<number | null>(null);
    const recognitionRef = useRef<any>(null);
    const demoIntervalRef = useRef<number | null>(null);
    const demoTextIntervalRef = useRef<number | null>(null);

    const isControlled = controlledValue !== undefined;
    const value = isControlled ? controlledValue : localValue;
    const hasValue = value.trim() !== "";

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => { valueRef.current = value; }, [value]);

    const handleValueChange = useCallback((val: string) => {
      if (!isControlled) setLocalValue(val);
      onChange?.(val);
    }, [isControlled, onChange]);

    const stopRecording = useCallback(() => {
      if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null; }
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      if (streamRef.current) { streamRef.current.getTracks().forEach((track) => track.stop()); streamRef.current = null; }
      if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; }
      if (demoIntervalRef.current) { window.clearInterval(demoIntervalRef.current); demoIntervalRef.current = null; }
      if (demoTextIntervalRef.current) { window.clearInterval(demoTextIntervalRef.current); demoTextIntervalRef.current = null; }
      setIsRecording(false);
      setAudioData(new Array(5).fill(0));
    }, []);

    const startRecording = useCallback(async () => {
      let stream: MediaStream | null = null;
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
      } catch {
        console.warn("Microphone access denied or unavailable.");
      }

      setIsRecording(true);

      function simulateText() {
        const fakeText = "Qual foi o faturamento de ontem e como está comparado com a semana passada?";
        const words = fakeText.split(" ");
        let i = 0;
        let currentBase = valueRef.current;
        demoTextIntervalRef.current = window.setInterval(() => {
          if (i < words.length) {
            currentBase = (currentBase ? currentBase + " " : "") + words[i];
            handleValueChange(currentBase);
            i++;
          } else {
            stopRecording();
          }
        }, 300);
      }

      if (stream) {
        streamRef.current = stream;
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateVisualizer = () => {
          analyser.getByteFrequencyData(dataArray);
          const bands = new Array(5).fill(0);
          const step = Math.floor(dataArray.length / 5);
          for (let i = 0; i < 5; i++) {
            let sum = 0;
            for (let j = 0; j < step; j++) { sum += dataArray[i * step + j]; }
            bands[i] = sum / step / 255;
          }
          setAudioData(bands);
          rafRef.current = requestAnimationFrame(updateVisualizer);
        };
        updateVisualizer();

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = "pt-BR";
          let baseline = valueRef.current;
          recognition.onresult = (event: any) => {
            let interimTranscript = "";
            let finalTranscript = "";
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) { finalTranscript += event.results[i][0].transcript; }
              else { interimTranscript += event.results[i][0].transcript; }
            }
            if (finalTranscript) { baseline += (baseline ? " " : "") + finalTranscript; }
            handleValueChange((baseline + (interimTranscript ? " " + interimTranscript : "")).trim());
          };
          recognition.onerror = () => stopRecording();
          recognition.onend = () => stopRecording();
          recognitionRef.current = recognition;
          recognition.start();
        } else {
          simulateText();
        }
      } else {
        demoIntervalRef.current = window.setInterval(() => {
          setAudioData(Array.from({ length: 5 }, () => Math.random() * 0.8 + 0.1));
        }, 100);
        simulateText();
      }
    }, [handleValueChange, stopRecording]);

    useEffect(() => {
      if (isRecording && textareaRef.current) {
        textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
      }
    }, [value, isRecording]);

    useEffect(() => { return () => { stopRecording(); }; }, [stopRecording]);

    // Auto-resize textarea
    useEffect(() => {
      if (!textareaRef.current) return;
      const el = textareaRef.current;
      el.style.height = "0px";
      const newHeight = Math.max(24, Math.min(el.scrollHeight, 200));
      el.style.height = `${newHeight}px`;
    }, [value]);

    const handleSubmit = () => {
      if (value.trim() === "" || disabled) return;
      onSubmit?.(value);
      handleValueChange("");
    };

    const showArrow = hasValue && !isRecording;
    const showStop = isRecording;
    const showMic = !hasValue && !isRecording;

    const onActionButtonClick = (e: React.MouseEvent) => {
      e.preventDefault();
      if (disabled) return;
      if (isRecording) { stopRecording(); }
      else if (hasValue) { handleSubmit(); }
      else { startRecording(); }
    };

    return (
      <div
        ref={(node) => {
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
          containerRef.current = node;
        }}
        className={cn("relative w-full group/input", className)}
      >
        {/* Ambient glow behind input */}
        <div
          className="absolute -inset-[1px] rounded-2xl opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-700 pointer-events-none"
          style={{
            background: "linear-gradient(135deg, rgba(251,191,36,0.12), rgba(245,158,11,0.06), rgba(234,88,12,0.08))",
            filter: "blur(16px)",
          }}
        />
        <div
          onClick={() => textareaRef.current?.focus()}
          className={cn(
            "relative w-full rounded-2xl border cursor-text",
            "border-white/[0.08] bg-white/[0.04] backdrop-blur-md",
            "focus-within:border-amber-400/20 focus-within:bg-white/[0.06]",
            "focus-within:shadow-[0_0_30px_rgba(251,191,36,0.06),inset_0_1px_0_rgba(255,255,255,0.04)]",
            "hover:border-white/[0.12] hover:bg-white/[0.05]",
            "transition-all duration-500"
          )}
        >
          <style dangerouslySetInnerHTML={{ __html: `
            .sofia-input::-webkit-scrollbar { width: 4px; background: transparent; }
            .sofia-input::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
          `}} />

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => handleValueChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
            }}
            placeholder={placeholder}
            aria-label="Mensagem para Sofia"
            disabled={isRecording || disabled}
            rows={1}
            className={cn(
              "sofia-input w-full resize-none bg-transparent px-5 pt-4 pb-14 text-[15px] leading-relaxed outline-none",
              "text-white/90 placeholder:text-white/20",
              "min-h-[56px] max-h-[200px]",
              isRecording && "pointer-events-none"
            )}
            style={{ overflow: value.split("\n").length > 6 ? "auto" : "hidden" }}
          />

          {/* Bottom bar */}
          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
            {/* Audio visualizer */}
            <div
              className={cn(
                "flex h-6 items-center gap-[3px] transition-all duration-400 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]",
                isRecording ? "w-16 opacity-100" : "w-0 opacity-0 pointer-events-none"
              )}
            >
              {audioData.map((val, i) => (
                <div
                  key={i}
                  className="w-1 rounded-full bg-amber-400 transition-[height] duration-75 ease-out"
                  style={{ height: `${Math.max(4, val * 20)}px` }}
                />
              ))}
            </div>

            {!isRecording && <div />}

            {/* Action button */}
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onClick={onActionButtonClick}
              disabled={disabled && !isRecording}
              aria-label={showArrow ? "Enviar" : showStop ? "Parar" : "Voz"}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-300 outline-none cursor-default",
                hasValue
                  ? "bg-amber-500 text-white hover:bg-amber-400"
                  : "bg-white/[0.06] text-white/30 hover:text-white/60 hover:bg-white/[0.10]",
                "disabled:opacity-30 disabled:cursor-not-allowed"
              )}
            >
              <span className="relative flex h-full w-full items-center justify-center">
                <span className={cn("absolute inset-0 flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]", showArrow ? "opacity-100 scale-100" : "opacity-0 scale-50 pointer-events-none")}>
                  <ArrowUpIcon />
                </span>
                <span className={cn("absolute inset-0 flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]", showMic ? "opacity-100 scale-100" : "opacity-0 scale-50 pointer-events-none")}>
                  <MicIcon />
                </span>
                <span className={cn("absolute inset-0 flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]", showStop ? "opacity-100 scale-100" : "opacity-0 scale-50 pointer-events-none")}>
                  <StopIcon />
                </span>
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }
);

SofiaChatInput.displayName = "SofiaChatInput";
