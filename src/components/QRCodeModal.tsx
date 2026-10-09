import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';
import { UIMode, ThemeMode } from '../types';
import { QrCode, Camera, Copy, Check, Download, Upload, X, Hash, Link as LinkIcon, Sparkles } from 'lucide-react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  uiMode: UIMode;
  themeMode?: ThemeMode;
  currentRoom: string;
  onJoinRoom: (roomName: string, password?: string) => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  uiMode,
  themeMode = 'dark',
  currentRoom,
  onJoinRoom,
}) => {
  const [activeTab, setActiveTab] = useState<'share' | 'scan'>('share');
  const [copiedLink, setCopiedLink] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isTerminal = uiMode === 'terminal';
  const isLight = themeMode === 'light';
  const baseUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
  const inviteUrl = `${baseUrl}?room=${encodeURIComponent(currentRoom)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const parseAndJoinRoom = (rawString: string) => {
    let room = rawString.trim();
    if (room.includes('?room=')) {
      try {
        const urlObj = new URL(room);
        const param = urlObj.searchParams.get('room');
        if (param) room = param;
      } catch {
        const match = room.match(/\?room=([^&]+)/);
        if (match && match[1]) {
          room = decodeURIComponent(match[1]);
        }
      }
    } else if (room.includes('?invite=')) {
      try {
        const urlObj = new URL(room);
        const param = urlObj.searchParams.get('invite');
        if (param) room = param;
      } catch {
        const match = room.match(/\?invite=([^&]+)/);
        if (match && match[1]) {
          room = decodeURIComponent(match[1]);
        }
      }
    }

    if (!room.startsWith('#')) {
      room = `#${room.replace(/^#+/, '')}`;
    }

    setScanResult(`Joined ${room}`);
    onJoinRoom(room);
    setTimeout(() => {
      onClose();
      setScanResult(null);
    }, 1200);
  };

  // Start Live Camera Scanner
  const startCameraScanner = async () => {
    setScanError(null);
    setIsScanning(true);
    try {
      const html5QrCode = new Html5Qrcode('qr-reader');
      scannerRef.current = html5QrCode;
      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          html5QrCode.stop().catch(() => {});
          setIsScanning(false);
          parseAndJoinRoom(decodedText);
        },
        () => {}
      );
    } catch (err: any) {
      console.error('Camera QR scan error:', err);
      setScanError('Camera permission denied or camera not available. Try uploading a QR image.');
      setIsScanning(false);
    }
  };

  const stopCameraScanner = () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.stop().then(() => scannerRef.current?.clear()).catch(() => {});
    }
    setIsScanning(false);
  };

  useEffect(() => {
    if (isOpen && activeTab === 'scan') {
      startCameraScanner();
    } else {
      stopCameraScanner();
    }
    return () => {
      stopCameraScanner();
    };
  }, [isOpen, activeTab]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanError(null);
    try {
      const html5QrCode = new Html5Qrcode('qr-file-reader');
      const decodedText = await html5QrCode.scanFile(file, true);
      parseAndJoinRoom(decodedText);
    } catch (err: any) {
      console.error('QR file scan error:', err);
      setScanError('Could not detect a valid QR code in this image. Please try another image.');
    }
  };

  const handleDownloadQR = () => {
    const svgElement = document.getElementById('room-qr-svg');
    if (!svgElement) return;
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 40;
      if (ctx) {
        ctx.fillStyle = '#09090b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20);
        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = `meshnet-qr-${currentRoom.replace('#', '')}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs select-none">
      <div
        className={`w-full max-w-md rounded-2xl border p-5 shadow-2xl font-mono ${
          isTerminal
            ? isLight
              ? 'bg-white border-slate-300 text-slate-800 shadow-xl'
              : 'bg-zinc-950 border-emerald-500/50 text-emerald-300'
            : isLight
            ? 'bg-white border-slate-200 text-slate-800 shadow-xl'
            : 'bg-zinc-900 border-zinc-700 text-zinc-100'
        }`}
      >
        {/* Modal Header */}
        <div className={`flex items-center justify-between pb-3 border-b ${
          isLight ? 'border-slate-200' : 'border-zinc-800'
        }`}>
          <div className="flex items-center gap-2">
            <QrCode className={`w-5 h-5 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} />
            <span className="font-bold text-sm sm:text-base">QR Code & Room Sharing</span>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg cursor-pointer transition ${
              isLight ? 'text-slate-400 hover:text-slate-800 hover:bg-slate-100' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className={`flex items-center p-1 rounded-xl my-4 text-xs font-semibold border ${
          isLight ? 'bg-slate-100 border-slate-200' : 'bg-zinc-950 border-zinc-800'
        }`}>
          <button
            onClick={() => setActiveTab('share')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'share'
                ? isLight
                  ? 'bg-white border border-emerald-300 text-emerald-900 font-bold shadow-xs'
                  : 'bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-bold'
                : isLight
                ? 'text-slate-600 hover:text-slate-900'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Share Room QR</span>
          </button>
          <button
            onClick={() => setActiveTab('scan')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'scan'
                ? isLight
                  ? 'bg-white border border-emerald-300 text-emerald-900 font-bold shadow-xs'
                  : 'bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-bold'
                : isLight
                ? 'text-slate-600 hover:text-slate-900'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Scan QR Code</span>
          </button>
        </div>

        {/* Tab 1: Share Room QR Code */}
        {activeTab === 'share' && (
          <div className="space-y-4 text-center">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
              isLight
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-emerald-950/60 border border-emerald-500/30 text-emerald-300'
            }`}>
              <Hash className="w-3.5 h-3.5" />
              <span>{currentRoom}</span>
            </div>

            {/* QR Code Canvas */}
            <div className={`flex justify-center p-4 rounded-xl border ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-950 border-zinc-800'
            }`}>
              <div className="p-3 bg-white rounded-xl shadow-xs border border-slate-200">
                <QRCodeSVG
                  id="room-qr-svg"
                  value={inviteUrl}
                  size={180}
                  level="H"
                  includeMargin={false}
                />
              </div>
            </div>

            <p className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
              Scan this QR code on another phone to instantly join <span className={`font-bold ${isLight ? 'text-emerald-800' : 'text-emerald-400'}`}>{currentRoom}</span>.
            </p>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleCopyLink}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition border cursor-pointer ${
                  isLight
                    ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-xs'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                }`}
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <LinkIcon className="w-4 h-4 text-emerald-500" />}
                <span>{copiedLink ? 'Copied Link!' : 'Copy Invite Link'}</span>
              </button>

              <button
                onClick={handleDownloadQR}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  isLight
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-emerald-700 hover:bg-emerald-600 text-white'
                }`}
                title="Download QR Code image"
              >
                <Download className="w-4 h-4" />
                <span>Save PNG</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Scan QR Code */}
        {activeTab === 'scan' && (
          <div className="space-y-3">
            {scanResult ? (
              <div className={`p-4 rounded-xl text-center space-y-1 border ${
                isLight
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-emerald-950 border border-emerald-500/50 text-emerald-300'
              }`}>
                <Sparkles className={`w-6 h-6 mx-auto animate-bounce ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                <p className="font-bold text-sm">{scanResult}</p>
                <p className={`text-[11px] ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>Switching channel...</p>
              </div>
            ) : (
              <>
                {/* Live Camera Feed Container */}
                <div className={`relative overflow-hidden rounded-xl min-h-[220px] flex flex-col items-center justify-center p-2 border ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-950 border-zinc-800'
                }`}>
                  <div id="qr-reader" className="w-full max-w-[260px] overflow-hidden rounded-lg"></div>

                  {!isScanning && !scanError && (
                    <button
                      onClick={startCameraScanner}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Start Camera</span>
                    </button>
                  )}
                </div>

                {scanError && (
                  <div className={`p-2.5 rounded-xl text-xs border ${
                    isLight
                      ? 'bg-rose-50 border-rose-200 text-rose-800'
                      : 'bg-rose-950/60 border border-rose-500/30 text-rose-300'
                  }`}>
                    {scanError}
                  </div>
                )}

                {/* File Upload Alternative */}
                <div className={`pt-2 border-t text-center ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer border ${
                      isLight
                        ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                    }`}
                  >
                    <Upload className={`w-4 h-4 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} />
                    <span>Upload QR Image from Device</span>
                  </button>
                  <div id="qr-file-reader" className="hidden"></div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
