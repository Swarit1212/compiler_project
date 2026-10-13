// ─── Interactive Graphical AST Visualizer ─────────────────────────────────────
// Computes hierarchical layout, SVG rendering, zoom/pan, collapse/expand, and inspector.

const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );

/**
 * Normalizes any language's AST node into a uniform tree structure:
 * { id, label, category, details, children, collapsed }
 */
let _nodeIdSeq = 0;
export function normalizeAST(node) {
  _nodeIdSeq = 0;
  return toTree(node, "root");
}

function toTree(n, key = "") {
  if (n == null) return null;
  const id = `node-${++_nodeIdSeq}`;

  // Primitive value
  if (typeof n !== "object") {
    return {
      id,
      label: String(n),
      category: "literal",
      details: { value: n, key },
      children: [],
    };
  }

  // Array of nodes
  if (Array.isArray(n)) {
    const children = n
      .map((item, idx) => toTree(item, `[${idx}]`))
      .filter(Boolean);
    return {
      id,
      label: key || "List",
      category: "list",
      details: { count: n.length },
      children,
    };
  }

  const type = n.type || n.kind || (key ? `${key}` : "Node");
  const details = {};
  const children = [];

  // Extract primary display label
  let displayLabel = type;
  if (n.name) displayLabel += ` (${n.name})`;
  else if (n.value != null && typeof n.value !== "object")
    displayLabel += ` = ${n.value}`;
  else if (n.op) displayLabel += ` [${n.op}]`;
  else if (n.vtype) displayLabel += ` : ${n.vtype}`;
  else if (n.retType) displayLabel += ` -> ${n.retType}`;

  // Categorize for styling
  let category = "node";
  const tLower = type.toLowerCase();
  if (
    tLower.includes("decl") ||
    tLower.includes("func") ||
    tLower.includes("class") ||
    tLower.includes("interface")
  ) {
    category = "decl";
  } else if (
    tLower.includes("lit") ||
    tLower.includes("number") ||
    tLower.includes("string")
  ) {
    category = "literal";
  } else if (
    tLower.includes("op") ||
    tLower.includes("bin") ||
    tLower.includes("unary") ||
    tLower.includes("assign")
  ) {
    category = "op";
  } else if (
    tLower.includes("if") ||
    tLower.includes("while") ||
    tLower.includes("for") ||
    tLower.includes("return")
  ) {
    category = "control";
  } else if (
    tLower.includes("call") ||
    tLower.includes("member") ||
    tLower.includes("index")
  ) {
    category = "call";
  }

  // Separate properties into details vs child nodes
  for (const [k, v] of Object.entries(n)) {
    if (k === "toTextTree" || k === "parent") continue;
    if (v != null && typeof v === "object") {
      const childTree = toTree(v, k);
      if (childTree) children.push(childTree);
    } else {
      details[k] = v;
    }
  }

  return {
    id,
    label: displayLabel,
    nodeType: type,
    category,
    details,
    children,
    collapsed: false,
  };
}

/**
 * Computes (x, y) coordinates for all nodes in the tree.
 */
function layoutTree(
  root,
  config = { nodeWidth: 160, nodeHeight: 46, siblingGap: 24, levelGap: 70 },
) {
  let nextX = 20;

  function firstWalk(node, depth = 0) {
    node.y = depth * config.levelGap + 30;

    if (!node.children || node.children.length === 0 || node.collapsed) {
      node.x = nextX;
      nextX += config.nodeWidth + config.siblingGap;
      return node.x;
    }

    const childXs = node.children.map((c) => firstWalk(c, depth + 1));
    const midX = (childXs[0] + childXs[childXs.length - 1]) / 2;
    node.x = midX;
    nextX = Math.max(nextX, node.x + config.nodeWidth + config.siblingGap);
    return node.x;
  }

  firstWalk(root, 0);

  // Compute bounds
  let minX = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  function getBounds(node) {
    if (!node) return;
    minX = Math.min(minX, node.x);
    maxX = Math.max(maxX, node.x + config.nodeWidth);
    maxY = Math.max(maxY, node.y + config.nodeHeight);
    if (!node.collapsed && node.children) {
      node.children.forEach(getBounds);
    }
  }
  getBounds(root);

  return {
    width: Math.max(maxX + 40, 600),
    height: Math.max(maxY + 40, 300),
  };
}

