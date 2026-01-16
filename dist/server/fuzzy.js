const normalize = (value) => value.trim().toLowerCase();
const levenshtein = (a, b) => {
    const requireRow = (row, index) => {
        if (!row) {
            throw new Error(`Levenshtein row ${index} is missing.`);
        }
        return row;
    };
    const requireCell = (row, index) => {
        const value = row[index];
        if (value === undefined) {
            throw new Error(`Levenshtein cell [${index}] is missing.`);
        }
        return value;
    };
    const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i += 1) {
        const row = requireRow(matrix[i], i);
        row[0] = i;
    }
    for (let j = 0; j <= b.length; j += 1) {
        const row = requireRow(matrix[0], 0);
        row[j] = j;
    }
    for (let i = 1; i <= a.length; i += 1) {
        for (let j = 1; j <= b.length; j += 1) {
            const row = requireRow(matrix[i], i);
            const prevRow = requireRow(matrix[i - 1], i - 1);
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            row[j] = Math.min(requireCell(prevRow, j) + 1, requireCell(row, j - 1) + 1, requireCell(prevRow, j - 1) + cost);
        }
    }
    return requireCell(requireRow(matrix[a.length], a.length), b.length);
};
export const similarityScore = (left, right) => {
    const a = normalize(left);
    const b = normalize(right);
    if (!a || !b) {
        return 0;
    }
    if (a === b) {
        return 1;
    }
    const distance = levenshtein(a, b);
    const maxLength = Math.max(a.length, b.length);
    return 1 - distance / maxLength;
};
