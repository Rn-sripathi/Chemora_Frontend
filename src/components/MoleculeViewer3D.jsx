/**
 * MoleculeViewer3D Component - Enhanced Version
 * Interactive 3D/2D molecule visualization with multiple view modes
 */

import React, { useEffect, useRef, useState } from 'react';
import * as $3Dmol from '3dmol';

const MoleculeViewer3D = ({
    smiles,
    moleculeName = "Molecule",
    width = "100%",
    height = "320px",
    defaultStyle = "ball-stick"
}) => {
    const viewerRef = useRef(null);
    const containerRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [viewStyle, setViewStyle] = useState(defaultStyle);
    const [viewMode, setViewMode] = useState('3d'); // '3d' or '2d'
    const [isSpinning, setIsSpinning] = useState(true);
    const [colorScheme, setColorScheme] = useState('element'); // element, chain, residue, custom

    // Color themes for molecules
    const colorThemes = {
        element: 'Jmol',
        mono: { color: 0x00ff88 },
        rainbow: 'rainbow',
        chain: 'chain',
        dark: { color: 0x6366f1 },
        neon: { color: 0x22d3ee }
    };

    useEffect(() => {
        if (!smiles || !containerRef.current || viewMode === '2d') return;

        setLoading(true);
        setError(null);

        // Clear previous viewer
        if (viewerRef.current) {
            viewerRef.current.clear();
        }

        try {
            // Initialize 3Dmol viewer
            const viewer = $3Dmol.createViewer(containerRef.current, {
                backgroundColor: 0x0f172a,  // Dark slate
                antialias: true
            });
            viewerRef.current = viewer;

            // Fetch 3D structure from PubChem
            const pubchemUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(smiles)}/SDF?record_type=3d`;

            fetch(pubchemUrl)
                .then(response => {
                    if (!response.ok) throw new Error('PubChem fetch failed');
                    return response.text();
                })
                .then(sdfData => {
                    viewer.addModel(sdfData, "sdf");
                    applyStyle(viewer, viewStyle);
                    viewer.zoomTo();
                    viewer.render();
                    if (isSpinning) viewer.spin(true);
                    setLoading(false);
                })
                .catch(() => {
                    // Fallback: try SMILES directly
                    try {
                        viewer.addModel(smiles, "smiles");
                        applyStyle(viewer, viewStyle);
                        viewer.zoomTo();
                        viewer.render();
                        if (isSpinning) viewer.spin(true);
                        setLoading(false);
                    } catch (e) {
                        setError('Could not generate 3D structure');
                        setLoading(false);
                    }
                });

        } catch (err) {
            setError('Failed to initialize viewer');
            setLoading(false);
        }

        return () => {
            if (viewerRef.current) {
                viewerRef.current.clear();
            }
        };
    }, [smiles, viewMode]);

    // Apply style when it changes
    useEffect(() => {
        if (viewerRef.current && viewMode === '3d') {
            applyStyle(viewerRef.current, viewStyle);
        }
    }, [viewStyle, colorScheme]);

    // Apply molecular visualization style
    const applyStyle = (viewer, styleName) => {
        viewer.setStyle({}, {});

        // Get color config based on scheme
        let colorConfig = {};
        switch (colorScheme) {
            case 'element':
                colorConfig = { colorscheme: 'Jmol' };
                break;
            case 'mono':
                colorConfig = { color: 0x00ff88 };
                break;
            case 'dark':
                colorConfig = { color: 0x6366f1 };
                break;
            case 'neon':
                colorConfig = { color: 0x22d3ee };
                break;
            default:
                colorConfig = { colorscheme: 'Jmol' };
        }

        switch (styleName) {
            case 'stick':
                viewer.setStyle({}, {
                    stick: { radius: 0.12, ...colorConfig }
                });
                break;
            case 'ball-stick':
                viewer.setStyle({}, {
                    stick: { radius: 0.08, ...colorConfig },
                    sphere: { scale: 0.25, ...colorConfig }
                });
                break;
            case 'sphere':
            case 'spacefill':
                viewer.setStyle({}, {
                    sphere: { scale: 0.9, ...colorConfig }
                });
                break;
            case 'line':
                viewer.setStyle({}, {
                    line: { ...colorConfig }
                });
                break;
            case 'cartoon':
                viewer.setStyle({}, {
                    cartoon: { color: 'spectrum' }
                });
                break;
            case 'cross':
                viewer.setStyle({}, {
                    cross: { radius: 0.2, ...colorConfig }
                });
                break;
            default:
                viewer.setStyle({}, {
                    stick: { radius: 0.1, ...colorConfig },
                    sphere: { scale: 0.25, ...colorConfig }
                });
        }

        viewer.render();
    };

    // Add surface
    const addSurface = (surfaceType) => {
        if (!viewerRef.current) return;

        viewerRef.current.removeAllSurfaces();

        if (surfaceType === 'none') {
            viewerRef.current.render();
            return;
        }

        const surfaceTypes = {
            'vdw': $3Dmol.SurfaceType.VDW,
            'sas': $3Dmol.SurfaceType.SAS,
            'ses': $3Dmol.SurfaceType.SES,
            'ms': $3Dmol.SurfaceType.MS
        };

        viewerRef.current.addSurface(surfaceTypes[surfaceType] || $3Dmol.SurfaceType.VDW, {
            opacity: 0.7,
            colorscheme: 'Jmol'
        });
        viewerRef.current.render();
    };

    // Toggle spin
    const toggleSpin = () => {
        if (viewerRef.current) {
            setIsSpinning(!isSpinning);
            viewerRef.current.spin(isSpinning ? false : true);
        }
    };

    // Reset view
    const resetView = () => {
        if (viewerRef.current) {
            viewerRef.current.zoomTo();
            viewerRef.current.render();
        }
    };

    // Take screenshot
    const takeScreenshot = () => {
        if (viewerRef.current) {
            const png = viewerRef.current.pngURI();
            const link = document.createElement('a');
            link.download = `${moleculeName.replace(/\s+/g, '_')}_3d.png`;
            link.href = png;
            link.click();
        }
    };

    if (!smiles) return null;

    // Generate 2D structure URL from PubChem
    const get2DImageUrl = () => {
        return `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(smiles)}/PNG?image_size=300x300`;
    };

    const styles = [
        { id: 'ball-stick', label: 'Ball & Stick', icon: '⚪' },
        { id: 'stick', label: 'Stick', icon: '🔗' },
        { id: 'sphere', label: 'Spacefill', icon: '🔮' },
        { id: 'line', label: 'Wireframe', icon: '📐' },
        { id: 'cross', label: 'Cross', icon: '✖️' }
    ];

    const surfaces = [
        { id: 'none', label: 'None' },
        { id: 'vdw', label: 'Van der Waals' },
        { id: 'sas', label: 'Solvent Accessible' },
        { id: 'ses', label: 'Solvent Excluded' }
    ];

    const colors = [
        { id: 'element', label: 'Element', color: 'bg-gradient-to-r from-red-500 via-blue-500 to-gray-500' },
        { id: 'mono', label: 'Green', color: 'bg-green-400' },
        { id: 'dark', label: 'Purple', color: 'bg-indigo-500' },
        { id: 'neon', label: 'Cyan', color: 'bg-cyan-400' }
    ];

    return (
        <div className="molecule-viewer-container my-4 bg-slate-900/70 rounded-xl border border-slate-700 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-chemistry-accent flex items-center gap-2">
                    <span className="text-lg">🧬</span>
                    {moleculeName}
                </h4>

                {/* View Mode Toggle */}
                <div className="flex bg-slate-800 rounded-lg p-0.5">
                    <button
                        onClick={() => setViewMode('3d')}
                        className={`px-3 py-1 text-xs rounded-md transition-all ${viewMode === '3d'
                            ? 'bg-chemistry-accent text-slate-900 font-medium'
                            : 'text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        3D View
                    </button>
                    <button
                        onClick={() => setViewMode('2d')}
                        className={`px-3 py-1 text-xs rounded-md transition-all ${viewMode === '2d'
                            ? 'bg-chemistry-accent text-slate-900 font-medium'
                            : 'text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        2D View
                    </button>
                </div>
            </div>

            {/* Main Viewer */}
            <div className="relative" style={{ height }}>
                {viewMode === '3d' ? (
                    <>
                        {loading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 z-10">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-10 h-10 border-3 border-chemistry-accent border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-sm text-slate-400">Loading 3D structure...</span>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 z-10">
                                <div className="text-center p-4">
                                    <span className="text-3xl">⚠️</span>
                                    <p className="text-sm text-slate-400 mt-2">{error}</p>
                                </div>
                            </div>
                        )}

                        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full bg-white p-4">
                        <img
                            src={get2DImageUrl()}
                            alt={`2D structure of ${moleculeName}`}
                            className="max-w-full max-h-full object-contain"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="50" x="50" text-anchor="middle" fill="%23666">2D Not Available</text></svg>';
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Controls Panel */}
            {viewMode === '3d' && (
                <div className="p-3 border-t border-slate-700 space-y-3">
                    {/* Style Selection */}
                    <div>
                        <label className="text-xs text-slate-500 mb-1.5 block">Visualization Style</label>
                        <div className="flex flex-wrap gap-1">
                            {styles.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => setViewStyle(s.id)}
                                    className={`px-2.5 py-1 text-xs rounded-lg transition-all flex items-center gap-1 ${viewStyle === s.id
                                        ? 'bg-chemistry-accent text-slate-900 font-medium'
                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                                        }`}
                                >
                                    <span>{s.icon}</span> {s.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Surface Options */}
                    <div>
                        <label className="text-xs text-slate-500 mb-1.5 block">Molecular Surface</label>
                        <div className="flex flex-wrap gap-1">
                            {surfaces.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => addSurface(s.id)}
                                    className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-all"
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Color Scheme */}
                    <div>
                        <label className="text-xs text-slate-500 mb-1.5 block">Color Scheme</label>
                        <div className="flex flex-wrap gap-1">
                            {colors.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => setColorScheme(c.id)}
                                    className={`px-2.5 py-1 text-xs rounded-lg transition-all flex items-center gap-1.5 ${colorScheme === c.id
                                        ? 'ring-2 ring-chemistry-accent ring-offset-1 ring-offset-slate-900'
                                        : ''
                                        } bg-slate-800 text-slate-300 hover:bg-slate-700`}
                                >
                                    <span className={`w-3 h-3 rounded-full ${c.color}`}></span>
                                    {c.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-700/50">
                        <button
                            onClick={toggleSpin}
                            className={`px-3 py-1.5 text-xs rounded-lg transition-all flex items-center gap-1.5 ${isSpinning
                                ? 'bg-blue-600/30 text-blue-400'
                                : 'bg-slate-800 text-slate-400'
                                }`}
                        >
                            🔄 {isSpinning ? 'Stop Spin' : 'Start Spin'}
                        </button>
                        <button
                            onClick={resetView}
                            className="px-3 py-1.5 text-xs bg-slate-800 text-slate-400 rounded-lg hover:bg-slate-700 transition-all flex items-center gap-1.5"
                        >
                            🎯 Reset View
                        </button>
                        <button
                            onClick={takeScreenshot}
                            className="px-3 py-1.5 text-xs bg-slate-800 text-slate-400 rounded-lg hover:bg-slate-700 transition-all flex items-center gap-1.5"
                        >
                            📷 Screenshot
                        </button>
                        <a
                            href={`https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(smiles)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 text-xs bg-indigo-600/30 text-indigo-400 rounded-lg hover:bg-indigo-600/50 transition-all flex items-center gap-1.5"
                        >
                            📊 PubChem
                        </a>
                    </div>
                </div>
            )}

            {/* SMILES Display */}
            <div className="px-3 py-2 bg-slate-950/50 border-t border-slate-700">
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">SMILES:</span>
                    <code className="text-xs font-mono text-slate-400 break-all flex-1">{smiles}</code>
                    <button
                        onClick={() => navigator.clipboard.writeText(smiles)}
                        className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                        title="Copy SMILES"
                    >
                        📋
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MoleculeViewer3D;
