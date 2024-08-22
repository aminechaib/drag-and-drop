import React, { useState, useEffect, useCallback } from 'react';
import Draggable from 'react-draggable';
import { Resizable } from 're-resizable';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { debounce } from 'lodash';
import './App.css';

const HeaderItem = ({
  header, position, rotation, onHeaderClick, onDragStop, onRotationChange,
  isSelected, fontFamily, fontSize, onFontFamilyChange, onFontSizeChange
}) => (
  <div
    onClick={() => onHeaderClick(header)}
    style={{
      position: 'relative',
      border: isSelected ? '2px solid red' : 'none',
      cursor: 'pointer',
    }}
  >
    <Draggable
      onStop={(e, data) => onDragStop(e, data, header)}
      defaultPosition={position || { x: 0, y: 0 }}
    >
      <div
        className="draggable-item"
        style={{
          transform: `rotate(${rotation || 0}deg)`,
          fontFamily: fontFamily || 'Arial',
          fontSize: fontSize || '16px',
        }}
      >
        {header}
      </div>
    </Draggable>
    {isSelected && (
      <div className="controls">
        <input
          type="number"
          value={rotation || 0}
          onChange={(e) => onRotationChange(parseFloat(e.target.value), header)}
          className="rotation-input"
          placeholder="Rotation (deg)"
        />
        <select
          value={fontFamily || 'Arial'}
          onChange={(e) => onFontFamilyChange(e.target.value, header)}
        >
          <option value="Arial">Arial</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Courier New">Courier New</option>
          <option value="Georgia">Georgia</option>
          {/* Add more font options here */}
        </select>
        <input
          type="number"
          value={fontSize || 16}
          onChange={(e) => onFontSizeChange(parseFloat(e.target.value), header)}
          className="font-size-input"
          placeholder="Font Size (px)"
        />
      </div>
    )}
  </div>
);

const UploadedImage = ({ index, imageSrc, position, size, onDragStop, onResize, onRemove }) => (
  <Draggable
    key={index}
    onStop={(e, data) => onDragStop(e, data, index)}
    defaultPosition={position || { x: 0, y: 0 }}
  >
    <Resizable
      size={size || { width: '100px', height: '100px' }}
      onResizeStop={(e, direction, ref) => onResize(e, direction, ref, index)}
    >
      <div style={{ position: 'relative' }}>
        <img
          src={imageSrc}
          alt={`uploaded-${index}`}
          className="uploaded-image"
        />
        <button
          onClick={() => onRemove(index)}
          className="remove-image-button"
        >
          Remove
        </button>
      </div>
    </Resizable>
  </Draggable>
);

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
  const [fontFamilies, setFontFamilies] = useState({});
  const [fontSizes, setFontSizes] = useState({});

  useEffect(() => {
    loadSettings();
  }, []);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        try {
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
        } catch (error) {
          alert('Error reading Excel file. Please ensure the file is in correct format.');
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleFontFamilyChange = (fontFamily, header) => {
    setFontFamilies((prevFamilies) => ({
      ...prevFamilies,
      [header]: fontFamily,
    }));
  };

  const handleFontSizeChange = (fontSize, header) => {
    setFontSizes((prevSizes) => ({
      ...prevSizes,
      [header]: fontSize,
    }));
  };

  const handleDragStop = (e, data, header) => {
    setPositions((prevPositions) => ({
      ...prevPositions,
      [header]: { x: data.x, y: data.y },
    }));
  };

  const handleRotationChange = useCallback(
    debounce((angle, header) => {
      setRotations((prevRotations) => ({
        ...prevRotations,
        [header]: angle,
      }));
    }, 200),
    []
  );

  const handleHeaderClick = (header) => {
    setSelectedHeader(header === selectedHeader ? null : header);
  };

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files);
    const newImages = files.map((file) => {
      const reader = new FileReader();
      return new Promise((resolve) => {
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(newImages).then((imageSources) => {
      setUploadedImages((prevImages) => [...prevImages, ...imageSources]);
    });
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
  
      headers.forEach((header) => {
        const position = positions[header] || { x: 50, y: 50 };
        const rotation = rotations[header] || 0;
        const text = `${header}: ${row[header] || ''}`;
        const fontFamily = fontFamilies[header] || 'Arial';
        const fontSize = fontSizes[header] || 16;
  
        pdf.setFont(fontFamily);
        pdf.setFontSize(fontSize);
        pdf.text(text, position.x, position.y, { angle: rotation });
      });
  
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
      fontFamilies,
      fontSizes,
    };
    localStorage.setItem('layoutSettings', JSON.stringify(settings));
  };

  const loadSettings = () => {
    const savedSettings = localStorage.getItem('layoutSettings');
    if (savedSettings) {
      const { positions, rotations, uploadedImages, imagePositions, imageSizes, fontFamilies, fontSizes } = JSON.parse(savedSettings);
      setPositions(positions);
      setRotations(rotations);
      setUploadedImages(uploadedImages || []);
      setImagePositions(imagePositions || {});
      setImageSizes(imageSizes || {});
      setFontFamilies(fontFamilies || {});
      setFontSizes(fontSizes || {});
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
                <HeaderItem
                  key={header}
                  header={header}
                  position={positions[header]}
                  rotation={rotations[header]}
                  onHeaderClick={handleHeaderClick}
                  onDragStop={handleDragStop}
                  onRotationChange={handleRotationChange}
                  isSelected={selectedHeader === header}
                  fontFamily={fontFamilies[header]}
                  fontSize={fontSizes[header]}
                  onFontFamilyChange={handleFontFamilyChange}
                  onFontSizeChange={handleFontSizeChange}
                />
              ))}
            </div>
          )}

          {uploadedImages.map((imageSrc, index) => (
            <UploadedImage
              key={index}
              index={index}
              imageSrc={imageSrc}
              position={imagePositions[index]}
              size={imageSizes[index]}
              onDragStop={(e, data) =>
                setImagePositions((prevPositions) => ({
                  ...prevPositions,
                  [index]: { x: data.x, y: data.y },
                }))
              }
              onResize={handleResize}
              onRemove={handleImageRemove}
            />
          ))}
        </div>
        {pdfReady && <button onClick={exportToPDF}>Export to PDF</button>}
        <button onClick={saveSettings}>Save Layout</button>
      </header>
    </div>
  );
};

export default App;
