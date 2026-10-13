// ─── Control Flow Graph (CFG) Visualizer ──────────────────────────────────────
// Partitions Three-Address Code (TAC) into Basic Blocks & renders directed flow graphs.

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/**
 * Basic Block Partitioner:
 * Implements the standard Dragon Book compiler algorithm for partitioning instructions into basic blocks.
 */
export function buildCFG(instructions) {
  if (!instructions || instructions.length === 0) return { blocks: [], edges: [] };

  // Filter non-instruction comments except function boundaries
  const instrs = instructions.filter(s => s && !s.startsWith(';') || s.startsWith('func_'));

  if (instrs.length === 0) return { blocks: [], edges: [] };

  // 1. Identify leaders
  const isLeader = new Array(instrs.length).fill(false);
  isLeader[0] = true;

  // Map label names (e.g. "L1") to instruction index
  const labelIndexMap = new Map();
  instrs.forEach((inst, idx) => {
    const labelMatch = /^(\w+):$/.exec(inst.trim());
    if (labelMatch) {
      labelIndexMap.set(labelMatch[1], idx);
      isLeader[idx] = true;
    }
  });

  instrs.forEach((inst, idx) => {
    const trimmed = inst.trim();
    // Conditional or unconditional jumps
    if (/^(goto|if|if_false|return)\b/.test(trimmed)) {
      if (idx + 1 < instrs.length) {
        isLeader[idx + 1] = true; // Instruction following a jump is a leader
      }
      // Target of a jump is a leader
      const gotoMatch = /goto\s+(\w+)/.exec(trimmed);
      if (gotoMatch && labelIndexMap.has(gotoMatch[1])) {
        isLeader[labelIndexMap.get(gotoMatch[1])] = true;
      }
    }
  });

  // 2. Form basic blocks
  const blocks = [];
  let currentBlock = null;

  instrs.forEach((inst, idx) => {
    if (isLeader[idx] || !currentBlock) {
      if (currentBlock) blocks.push(currentBlock);
      const blockId = `B${blocks.length + 1}`;
      currentBlock = {
        id: blockId,
        startIndex: idx,
        instructions: [],
        label: /^(\w+):$/.exec(inst.trim()) ? /^(\w+):$/.exec(inst.trim())[1] : null,
        successors: []
      };
    }
    currentBlock.instructions.push({ text: inst, index: idx });
  });
  if (currentBlock) blocks.push(currentBlock);

  // Map label to block ID
  const labelBlockMap = new Map();
  blocks.forEach(b => {
    if (b.label) labelBlockMap.set(b.label, b.id);
  });

  // 3. Construct edges between blocks
  const edges = [];

  blocks.forEach((block, bIdx) => {
    const lastInstr = block.instructions[block.instructions.length - 1].text.trim();

    // Check jump targets
    if (/^return\b/.test(lastInstr)) {
      // Terminal block - exits function
      edges.push({ from: block.id, to: 'EXIT', type: 'exit', label: 'return' });
      return;
    }

    if (/^goto\s+(\w+)/.test(lastInstr)) {
      const targetLabel = /^goto\s+(\w+)/.exec(lastInstr)[1];
      const targetBlockId = labelBlockMap.get(targetLabel);
      if (targetBlockId) {
        const isBackEdge = parseInt(targetBlockId.slice(1)) <= parseInt(block.id.slice(1));
        edges.push({
          from: block.id,
          to: targetBlockId,
          type: isBackEdge ? 'loop' : 'jump',
          label: `goto ${targetLabel}`
        });
      }
      return;
    }

    if (/^(if|if_false)\s+(.+?)\s+goto\s+(\w+)/.test(lastInstr)) {
      const match = /^(if|if_false)\s+(.+?)\s+goto\s+(\w+)/.exec(lastInstr);
      const isIfFalse = match[1] === 'if_false';
      const cond = match[2];
      const targetLabel = match[3];
      const targetBlockId = labelBlockMap.get(targetLabel);

      // Branch taken edge
      if (targetBlockId) {
        const isBackEdge = parseInt(targetBlockId.slice(1)) <= parseInt(block.id.slice(1));
        edges.push({
          from: block.id,
          to: targetBlockId,
          type: isBackEdge ? 'loop' : 'branch',
          label: isIfFalse ? `False: !(${cond})` : `True: (${cond})`
        });
      }

      // Fall-through edge
      if (bIdx + 1 < blocks.length) {
        edges.push({
          from: block.id,
          to: blocks[bIdx + 1].id,
          type: 'fallthrough',
          label: isIfFalse ? `True` : `False`
        });
      }
      return;
    }

    // Default sequential fall-through
    if (bIdx + 1 < blocks.length) {
      edges.push({
        from: block.id,
        to: blocks[bIdx + 1].id,
        type: 'fallthrough',
        label: 'flow'
      });
    } else {
      edges.push({ from: block.id, to: 'EXIT', type: 'exit', label: 'end' });
    }
  });

  return { blocks, edges };
}

/**
 * Renders the Control Flow Graph container with interactive diagram and block breakdown.
 */
export function renderCFG(instructions, containerId = 'cfg-graph-container') {
  const { blocks, edges } = buildCFG(instructions);

  if (!blocks || blocks.length === 0) {
    return '<div class="empty-state">No instructions available to construct Control Flow Graph.</div>';
  }

  const blockCardsHtml = blocks.map(b => {
    const codeHtml = b.instructions.map(i => {
      const lineText = esc(i.text);
      const isLeaderLine = /^(goto|if|if_false|return)\b/.test(i.text.trim()) || i.text.trim().endsWith(':');
      return `<div class="cfg-code-line ${isLeaderLine ? 'highlight' : ''}">${lineText}</div>`;
    }).join('');

    const outEdges = edges.filter(e => e.from === b.id);
    const edgeBadges = outEdges.map(e => {
      const cls = e.type === 'loop' ? 'edge-loop' : e.type === 'branch' ? 'edge-branch' : 'edge-flow';
      return `<span class="cfg-badge ${cls}">${esc(e.to)}: ${esc(e.label)}</span>`;
    }).join(' ');

    return `
      <div class="cfg-block-card" id="cfg-block-${b.id}">
        <div class="cfg-block-header">
          <span class="cfg-block-name">${b.id}</span>
          ${b.label ? `<span class="cfg-label-tag">${esc(b.label)}</span>` : ''}
          <span class="cfg-instr-count">${b.instructions.length} instrs</span>
        </div>
        <div class="cfg-block-body">
          ${codeHtml}
        </div>
        <div class="cfg-block-footer">
          <span class="footer-title">Successors:</span> ${edgeBadges || '<span class="cfg-badge edge-flow">End</span>'}
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="cfg-wrapper" id="${containerId}">
      <div class="cfg-header">
        <div class="cfg-stats">
          <span class="stat-pill"><strong>${blocks.length}</strong> Basic Blocks</span>
          <span class="stat-pill"><strong>${edges.length}</strong> Directed Flow Edges</span>
          <span class="stat-pill"><span class="dot-green"></span> Branch Target</span>
          <span class="stat-pill"><span class="dot-purple"></span> Loop Back-Edge</span>
        </div>
      </div>

      <div class="cfg-layout-grid">
        ${blockCardsHtml}
      </div>

      <div class="explain" style="margin-top:14px;">
        <strong>Control Flow Graph (CFG)</strong> partitions TAC into maximal sequences of instructions with single entry and single exit points.
        Leaders mark block entry points; edges model conditional branches, unconditional jumps, and loop cycles.
      </div>
    </div>
  `;
}
