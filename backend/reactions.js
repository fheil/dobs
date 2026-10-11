import db from './db.js';

export const REACTION_KINDS = ['shocked', 'help'];

const empty = () => ({
  ratingCounts: [0, 0, 0, 0, 0], // index 0 = 1 Stern ... index 4 = 5 Sterne
  myRating: null,
  shocked: [],                   // usernames
  myShocked: false,
  help: [],                      // usernames
  myHelp: false
});

// Ratings/reactions for many entries in three queries. Ids are passed as a
// JSON array so the list length isn't limited by SQLite's parameter cap.
export function reactionsFor(entryIds, userId) {
  const result = new Map(entryIds.map(id => [id, empty()]));
  if (!entryIds.length) return result;
  const ids = JSON.stringify(entryIds);

  for (const r of db.prepare(`
    SELECT entry_id, stars, count(*) AS n FROM entry_ratings
    WHERE entry_id IN (SELECT value FROM json_each(?)) GROUP BY entry_id, stars
  `).all(ids)) {
    result.get(r.entry_id).ratingCounts[r.stars - 1] = r.n;
  }

  for (const r of db.prepare(`
    SELECT entry_id, stars FROM entry_ratings
    WHERE user_id = ? AND entry_id IN (SELECT value FROM json_each(?))
  `).all(userId, ids)) {
    result.get(r.entry_id).myRating = r.stars;
  }

  for (const r of db.prepare(`
    SELECT x.entry_id, x.kind, x.user_id, u.username FROM entry_reactions x JOIN users u ON u.id = x.user_id
    WHERE x.entry_id IN (SELECT value FROM json_each(?)) ORDER BY u.username COLLATE NOCASE
  `).all(ids)) {
    const entry = result.get(r.entry_id);
    entry[r.kind].push(r.username);
    if (r.user_id === userId) entry[r.kind === 'shocked' ? 'myShocked' : 'myHelp'] = true;
  }

  return result;
}

export function withReactions(rows, userId) {
  const map = reactionsFor(rows.map(r => r.id), userId);
  return rows.map(r => ({ ...r, reactions: map.get(r.id) }));
}
