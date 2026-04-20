import React, { useEffect, useId, useRef, useState } from 'react';

const SMILES_DRAWER_CDN =
  'https://cdn.jsdelivr.net/npm/smiles-drawer@2.1.8/dist/smiles-drawer.min.js';

const getTheme = () => document.documentElement.getAttribute('data-theme') || 'light';

const loadSmilesDrawer = (() => {
  let loader = null;

  return () => {
    if (window.SmilesDrawer) return Promise.resolve(window.SmilesDrawer);
    if (loader) return loader;

    loader = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SMILES_DRAWER_CDN;
      script.async = true;
      script.onload = () => {
        if (window.SmilesDrawer) resolve(window.SmilesDrawer);
        else reject(new Error('SmilesDrawer failed to initialize'));
      };
      script.onerror = () => reject(new Error('Failed to load SmilesDrawer'));
      document.head.appendChild(script);
    });

    return loader;
  };
})();

const MoleculeStructure2D = ({ smiles, height = 170 }) => {
  const canvasRef = useRef(null);
  const canvasId = `mol-2d-${useId().replace(/:/g, '')}`;

  const [theme, setTheme] = useState(getTheme);
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => setTheme(getTheme()));
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!smiles || !canvasRef.current) return () => { cancelled = true; };

    const renderStructure = async () => {
      setStatus('loading');
      try {
        const SmilesDrawer = await loadSmilesDrawer();
        if (cancelled || !canvasRef.current) return;

        const width = canvasRef.current.clientWidth || 260;
        const dark = theme === 'dark';

        const drawer = new SmilesDrawer.Drawer({
          width,
          height,
          compactDrawing: true,
          overlapSensitivity: 0.42,
          bondThickness: dark ? 1.2 : 1.35,
          shortBondLength: 0.83,
          themes: {
            light: {
              C: '#f2f6f2',
              O: '#f08f8a',
              N: '#9ec8ff',
              F: '#b2a7ff',
              CL: '#b2a7ff',
              BR: '#dfba8f',
              I: '#dfba8f',
              P: '#ffd084',
              S: '#f7d781',
              B: '#8fceaa',
              SI: '#8fceaa',
              H: '#f3f6f3',
              BACKGROUND: '#18342c',
            },
            dark: {
              C: '#f0f7f2',
              O: '#ff9e98',
              N: '#9cc6ff',
              F: '#b3a9ff',
              CL: '#b3a9ff',
              BR: '#deb992',
              I: '#deb992',
              P: '#ffd18a',
              S: '#f6d480',
              B: '#93cda9',
              SI: '#93cda9',
              H: '#f4f8f5',
              BACKGROUND: '#152621',
            },
          },
        });

        SmilesDrawer.parse(
          smiles,
          (tree) => {
            if (cancelled || !canvasRef.current) return;
            drawer.draw(tree, canvasId, dark ? 'dark' : 'light', false);
            setStatus('ready');
          },
          () => {
            if (!cancelled) setStatus('fallback');
          },
        );
      } catch {
        if (!cancelled) setStatus('fallback');
      }
    };

    renderStructure();

    return () => {
      cancelled = true;
    };
  }, [smiles, theme, height, canvasId]);

  if (!smiles) {
    return <p className="structure-placeholder">Add a target SMILES to render a 2D structure.</p>;
  }

  return (
    <div className="structure-shell" style={{ height }}>
      {status === 'loading' ? <div className="structure-loading">Rendering structure...</div> : null}

      {status === 'fallback' ? (
        <img
          className="structure-fallback-img"
          src={`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(
            smiles,
          )}/PNG?record_type=2d&image_size=700x420`}
          alt="2D molecular structure"
          onError={() => setStatus('error')}
        />
      ) : (
        <canvas id={canvasId} ref={canvasRef} className="structure-canvas" />
      )}

      {status === 'error' ? (
        <div className="structure-error">
          Could not render 2D structure for this SMILES.
        </div>
      ) : null}
    </div>
  );
};

export default MoleculeStructure2D;
