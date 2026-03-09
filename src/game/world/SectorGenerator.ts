import type { SectorNode } from '../data/SectorNode';
import type { SectorTemplate } from '../data/SectorTemplate';

/**
 * Builds a directed acyclic graph (DAG) representing 8 sector levels.
 *
 * Shape:
 *   Level 1 : 1 node  (starting sector)
 *   Levels 2-7 : 2–3 nodes per level  (randomised)
 *   Level 8 : 1 node  (BOSS)
 *
 * Every node in level N connects forward to 1–2 nodes in level N+1.
 * Every node in level N+1 is reachable from at least one node in level N.
 */
export class SectorGenerator {
  static generate(templates: SectorTemplate[]): SectorNode[] {
    const normal = templates.filter((t) => t.type !== 'BOSS');
    const boss   = templates.find((t) => t.type === 'BOSS') ?? templates[templates.length - 1];

    // Node counts per level (indices 0-7 = levels 1-8).
    const counts = [1, 2, 3, 3, 2, 3, 2, 1];

    let idCounter = 0;
    const allNodes: SectorNode[] = [];
    const byLevel: SectorNode[][] = [];

    // ── Create nodes ──────────────────────────────────────────────────────
    for (let lv = 1; lv <= 8; lv++) {
      const count = counts[lv - 1];
      const levelNodes: SectorNode[] = [];
      for (let i = 0; i < count; i++) {
        const tmpl = lv === 8
          ? boss
          : normal[Math.floor(Math.random() * normal.length)];
        levelNodes.push({ id: idCounter++, level: lv, sectorTemplateId: tmpl.id, nextNodeIds: [] });
      }
      byLevel.push(levelNodes);
      allNodes.push(...levelNodes);
    }

    // ── Connect levels ────────────────────────────────────────────────────
    for (let l = 0; l < byLevel.length - 1; l++) {
      const cur  = byLevel[l];
      const next = byLevel[l + 1];

      // Guarantee every next-level node is reachable from at least one current node.
      for (const nxt of next) {
        const src = cur[Math.floor(Math.random() * cur.length)];
        if (!src.nextNodeIds.includes(nxt.id)) src.nextNodeIds.push(nxt.id);
      }

      // Guarantee every current-level node connects forward.
      for (const src of cur) {
        if (src.nextNodeIds.length === 0) {
          src.nextNodeIds.push(next[Math.floor(Math.random() * next.length)].id);
        }
        // ~40 % chance to add a second forward connection.
        if (next.length > 1 && Math.random() < 0.4) {
          const avail = next.filter((n) => !src.nextNodeIds.includes(n.id));
          if (avail.length > 0) {
            src.nextNodeIds.push(avail[Math.floor(Math.random() * avail.length)].id);
          }
        }
      }
    }

    return allNodes;
  }
}
