import React, { useState, useEffect } from 'react';
import Draggable from 'react-draggable';
import { Resizable } from 're-resizable';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import './App.css';

const App = () => {
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [positions, setPositions] = useState({});
  const [rotations, setRotations] = useState({});
  const [selectedHeader, setSelectedHeader] = useState(null);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [imagePositions, setImagePositions] = useState({});
  const [imageSizes, setImageSizes] = useState({});
  const [pdfReady, setPdfReady] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        if (jsonData.length > 0) {
          const headers = Object.keys(jsonData[0]);
          setHeaders(headers);
          setRows(jsonData);
          setPdfReady(true);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleDragStop = (e, data, header) => {
    setPositions((prevPositions) => ({
      ...prevPositions,
      [header]: { x: data.x, y: data.y },
    }));
  };

  const handleRotationChange = (angle, header) => {
    setRotations((prevRotations) => ({
      ...prevRotations,
      [header]: angle,
    }));
  };

  const handleHeaderClick = (header) => {
    setSelectedHeader(header === selectedHeader ? null : header);
  };

  const handleImageUpload = (event) => {
    const files = event.target.files;
    const newImages = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = (e) => {
        newImages.push(e.target.result);
        if (newImages.length === files.length) {
          setUploadedImages((prevImages) => [...prevImages, ...newImages]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageRemove = (index) => {
    setUploadedImages((prevImages) => prevImages.filter((_, i) => i !== index));
    setImagePositions((prevPositions) => {
      const updatedPositions = { ...prevPositions };
      delete updatedPositions[index];
      return updatedPositions;
    });
    setImageSizes((prevSizes) => {
      const updatedSizes = { ...prevSizes };
      delete updatedSizes[index];
      return updatedSizes;
    });
  };

  const handleResize = (event, direction, ref, index) => {
    setImageSizes((prevSizes) => ({
      ...prevSizes,
      [index]: {
        width: ref.style.width,
        height: ref.style.height,
      },
    }));
  };

  const exportToPDF = () => {
    const pdf = new jsPDF({
      unit: 'px',
      format: [794, 1123], // A4 size in pixels
    });

    rows.forEach((row, rowIndex) => {
      // Render images on each page
      uploadedImages.forEach((imageSrc, index) => {
        const size = imageSizes[index] || { width: '100px', height: '100px' };
        pdf.addImage(
          imageSrc,
          'PNG',
          parseFloat(imagePositions[index]?.x || 0),
          parseFloat(imagePositions[index]?.y || 0),
          parseFloat(size.width),
          parseFloat(size.height)
        );
      });

      // Render headers and row data on each page
      headers.forEach((header) => {
        const position = positions[header] || { x: 50, y: 50 }; // Default position
        const rotation = rotations[header] || 0;
        const text = `${header}: ${row[header] || ''}`;

        pdf.text(text, position.x, position.y, { angle: rotation });
      });

      // Add a new page if it's not the last row
      if (rowIndex < rows.length - 1) {
        pdf.addPage();
      }
    });
    pdf.save('download.pdf');
  };

  const saveSettings = () => {
    const settings = {
      positions,
      rotations,
      uploadedImages,
      imagePositions,
      imageSizes,
    };
    localStorage.setItem('layoutSettings', JSON.stringify(settings));
  };

  const loadSettings = () => {
    const savedSettings = localStorage.getItem('layoutSettings');
    if (savedSettings) {
      const { positions, rotations, uploadedImages, imagePositions, imageSizes } = JSON.parse(
        savedSettings
      );
      setPositions(positions);
      setRotations(rotations);
      setUploadedImages(uploadedImages || []);
      setImagePositions(imagePositions || {});
      setImageSizes(imageSizes || {});
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Upload Excel, Arrange, Rotate, Resize, and Save Layout</h1>
        <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} />
        <input type="file" accept="image/*" multiple onChange={handleImageUpload} />
        <div id="a4-area" className="a4-area">
          {headers.length > 0 && (
            <div className="draggable-container">
              {headers.map((header) => (
                <div
                  key={header}
                  onClick={() => handleHeaderClick(header)}
                  style={{
                    position: 'relative',
                    border: selectedHeader === header ? '2px solid red' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  <Draggable
                    onStop={(e, data) => handleDragStop(e, data, header)}
                    defaultPosition={positions[header] || { x: 0, y: 0 }}
                  >
                    <div
                      className="draggable-item"
                      style={{
                        transform: `rotate(${rotations[header] || 0}deg)`,
                      }}
                    >
                      {header}
                    </div>
                  </Draggable>
                  {selectedHeader === header && (
                    <input
                      type="number"
                      value={rotations[header] || 0}
                      onChange={(e) => handleRotationChange(parseFloat(e.target.value), header)}
                      className="rotation-input"
                      placeholder="Rotation (deg)"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
          {uploadedImages.map((imageSrc, index) => (
            <Draggable
              key={index}
              onStop={(e, data) => {
                setImagePositions((prevPositions) => ({
                  ...prevPositions,
                  [index]: { x: data.x, y: data.y },
                }));
              }}
              defaultPosition={imagePositions[index] || { x: 0, y: 0 }}
            >
              <Resizable
                size={imageSizes[index] || { width: '100px', height: '100px' }}
                onResizeStop={(e, direction, ref) => handleResize(e, direction, ref, index)}
              >
                <div style={{ position: 'relative' }}>
                  <img
                    src={imageSrc}
                    alt={`uploaded-${index}`}
                    className="uploaded-image"
                  />
                  <button
                    onClick={() => handleImageRemove(index)}
                    className="remove-image-button"
                  >
                    Remove
                  </button>
                </div>
              </Resizable>
            </Draggable>
          ))}
        </div>
        {pdfReady && (
          <div>
            <button onClick={exportToPDF} className="export-button">
              Export to PDF
            </button>
            <button onClick={saveSettings} className="save-button">
              Save Layout
            </button>
          </div>
        )}
      </header>
    </div>
  );
};

export default App;
