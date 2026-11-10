function tokenize(text) {
  return String(text || '').toLowerCase().match(/[\p{L}\p{N}_-]+/gu) || [];
}

function buildBm25Index(chunks) {
  const documents = chunks.map(chunk => {
    const terms = tokenize(chunk.text);
    const frequencies = new Map();
    for (const term of terms) {
      frequencies.set(term, (frequencies.get(term) || 0) + 1);
    }
    return { chunk, terms: frequencies, length: terms.length };
  });

  const documentFrequency = new Map();
  for (const document of documents) {
    for (const term of document.terms.keys()) {
      documentFrequency.set(term, (documentFrequency.get(term) || 0) + 1);
    }
  }

  return {
    documents,
    documentFrequency,
    averageLength: documents.length
      ? documents.reduce((sum, document) => sum + document.length, 0) / documents.length
      : 0
  };
}

function searchBm25(index, query, limit, { k1 = 1.2, b = 0.75 } = {}) {
  const queryTerms = tokenize(query);
  if (!index || !queryTerms.length || !index.documents.length || limit <= 0) return [];

  const documentCount = index.documents.length;
  const scored = [];
  for (const document of index.documents) {
    let score = 0;
    for (const term of queryTerms) {
      const termFrequency = document.terms.get(term) || 0;
      if (!termFrequency) continue;

      const frequency = index.documentFrequency.get(term) || 0;
      const inverseDocumentFrequency = Math.log(
        1 + (documentCount - frequency + 0.5) / (frequency + 0.5)
      );
      const lengthNormalization = index.averageLength
        ? 1 - b + b * document.length / index.averageLength
        : 1;
      score += inverseDocumentFrequency *
        (termFrequency * (k1 + 1)) /
        (termFrequency + k1 * lengthNormalization);
    }

    if (score > 0) scored.push({ ...document.chunk, bm25Score: score });
  }

  return scored
    .sort((left, right) => right.bm25Score - left.bm25Score)
    .slice(0, limit);
}

function reciprocalRankFusion(rankings, limit, { constant = 60 } = {}) {
  const fused = new Map();
  let encounter = 0;

  rankings.forEach((ranking, rankingIndex) => {
    ranking.forEach((item, index) => {
      const id = item.chunkId;
      if (!id) return;

      let entry = fused.get(id);
      if (!entry) {
        entry = {
          ...item,
          rrfScore: 0,
          retrievalSources: [],
          encounter: encounter++
        };
        fused.set(id, entry);
      } else {
        entry = Object.assign(entry, item);
      }

      entry.rrfScore += 1 / (constant + index + 1);
      entry.retrievalSources.push({ retriever: rankingIndex, rank: index + 1 });
    });
  });

  return [...fused.values()]
    .sort((left, right) => right.rrfScore - left.rrfScore || left.encounter - right.encounter)
    .slice(0, limit)
    .map(({ encounter: _encounter, ...item }) => item);
}

module.exports = {
  buildBm25Index,
  reciprocalRankFusion,
  searchBm25,
  tokenize
};
