export const formatINR = (value: number | undefined | null, decimals = 0): string => {
    if (value == null || isNaN(value)) return '\u20b90';
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(value);
};

export const formatIN = (value: number | undefined | null, decimals = 0): string => {
    if (value == null || isNaN(value)) return '0';
    return new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(value);
};

export const formatPct = (value: number | null | undefined, decimals = 1): string => {
    if (value == null) return '\u2014';
    return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
};

export const formatMonth = (dateStr: string): string => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
};

export const formatDate = (dateStr: string): string => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric'
    });
};

export const formatHours = (hours: number): string => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
};

export const formatKwh = (kwh: number | null | undefined): string => {
    if (kwh == null) return '\u2014';
    if (kwh >= 1000) return `${(kwh / 1000).toFixed(1)} MWh`;
    return `${Math.round(kwh)} kWh`;
};

export const formatCO2 = (kg: number | null | undefined): string => {
    if (kg == null) return '\u2014';
    if (kg >= 1000) return `${(kg / 1000).toFixed(2)} tCO2e`;
    return `${Math.round(kg)} kg CO2e`;
};

export const formatRank = (n: number): string => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export const formatINRShort = (v: number): string => {
    if (v >= 1e7) return `\u20b9${(v / 1e7).toFixed(1)}Cr`;
    if (v >= 1e5) return `\u20b9${(v / 1e5).toFixed(1)}L`;
    if (v >= 1e3) return `\u20b9${(v / 1e3).toFixed(0)}K`;
    return formatINR(v);
};

export const getBuildingTypeUnit = (buildingType: string): string => {
    switch (buildingType) {
        case 'residential_society': return 'kWh/res';
        case 'office': return 'kWh/employee';
        case 'school': return 'kWh/student';
        case 'hospital': return 'kWh/bed';
        case 'hotel': return 'kWh/room';
        case 'factory': return 'kWh/sqm';
        case 'mall': return 'kWh/sqm';
        default: return 'kWh/unit';
    }
};
