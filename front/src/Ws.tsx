import React, { useState, useEffect, useRef, useCallback } from "react";
import { Col, Row } from "reactstrap";

interface LogEntry {
  timestamp: string,
  message: string,
}

const WS_URL = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws/logs`;
const API_URL = `http://${window.location.host}/api`;

const Test: React.FC = () => {
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnecting' | 'disconnected'>('disconnected');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [commandInput, setCommandInput] = useState<string>('');

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
      addLogEntry("[INFO]: WebSocket already connected.");
      return;
    }

    setLogs([]);
    addLogEntry("[INFO]: Connecting to WebSocket...");
    setWsStatus('connecting');

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus('connected');
      addLogEntry("[INFO]: Connection to WebSocket established.");
    };

    ws.onmessage = (event: MessageEvent) => {
      addLogEntry(event.data as string);
    };

    ws.onclose = () => {
      setWsStatus('disconnected');
      addLogEntry("[INFO]: Connection to WebSocket closed.");
      wsRef.current = null;
    };

    ws.onerror = () => {
      addLogEntry("[ERR]: Websocket connection failed.");
      wsRef.current?.close();
    };
  }, [addLogEntry]);

  const disconnectWebSocket = useCallback(() => {
    setWsStatus('disconnecting');
    addLogEntry("[INFO]: Disconnecting from WebSocket...");

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close(1000, "Manual Disconnection.");
    }
  }, []);

  const startServer = useCallback(async () => {
    addLogEntry("[INFO]: Sending starting command /api/start...");

    try {
      const response = await fetch(`${API_URL}/start`, { method: 'POST' });
      const body = await response.text();

      if (response.ok) {
        addLogEntry(`[OK]: ${body}`);
      } else {
        addLogEntry(`[ERR]: ${body}`);
      }
    } catch (error) {
      addLogEntry("[ERR]: Cannot fetch API");
    }
  }, [addLogEntry]);

  const stopServer = useCallback(async () => {
    addLogEntry("[INFO]: Sending stopping command /api/stop...");

    try {
      const response = await fetch(`${API_URL}/stop`, { method: 'POST' });
      const body = await response.text();

      if (response.ok) {
        addLogEntry(`[OK]: ${body}`);
      } else {
        addLogEntry(`[ERR]: ${body}`);
      }
    } catch (error) {
      addLogEntry("[ERR]: Cannot fetch Api");
    }
  }, [addLogEntry]);

  const sendCommand = useCallback(async () => {
    const trimmedCommand = commandInput.trim();
    if (!trimmedCommand) return;

    addLogEntry(`[CMD]: ${trimmedCommand}`);
    setCommandInput("");
    try {
      const response = await fetch(`${API_URL}/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command: trimmedCommand }),
      });

      const body = await response.text();

      if (response.ok) {
        setCommandInput('');
      } else {
        addLogEntry(`[ERR]: ${body}`);
      }
    } catch (error) {
      addLogEntry("[ERR]: Cannot fetch Api");
    }
  }, [commandInput, addLogEntry]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && wsStatus === 'connected') {
      sendCommand();
    }
  };

  const statusColor = wsStatus === 'connected' ? 'bg-green-100 text-green-800' :
    wsStatus === 'connecting' || 'disconnecting' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800';

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

          <Col>
            <button
              className="bg-yellow-500 hover:bg-yellow-600 text-white p-2 rounded disabled:opacity-50"
              onClick={stopServer}
              disabled={wsStatus !== 'connected'}
            >
              Stop Server
            </button>
          </Col>
        </Row>
      </Row>

      <Row>
        <h2 className="text-xl font-semibold mb-2">Logs</h2>
        <div
          ref={logConsoleRef}
          className="bg-gray-800 text-white p-3 h-96 w-5xl overflow-y-scroll rounded text-sm font-mono text-left text-pretty"
        >
          {logs.map((logEntry, index) => {
            const textColor = logEntry.message.includes('[ERR]:') ? 'text-red-400'
              : logEntry.message.includes('[CMD]:') ? 'text-yellow-400'
                : logEntry.message.includes('[INFO]:') ? 'text-blue-400'
                  : 'text-green-400';

            return (
              <div key={index} className={textColor}>
                <span className="text-gray-500">[{logEntry.timestamp}]</span> {logEntry.message}
              </div>
            )
          })}
          {logs.length === 0 && <div className="text-gray-500">En attente de logs...</div>}
          <div className="flex gap-2 mt-1">
            <input
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="grow px-2 py-1 rounded-lg bg-gray-900 disabled:text-gray-500"
              placeholder="Entrer a command"
              disabled={wsStatus !== 'connected'}
            />
            <button
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 font-bold transition duration-150 shadow-md disabled:opacity-50 disabled:bg-gray-900 whitespace-nowrap"
              style={{ borderRadius: '8px' }}
              onClick={sendCommand}
              disabled={wsStatus !== 'connected' || commandInput.trim().length === 0}
            >
              Envoyer
            </button>
          </div>
        </div>

      </Row>
    </>
  );
};

export default Test;
