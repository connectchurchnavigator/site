import React, { useState, useRef } from 'react';
import QRCode from 'qrcode.react';
import '../styles/QRCodeDisplay.css';

const QRCodeDisplay = ({ church }) => {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef(null);
  
  const visitUrl = `https://churchnavigator.com/church/${church.slug}/visit`;

  const downloadQR = () => {
    const canvas = qrRef.current.querySelector('canvas');
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = `${church.slug}-qr-code.png`;
    link.click();
  };

  const shareQR = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Visit ${church.name}`,
          text: `Check in at ${church.name}`,
          url: visitUrl
        });
      } catch (err) {
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(visitUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const printQR = () => {
    const printWindow = window.open('', '', 'width=600,height=600');
    const canvas = qrRef.current.querySelector('canvas');
    const dataUrl = canvas.toDataURL();
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${church.name}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: Arial, sans-serif;
            }
            h1 { margin: 1rem; }
            img { margin: 2rem; }
            p { text-align: center; margin: 1rem; }
          </style>
        </head>
        <body>
          <h1>${church.name}</h1>
          <img src="${dataUrl}" alt="QR Code" />
          <p>Scan this code to check in</p>
          <p style="font-size: 0.9rem; color: #666;">${visitUrl}</p>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <div className="qr-code-display">
      <h2>Visitor Check-In QR Code</h2>
      <p className="qr-description">
        Place this QR code at your church entrance for easy visitor registration
      </p>
      
      <div className="qr-code-container" ref={qrRef}>
        <QRCode
          value={visitUrl}
          size={256}
          level="H"
          includeMargin={true}
        />
      </div>

      <div className="qr-url">
        <input type="text" value={visitUrl} readOnly />
        <button onClick={copyToClipboard} className="btn-copy">
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      <div className="qr-actions">
        <button onClick={downloadQR} className="btn-action">
          <span>📥</span> Download PNG
        </button>
        <button onClick={shareQR} className="btn-action">
          <span>📤</span> Share
        </button>
        <button onClick={printQR} className="btn-action">
          <span>🖨️</span> Print
        </button>
      </div>
    </div>
  );
};

export default QRCodeDisplay;