import React, { useState, useEffect, useRef, useCallback } from "react";
import { Col, Row } from "reactstrap";

interface LogEntry {
  timestamp: string,
  message: string,
}

const WS_URL = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws/logs`;
const API_URL = `http://${window.location.host}/api`;

const Test: React.FC = () => {
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const logConsoleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logConsoleRef.current) {
      logConsoleRef.current.scrollTop = logConsoleRef.current.scrollHeight;
    }
  }, [logs]);

  const addLogEntry = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString('fr-FR');
    setLogs(prevLogs => [
      ...prevLogs,
      { timestamp, message }
    ]);
  }, []);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      addLogEntry("WebSocket already connected.");
      return;
    }

    setLogs([]);
    addLogEntry("Trying to connect to WebSocket...");
    setWsStatus('connecting');

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus('connected');
      addLogEntry("Connection to WebSocket established.");
    };

    ws.onmessage = (event: MessageEvent) => {
      addLogEntry(event.data as string);
    };

    ws.onclose = () => {
      setWsStatus('disconnected');
      addLogEntry("Connection to WebSocket closed.");
      wsRef.current = null;
    };
  }, [addLogEntry]);

  const disconnectWebSocket = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close(1000, "Manual Disconnection.");
    }
  }, []);

  const startServer = useCallback(async () => {
    addLogEntry("Envoi de la commande de démarrage /api/start...");

    try {
      const response = await fetch(`${API_URL}/start`, { method: 'POST' });
      const body = await response.text();

      if (response.ok) {
        addLogEntry(`API OK: ${body}`);
      } else {
        addLogEntry(`API Error: ${body}`);
      }
    } catch (error) {
      addLogEntry("Error: Cannot fetch API");
    }
  }, [addLogEntry]);

  const statusColor = wsStatus === 'connected' ? 'bg-green-100 text-green-800' :
    wsStatus === 'connecting' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800';

  return (
    <>
      <Row>
        <div className={`p-2 rounded-md font-medium mb-4 ${statusColor}`}>
          WebSocket Status: {wsStatus.charAt(0).toUpperCase() + wsStatus.slice(1)}
        </div>

        <Row className="mb-4">
          <Col>
            <button
              type="button"
              className="bg-green-500 hover:bg-green-600 text-white p-2 rounded disabled:opacity-50"
              onClick={connectWebSocket}
              disabled={wsStatus !== 'disconnected'}
            >
              Connect WebSocket
            </button>
          </Col>

          <Col>
            <button
              className="bg-red-500 hover:bg-red-600 text-white p-2 rounded disabled:opacity-50"
              onClick={disconnectWebSocket}
              disabled={wsStatus !== 'connected'}
            >
              Disconnect WebSocket
            </button>
          </Col>

          <Col>
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded disabled:opacity-50"
              onClick={startServer}
              disabled={wsStatus !== 'connected'}
            >
              Start Server
            </button>
          </Col>
        </Row>
      </Row>

      <Row>
        <h2 className="text-xl font-semibold mb-2">Logs</h2>
        <div
          ref={logConsoleRef}
          className="bg-gray-800 text-white p-3 h-64 w-5xl overflow-y-scroll rounded text-sm font-mono text-left"
        >
          {logs.map((logEntry, index) => {
            return (
              <div key={index} className={logEntry.message.includes('[ERR]:') ||
                logEntry.message.includes('Error') ? 'text-red-400' : 'text-green-400'}>
                <span className="text-gray-500">[{logEntry.timestamp}]</span> {logEntry.message}
              </div>
            )
          })}
          {logs.length === 0 && <div className="text-gray-500">En attente de logs...</div>}
        </div>
      </Row>
    </>
  );
};

export default Test;