/**
 * Renders the full interactive SVG tree component with Zoom, Pan, Node Inspector, and Collapse.
 */
export function renderASTDiagram(ast, containerId = "ast-graph-container") {
  if (!ast) return '<div class="empty-ast">No AST available to render.</div>';

  const root = normalizeAST(ast);
  if (!root)
    return '<div class="empty-ast">Could not build AST hierarchy.</div>';

  // Store in global window map for interactive onclick handlers
  window.__ACTIVE_AST_ROOT = root;
  setTimeout(() => centerASTViewport(containerId), 0);

  return `
    <div class="ast-diagram-wrapper" id="${containerId}">
      <!-- Toolbar -->
      <div class="ast-toolbar">
        <div class="ast-toolbar-left">
          <span class="ast-stat"><span class="dot"></span> Interactive Tree Diagram</span>
        </div>
        <div class="ast-toolbar-right">
          <button class="btn btn-sm" onclick="window.astZoomIn('${containerId}')" title="Zoom In">➕ Zoom In</button>
          <button class="btn btn-sm" onclick="window.astZoomOut('${containerId}')" title="Zoom Out">➖ Zoom Out</button>
          <button class="btn btn-sm" onclick="window.astResetZoom('${containerId}')" title="Fit to View">⟲ Reset</button>
        </div>
      </div>

      <!-- Viewport & Canvas -->
      <div class="ast-viewport" id="${containerId}-viewport">
        <div class="ast-canvas" id="${containerId}-canvas">
          ${generateSVG(root)}
        </div>
      </div>

      <!-- Node Inspector Panel -->
      <div class="ast-inspector" id="${containerId}-inspector" style="display:none;">
        <div class="inspector-head">
          <h4 id="${containerId}-insp-title">Node Inspector</h4>
          <button class="close-btn" onclick="document.getElementById('${containerId}-inspector').style.display='none'">✕</button>
        </div>
        <div class="inspector-body" id="${containerId}-insp-content"></div>
      </div>
    </div>
  `;
}

function centerASTViewport(id) {
  const viewport = document.getElementById(`${id}-viewport`);
  const canvas = document.getElementById(`${id}-canvas`);
  if (!viewport || !canvas) return;

  viewport.scrollLeft = Math.max(
    0,
    (canvas.scrollWidth - viewport.clientWidth) / 2,
  );
  viewport.scrollTop = 0;
}

function generateSVG(root) {
  const nodeW = 160;
  const nodeH = 44;
  const bounds = layoutTree(root, {
    nodeWidth: nodeW,
    nodeHeight: nodeH,
    siblingGap: 28,
    levelGap: 75,
  });

  let linksHtml = "";
  let nodesHtml = "";

  function traverse(node) {
    if (!node) return;

    // Draw lines to children if not collapsed
    if (!node.collapsed && node.children && node.children.length > 0) {
      node.children.forEach((child) => {
        const x1 = node.x + nodeW / 2;
        const y1 = node.y + nodeH;
        const x2 = child.x + nodeW / 2;
        const y2 = child.y;
        const midY = (y1 + y2) / 2;

        linksHtml += `<path class="ast-link" d="M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}" />`;
        traverse(child);
      });
    }

    const catClass = `cat-${node.category || "node"}`;
    const hasChildren = node.children && node.children.length > 0;
    const collapseBadge = hasChildren
      ? `
      <circle cx="${nodeW - 12}" cy="12" r="7" class="collapse-btn" onclick="event.stopPropagation(); window.toggleASTNode('${node.id}')" />
      <text x="${nodeW - 12}" y="15" class="collapse-icon">${node.collapsed ? "+" : "−"}</text>
    `
      : "";

    nodesHtml += `
      <g class="ast-node ${catClass} ${node.collapsed ? "is-collapsed" : ""}"
         transform="translate(${node.x}, ${node.y})"
         onclick="window.inspectASTNode('${node.id}')">
        <rect width="${nodeW}" height="${nodeH}" rx="6" class="node-box" />
        <text x="12" y="26" class="node-title">${esc(truncate(node.label, 19))}</text>
        ${collapseBadge}
      </g>
    `;
  }

  traverse(root);

  return `
    <svg width="${bounds.width}" height="${bounds.height}" viewBox="0 0 ${bounds.width} ${bounds.height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="node-shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.35"/>
        </filter>
      </defs>
      <g class="ast-links-layer">${linksHtml}</g>
      <g class="ast-nodes-layer">${nodesHtml}</g>
    </svg>
  `;
}

