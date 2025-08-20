"use client";

import {
  SOCKET_STATES,
  LiveTranscriptionEvents,
  type LiveTranscriptionEvent,
} from "@deepgram/sdk";

import { devLog } from "@/lib/utils/productionLogger";
import { createContext, useContext, useState, ReactNode, FunctionComponent, useRef } from "react";

interface DeepgramContextType {
  connectToDeepgram: () => Promise<void>;
  disconnectFromDeepgram: () => void;
  connectionState: SOCKET_STATES;
  realtimeTranscript: string;
  error: string | null;
}

const DeepgramContext = createContext<DeepgramContextType | undefined>(undefined);

interface DeepgramContextProviderProps {
  children: ReactNode;
}

const getApiKey = async (): Promise<string> => {
  const response = await fetch("/api/deepgram", { cache: "no-store" });
  const result = await response.json();
  return result.key;
};

const DeepgramContextProvider: FunctionComponent<DeepgramContextProviderProps> = ({ children }) => {
  const [connection, setConnection] = useState<WebSocket | null>(null);
  const [connectionState, setConnectionState] = useState<SOCKET_STATES>(SOCKET_STATES.closed);
  const [realtimeTranscript, setRealtimeTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<MediaRecorder | null>(null);

  const connectToDeepgram = async () => {
    try {
      setError(null);
      setRealtimeTranscript("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioRef.current = new MediaRecorder(stream);

      const apiKey = await getApiKey();

      devLog.log("Opening WebSocket connection...");
      const socket = new WebSocket("wss://api.deepgram.com/v1/listen", ["token", apiKey]);

      socket.onopen = () => {
        setConnectionState(SOCKET_STATES.open);
        devLog.log("WebSocket connection opened");
        audioRef.current!.addEventListener("dataavailable", (event) => {
          if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
            socket.send(event.data);
          }
        });

        audioRef.current!.start(250);
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.channel && data.channel.alternatives && data.channel.alternatives[0]) {
          const newTranscript = data.channel.alternatives[0].transcript;
          setRealtimeTranscript((prev) => prev + " " + newTranscript);
        }
      };

      socket.onerror = (error) => {
        devLog.error("WebSocket error:", error);
        setError("Error connecting to Deepgram. Please try again.");
        disconnectFromDeepgram();
      };

      socket.onclose = (event) => {
        setConnectionState(SOCKET_STATES.closed);
        devLog.log("WebSocket connection closed:", event.code, event.reason);
      };

      setConnection(socket);
    } catch (error) {
      devLog.error("Error starting voice recognition:", error);
      setError(error instanceof Error ? error.message : "An unknown error occurred");
      setConnectionState(SOCKET_STATES.closed);
    }
  };

  const disconnectFromDeepgram = () => {
    if (connection) {
      connection.close();
      setConnection(null);
    }
    if (audioRef.current) {
      audioRef.current.stop();
    }
    setRealtimeTranscript("");
    setConnectionState(SOCKET_STATES.closed);
  };

  return (
    <DeepgramContext.Provider
      value={{
        connectToDeepgram,
        disconnectFromDeepgram,
        connectionState,
        realtimeTranscript,
        error,
      }}
    >
      {children}
    </DeepgramContext.Provider>
  );
};

// Use the useDeepgram hook to access the deepgram context and use the deepgram in any component.
// This allows you to connect to the deepgram and disconnect from the deepgram via a socket.
// Make sure to wrap your application in a DeepgramContextProvider to use the deepgram.
function useDeepgram(): DeepgramContextType {
  const context = useContext(DeepgramContext);
  if (context === undefined) {
    throw new Error("useDeepgram must be used within a DeepgramContextProvider");
  }
  return context;
}

export {
  DeepgramContextProvider,
  useDeepgram,
  SOCKET_STATES,
  LiveTranscriptionEvents,
  type LiveTranscriptionEvent,
};
