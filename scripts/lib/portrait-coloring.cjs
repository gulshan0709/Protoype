// Deterministic portrait assignment: people who appear on the same page must
// not share a portrait. Per (gender, look) group this is graph colouring —
// people are vertices, co-occurrence on a page is an edge weighted by the
// number of pages the pair shares, the group's pool ids are the colours.
// DSatur picks the next person (ties: most pages, most neighbours, name); the
// least-used free id keeps usage spread across the pool. A page with more
// people of a group than the pool has ids cannot be distinct: its extra people
// take the id that repeats on the fewest pages, and the page is reported. A
// final descent pass moves people to ids that repeat on fewer pages.

const byText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const groupKey = (gender, look) => look + "/" + gender;

/**
 * pool:    [{ id, gender, look }] (extra fields ignored)
 * persons: Map name → { gender?, look? }
 * pages:   [{ id, people: string[] }]
 * Returns { assignments: { name: id } sorted by name, groups, overfull, conflicts }.
 */
function assignPortraits(pool, persons, pages) {
  const ids = new Map();
  for (const { id, gender, look } of pool) {
    const key = groupKey(gender, look);
    if (!ids.has(key)) ids.set(key, []);
    ids.get(key).push(id);
  }
  for (const list of ids.values()) list.sort(byText);

  const members = new Map();
  for (const [name, p] of persons) {
    if (!p.gender) continue;
    const key = groupKey(p.gender, p.look ?? "international");
    if (!members.has(key)) members.set(key, []);
    members.get(key).push(name);
  }

  const assignments = {};
  const groups = {};
  const overfull = [];
  const conflicts = [];
  const sortedPages = [...pages].sort((a, b) => byText(a.id, b.id));
  for (const key of [...members.keys()].sort(byText)) {
    const names = members.get(key).sort(byText);
    const colours = ids.get(key) ?? [];
    const index = new Map(names.map((n, i) => [n, i]));
    const weights = names.map(() => new Map());
    const pageCount = names.map(() => 0);
    const groupPages = [];
    for (const page of sortedPages) {
      const on = [...new Set(page.people)].filter((n) => index.has(n)).map((n) => index.get(n));
      for (const a of on) pageCount[a]++;
      if (on.length < 2) continue;
      groupPages.push({ id: page.id, on });
      for (const a of on) for (const b of on) if (a !== b) weights[a].set(b, (weights[a].get(b) ?? 0) + 1);
    }
    const colour = colourGraph(weights, pageCount, colours.length);
    names.forEach((n, i) => {
      if (colour[i] >= 0) assignments[n] = colours[colour[i]];
    });

    let maxOnPage = 0;
    for (const { id, on } of groupPages) {
      maxOnPage = Math.max(maxOnPage, on.length);
      const distinct = new Set(on.map((i) => colour[i])).size;
      const repeats = on.length - distinct;
      if (on.length > colours.length)
        overfull.push({ page: id, group: key, people: on.length, pool: colours.length, repeats, minimum: on.length - colours.length });
      else if (repeats) conflicts.push({ page: id, group: key, people: on.length, pool: colours.length, repeats });
    }
    groups[key] = {
      people: names.length,
      pool: colours.length,
      coloursUsed: new Set(colour.filter((c) => c >= 0)).size,
      maxOnPage,
    };
  }
  const sorted = {};
  for (const name of Object.keys(assignments).sort(byText)) sorted[name] = assignments[name];
  return { assignments: sorted, groups, overfull, conflicts };
}

/**
 * DSatur with a fixed palette of k colours over a weighted graph
 * (weights[v]: Map neighbour → shared pages). Returns a colour index per
 * vertex (-1 when k = 0). Vertex order is the tie-break of last resort, so
 * callers pass vertices sorted by name.
 */
function colourGraph(weights, pageCount, k) {
  const n = weights.length;
  const colour = new Array(n).fill(-1);
  if (!k) return colour;
  // cost[v][c]: shared pages between v and its neighbours coloured c.
  const cost = weights.map(() => new Array(k).fill(0));
  const saturation = new Array(n).fill(0);
  const usage = new Array(k).fill(0);
  const degree = weights.map((w) => w.size);
  const before = (i, v) =>
    saturation[i] !== saturation[v]
      ? saturation[i] > saturation[v]
      : pageCount[i] !== pageCount[v]
        ? pageCount[i] > pageCount[v]
        : degree[i] > degree[v];
  for (let step = 0; step < n; step++) {
    let v = -1;
    for (let i = 0; i < n; i++) if (colour[i] < 0 && (v < 0 || before(i, v))) v = i;
    const c = cheapest(cost[v], usage);
    colour[v] = c;
    usage[c]++;
    for (const [u, w] of weights[v]) {
      if (colour[u] < 0 && cost[u][c] === 0) saturation[u]++;
      cost[u][c] += w;
    }
  }
  descend(colour, weights, cost, usage);
  return colour;
}

/** Free colour with the least use; when none is free, the one repeating on the fewest pages. */
function cheapest(costs, usage) {
  let best = 0;
  for (let c = 1; c < costs.length; c++)
    if (costs[c] < costs[best] || (costs[c] === costs[best] && usage[c] < usage[best])) best = c;
  return best;
}

/** Moves conflicting vertices to strictly cheaper colours until nothing improves. */
function descend(colour, weights, cost, usage) {
  for (let round = 0; round < 100; round++) {
    let moved = false;
    for (let v = 0; v < colour.length; v++) {
      const current = colour[v];
      if (!cost[v][current]) continue;
      const c = cheapest(cost[v], usage);
      if (cost[v][c] >= cost[v][current]) continue;
      colour[v] = c;
      usage[current]--;
      usage[c]++;
      for (const [u, w] of weights[v]) {
        cost[u][current] -= w;
        cost[u][c] += w;
      }
      moved = true;
    }
    if (!moved) return;
  }
}

module.exports = { assignPortraits, groupKey };
