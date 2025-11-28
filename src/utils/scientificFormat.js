/**
 * Scientific Formatting Utilities for Chemora
 * Provides proper formatting for chemical formulas, units, and scientific notation
 */

/**
 * Formats chemical formula with proper subscripts
 * Example: "H2O" -> "H₂O", "C6H12O6" -> "C₆H₁₂O₆"
 */
export const formatChemicalFormula = (formula) => {
    if (!formula) return '';

    const subscriptMap = {
        '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
        '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉'
    };

    return formula.replace(/(\d+)/g, (match) => {
        return match.split('').map(digit => subscriptMap[digit] || digit).join('');
    });
};

/**
 * Formats temperature with proper degree symbol
 * Example: 25, "celsius" -> "25°C"
 */
export const formatTemperature = (value, unit = 'celsius') => {
    if (value === null || value === undefined) return '';

    const unitMap = {
        'celsius': '°C',
        'kelvin': 'K',
        'fahrenheit': '°F'
    };

    return `${value}${unitMap[unit.toLowerCase()] || '°C'}`;
};

/**
 * Formats measurement with proper units
 * Example: 100, "mg" -> "100 mg", 2.5, "mL" -> "2.5 mL"
 */
export const formatMeasurement = (value, unit) => {
    if (value === null || value === undefined) return '';

    // Round to 2 decimal places for readability
    const rounded = typeof value === 'number' ? value.toFixed(2).replace(/\.?0+$/, '') : value;

    return `${rounded} ${unit}`;
};

/**
 * Formats yield with uncertainty
 * Example: 85.5, 2.1 -> "85.5% ± 2.1%"
 */
export const formatYield = (value, uncertainty = null) => {
    if (value === null || value === undefined) return '';

    const rounded = typeof value === 'number' ? value.toFixed(1) : value;

    if (uncertainty) {
        const uncertaintyRounded = typeof uncertainty === 'number' ? uncertainty.toFixed(1) : uncertainty;
        return `${rounded}% ± ${uncertaintyRounded}%`;
    }

    return `${rounded}%`;
};

/**
 * Formats time duration
 * Example: 90, "min" -> "1 h 30 min", 7200, "s" -> "2 h"
 */
export const formatTime = (value, unit = 'min') => {
    if (value === null || value === undefined) return '';

    let seconds = value;

    // Convert to seconds first
    if (unit === 'min') seconds = value * 60;
    else if (unit === 'h') seconds = value * 3600;

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (hours > 0) parts.push(`${hours} h`);
    if (minutes > 0) parts.push(`${minutes} min`);
    if (secs > 0 && hours === 0) parts.push(`${secs} s`);

    return parts.join(' ') || '0 s';
};

/**
 * Formats scientific notation for very large/small numbers
 * Example: 0.00000123 -> "1.23 × 10⁻⁶"
 */
export const formatScientific = (value, decimals = 2) => {
    if (value === null || value === undefined) return '';

    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return value;

    const exponent = Math.floor(Math.log10(Math.abs(num)));
    const mantissa = num / Math.pow(10, exponent);

    const superscriptMap = {
        '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
        '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
        '-': '⁻', '+': '⁺'
    };

    const expString = exponent.toString().split('').map(c => superscriptMap[c] || c).join('');

    if (Math.abs(exponent) < 3) {
        return num.toFixed(decimals);
    }

    return `${mantissa.toFixed(decimals)} × 10${expString}`;
};

/**
 * Formats molecular weight with units
 * Example: 180.16 -> "180.16 g/mol"
 */
export const formatMolecularWeight = (value) => {
    if (value === null || value === undefined) return '';

    const rounded = typeof value === 'number' ? value.toFixed(2) : value;
    return `${rounded} g/mol`;
};

/**
 * Formats confidence score as percentage
 * Example: 0.85 -> "85%", 0.856 -> "85.6%"
 */
export const formatConfidence = (value) => {
    if (value === null || value === undefined) return '';

    const percent = (typeof value === 'number' && value <= 1) ? value * 100 : value;
    return `${percent.toFixed(1)}%`;
};

/**
 * Formats price in USD
 * Example: 45.50 -> "$45.50"
 */
export const formatPrice = (value, currency = 'USD') => {
    if (value === null || value === undefined) return '';

    const symbols = { 'USD': '$', 'EUR': '€', 'GBP': '£' };
    const symbol = symbols[currency] || '$';

    return `${symbol}${typeof value === 'number' ? value.toFixed(2) : value}`;
};

/**
 * Truncates long text with ellipsis
 * Example: "Very long chemical name...", 20 -> "Very long chemical..."
 */
export const truncateText = (text, maxLength = 50) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
};

/**
 * Formats SMILES string with line breaks for readability
 */
export const formatSMILES = (smiles, maxLineLength = 60) => {
    if (!smiles) return '';
    if (smiles.length <= maxLineLength) return smiles;

    const regex = new RegExp(`.{1,${maxLineLength}}`, 'g');
    return smiles.match(regex).join('\n');
};

/**
 * Gets color for risk level
 */
export const getRiskColor = (riskLevel) => {
    const level = riskLevel?.toLowerCase();

    const colors = {
        'low': 'text-green-400 bg-green-500/10 border-green-500/30',
        'medium': 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
        'high': 'text-red-400 bg-red-500/10 border-red-500/30',
        'critical': 'text-red-600 bg-red-600/20 border-red-600/40'
    };

    return colors[level] || 'text-slate-400 bg-slate-500/10 border-slate-500/30';
};

/**
 * Gets GHS hazard icon
 */
export const getGHSIcon = (hazardCode) => {
    // Simplified mapping - would expand for all GHS codes
    const icons = {
        'H2': '💥', // Explosive
        'H3': '☠️', // Toxic
        'H4': '⚠️', // Harmful/Irritant
        'default': '⚠️'
    };

    const prefix = hazardCode?.substring(0, 2);
    return icons[prefix] || icons['default'];
};