function truncate(str, max = 18) {
  if (!str) return "";
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

// ── Attach Global Interactive Handlers to Window ──────────────────────────────
if (typeof window !== "undefined") {
  window._astZoomLevels = window._astZoomLevels || {};

  window.astZoomIn = (id) => {
    window._astZoomLevels[id] = (window._astZoomLevels[id] || 1) * 1.2;
    applyASTTransform(id);
  };

  window.astZoomOut = (id) => {
    window._astZoomLevels[id] = Math.max(
      0.3,
      (window._astZoomLevels[id] || 1) / 1.2,
    );
    applyASTTransform(id);
  };

  window.astResetZoom = (id) => {
    window._astZoomLevels[id] = 1;
    applyASTTransform(id);
  };

  function applyASTTransform(id) {
    const canvas = document.getElementById(`${id}-canvas`);
    if (canvas) {
      const zoom = window._astZoomLevels[id] || 1;
      canvas.style.transform = `scale(${zoom})`;
      canvas.style.transformOrigin = "top left";
    }
  }

  window.inspectASTNode = (nodeId) => {
    if (!window.__ACTIVE_AST_ROOT) return;
    const target = findNode(window.__ACTIVE_AST_ROOT, nodeId);
    if (!target) return;

    const insp = document.querySelector(".ast-inspector");
    const title = document.querySelector('[id$="-insp-title"]');
    const content = document.querySelector('[id$="-insp-content"]');
    if (!insp || !title || !content) return;

    title.textContent = `Node: ${target.nodeType || target.label}`;

    let rows = `
      <div class="insp-row"><span class="k">Category:</span> <span class="v badge-${target.category}">${target.category}</span></div>
      <div class="insp-row"><span class="k">Full Label:</span> <span class="v">${esc(target.label)}</span></div>
      <div class="insp-row"><span class="k">Child Nodes:</span> <span class="v">${target.children ? target.children.length : 0}</span></div>
    `;

    if (target.details) {
      for (const [k, v] of Object.entries(target.details)) {
        rows += `<div class="insp-row"><span class="k">${esc(k)}:</span> <span class="v">${esc(typeof v === "object" ? JSON.stringify(v) : v)}</span></div>`;
      }
    }

    content.innerHTML = rows;
    insp.style.display = "block";
  };

  window.toggleASTNode = (nodeId) => {
    if (!window.__ACTIVE_AST_ROOT) return;
    const target = findNode(window.__ACTIVE_AST_ROOT, nodeId);
    if (!target || !target.children || target.children.length === 0) return;

    target.collapsed = !target.collapsed;
    const canvas = document.getElementById("ast-graph-container-canvas");
    if (canvas) {
      canvas.innerHTML = generateSVG(window.__ACTIVE_AST_ROOT);
    }
  };

  function findNode(root, id) {
    if (!root) return null;
    if (root.id === id) return root;
    for (const child of root.children || []) {
      const found = findNode(child, id);
      if (found) return found;
    }
    return null;
  }
}
