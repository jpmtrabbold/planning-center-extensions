const normalize = (value) => value.trim().toLowerCase();

const levenshtein = (a, b) => {
  const matrix = Array.from({ length: a.length + 1 }, () => []);
  for (let i = 0; i <= a.length; i += 1) {
    matrix[i][0] = i;
  }
  for (let j = 0; j <= b.length; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
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
