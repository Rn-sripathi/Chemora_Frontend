import React, { useEffect, useRef, useState } from 'react';
import * as $3Dmol from '3dmol';

const MoleculeViewer3D = ({
  smiles,
  moleculeName = 'Molecule',
  width = '100%',
  height = '320px',
  defaultStyle = 'ball-stick',
}) => {
  const viewerRef = useRef(null);
  const containerRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewStyle, setViewStyle] = useState(defaultStyle);
  const [viewMode, setViewMode] = useState('3d');
  const [isSpinning, setIsSpinning] = useState(true);
  const [colorScheme, setColorScheme] = useState('element');
  const [surfaceType, setSurfaceType] = useState('none');
  const [theme, setTheme] = useState(document.documentElement.getAttribute('data-theme') || 'dark');

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setTheme(root.getAttribute('data-theme') || 'dark');
    });
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  const viewerBackground = theme === 'light' ? 0xf6f9ff : 0x081734;

  useEffect(() => {
    if (!smiles || !containerRef.current || viewMode === '2d') return;

    setLoading(true);
    setError(null);

    if (viewerRef.current) {
      viewerRef.current.clear();
    }

    try {
      const viewer = $3Dmol.createViewer(containerRef.current, {
        backgroundColor: viewerBackground,
        antialias: true,
      });
      viewerRef.current = viewer;

      const pubchemUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(
        smiles,
      )}/SDF?record_type=3d`;

      fetch(pubchemUrl)
        .then((response) => {
          if (!response.ok) throw new Error('PubChem fetch failed');
          return response.text();
        })
        .then((sdfData) => {
          viewer.addModel(sdfData, 'sdf');
          applyStyle(viewer, viewStyle, colorScheme);
          applySurface(viewer, surfaceType);
          viewer.zoomTo();
          viewer.render();
          if (isSpinning) viewer.spin(true);
          setLoading(false);
        })
        .catch(() => {
          try {
            viewer.addModel(smiles, 'smiles');
            applyStyle(viewer, viewStyle, colorScheme);
            applySurface(viewer, surfaceType);
            viewer.zoomTo();
            viewer.render();
            if (isSpinning) viewer.spin(true);
            setLoading(false);
          } catch (_e) {
            setError('Could not generate 3D structure');
            setLoading(false);
          }
        });
    } catch (_err) {
      setError('Failed to initialize viewer');
      setLoading(false);
    }

    return () => {
      if (viewerRef.current) viewerRef.current.clear();
    };
  }, [smiles, viewMode, theme]);

  useEffect(() => {
    if (!viewerRef.current || viewMode !== '3d') return;
    applyStyle(viewerRef.current, viewStyle, colorScheme);
  }, [viewStyle, colorScheme, viewMode]);

  useEffect(() => {
    if (!viewerRef.current || viewMode !== '3d') return;
    applySurface(viewerRef.current, surfaceType);
  }, [surfaceType, viewMode]);

  useEffect(() => {
    if (!viewerRef.current || viewMode !== '3d') return;
    viewerRef.current.setBackgroundColor(viewerBackground);
    viewerRef.current.render();
  }, [theme, viewMode, viewerBackground]);

  const applyStyle = (viewer, styleName, scheme) => {
    viewer.setStyle({}, {});

    let colorConfig = {};
    switch (scheme) {
      case 'element':
        colorConfig = { colorscheme: 'Jmol' };
        break;
      case 'mono':
        colorConfig = { color: 0x00d998 };
        break;
      case 'purple':
        colorConfig = { color: 0x6f79ff };
        break;
      case 'cyan':
        colorConfig = { color: 0x22d3ee };
        break;
      default:
        colorConfig = { colorscheme: 'Jmol' };
    }

    switch (styleName) {
      case 'stick':
        viewer.setStyle({}, { stick: { radius: 0.12, ...colorConfig } });
        break;
      case 'ball-stick':
        viewer.setStyle({}, {
          stick: { radius: 0.08, ...colorConfig },
          sphere: { scale: 0.25, ...colorConfig },
        });
        break;
      case 'sphere':
      case 'spacefill':
        viewer.setStyle({}, { sphere: { scale: 0.9, ...colorConfig } });
        break;
      case 'line':
        viewer.setStyle({}, { line: { ...colorConfig } });
        break;
      case 'cross':
        viewer.setStyle({}, { cross: { radius: 0.2, ...colorConfig } });
        break;
      default:
        viewer.setStyle({}, {
          stick: { radius: 0.1, ...colorConfig },
          sphere: { scale: 0.25, ...colorConfig },
        });
    }

    viewer.render();
  };

  const applySurface = (viewer, nextSurfaceType) => {
    viewer.removeAllSurfaces();
    if (nextSurfaceType === 'none') {
      viewer.render();
      return;
    }

    const surfaceTypes = {
      vdw: $3Dmol.SurfaceType.VDW,
      sas: $3Dmol.SurfaceType.SAS,
      ses: $3Dmol.SurfaceType.SES,
      ms: $3Dmol.SurfaceType.MS,
    };

    viewer.addSurface(surfaceTypes[nextSurfaceType] || $3Dmol.SurfaceType.VDW, {
      opacity: 0.65,
      colorscheme: 'Jmol',
    });
    viewer.render();
  };

  const toggleSpin = () => {
    if (!viewerRef.current) return;
    const nextSpin = !isSpinning;
    setIsSpinning(nextSpin);
    viewerRef.current.spin(nextSpin);
  };

  const resetView = () => {
    if (!viewerRef.current) return;
    viewerRef.current.zoomTo();
    viewerRef.current.render();
  };

  const takeScreenshot = () => {
    if (!viewerRef.current) return;
    const png = viewerRef.current.pngURI();
    const link = document.createElement('a');
    link.download = `${moleculeName.replace(/\s+/g, '_')}_3d.png`;
    link.href = png;
    link.click();
  };

  if (!smiles) return null;

  const get2DImageUrl = () =>
    `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(smiles)}/PNG?image_size=600x600`;

  const styles = [
    { id: 'ball-stick', label: 'Ball & Stick' },
    { id: 'stick', label: 'Stick' },
    { id: 'sphere', label: 'Spacefill' },
    { id: 'line', label: 'Wireframe' },
    { id: 'cross', label: 'Cross' },
  ];

  const surfaces = [
    { id: 'none', label: 'None' },
    { id: 'vdw', label: 'Van der Waals' },
    { id: 'sas', label: 'Solvent Accessible' },
    { id: 'ses', label: 'Solvent Excluded' },
  ];

  const colors = [
    { id: 'element', label: 'Element', dotClass: 'is-element' },
    { id: 'mono', label: 'Green', dotClass: 'is-green' },
    { id: 'purple', label: 'Purple', dotClass: 'is-purple' },
    { id: 'cyan', label: 'Cyan', dotClass: 'is-cyan' },
  ];

  return (
    <div className="molecule-card">
      <div className="molecule-card-header">
        <h4 className="molecule-title">
          <span className="molecule-title-icon" aria-hidden="true">
            🧬
          </span>
          {moleculeName}
        </h4>

        <div className="molecule-toggle">
          <button
            type="button"
            onClick={() => setViewMode('3d')}
            className={`molecule-toggle-btn ${viewMode === '3d' ? 'is-active' : ''}`}
          >
            3D View
          </button>
          <button
            type="button"
            onClick={() => setViewMode('2d')}
            className={`molecule-toggle-btn ${viewMode === '2d' ? 'is-active' : ''}`}
          >
            2D View
          </button>
        </div>
      </div>

      <div className="molecule-stage" style={{ width, height }}>
        {viewMode === '3d' ? (
          <>
            {loading ? (
              <div className="molecule-overlay">
                <div className="molecule-loader" />
                <p>Loading 3D structure...</p>
              </div>
            ) : null}

            {error ? (
              <div className="molecule-overlay">
                <p className="molecule-error">Unable to render this structure: {error}</p>
              </div>
            ) : null}

            <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
          </>
        ) : (
          <div className="molecule-stage-2d">
            <img
              src={get2DImageUrl()}
              alt={`2D structure of ${moleculeName}`}
              className="molecule-2d-image"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src =
                  'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 220"><rect width="420" height="220" fill="%23f5f7fc"/><text x="210" y="115" text-anchor="middle" fill="%2362799b" font-family="Arial" font-size="18">2D structure not available</text></svg>';
              }}
            />
          </div>
        )}
      </div>

      {viewMode === '3d' ? (
        <div className="molecule-controls">
          <div className="molecule-control-group">
            <label>Visualization Style</label>
            <div className="molecule-chip-row">
              {styles.map((styleOption) => (
                <button
                  key={styleOption.id}
                  type="button"
                  onClick={() => setViewStyle(styleOption.id)}
                  className={`molecule-chip ${viewStyle === styleOption.id ? 'is-active' : ''}`}
                >
                  {styleOption.label}
                </button>
              ))}
            </div>
          </div>

          <div className="molecule-control-group">
            <label>Molecular Surface</label>
            <div className="molecule-chip-row">
              {surfaces.map((surfaceOption) => (
                <button
                  key={surfaceOption.id}
                  type="button"
                  onClick={() => setSurfaceType(surfaceOption.id)}
                  className={`molecule-chip ${surfaceType === surfaceOption.id ? 'is-active' : ''}`}
                >
                  {surfaceOption.label}
                </button>
              ))}
            </div>
          </div>

          <div className="molecule-control-group">
            <label>Color Scheme</label>
            <div className="molecule-chip-row">
              {colors.map((color) => (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => setColorScheme(color.id)}
                  className={`molecule-chip ${colorScheme === color.id ? 'is-active' : ''}`}
                >
                  <span className={`molecule-dot ${color.dotClass}`} />
                  {color.label}
                </button>
              ))}
            </div>
          </div>

          <div className="molecule-actions">
            <button
              type="button"
              onClick={toggleSpin}
              className={`molecule-action-btn ${isSpinning ? 'is-active' : ''}`}
            >
              {isSpinning ? 'Stop Spin' : 'Start Spin'}
            </button>
            <button type="button" onClick={resetView} className="molecule-action-btn">
              Reset View
            </button>
            <button type="button" onClick={takeScreenshot} className="molecule-action-btn">
              Screenshot
            </button>
            <a
              href={`https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(smiles)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="molecule-action-btn is-link"
            >
              Open PubChem
            </a>
          </div>
        </div>
      ) : null}

      <div className="molecule-footer">
        <span>SMILES</span>
        <code>{smiles}</code>
        <button type="button" onClick={() => navigator.clipboard.writeText(smiles)} title="Copy SMILES">
          Copy
        </button>
      </div>
    </div>
  );
};

export default MoleculeViewer3D;
