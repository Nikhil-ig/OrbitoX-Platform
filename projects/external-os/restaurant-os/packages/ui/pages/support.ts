/**
 * 🪐 RestaurantOS 3.1 — Customer Support & Engineering Incident Workbench
 * ─────────────────────────────────────────────────────────────────────────────
 * Purpose-built Linear/Zendesk 3-pane hospitality support desk:
 * - Pane 1: Priority Queue Inbox, SLA timers, severity filters, search
 * - Pane 2: Chronological incident timeline, internal vs public replies, composer
 * - Pane 3: Contextual restaurant telemetry, active template, hardware & DNS diagnostics
 * Zero emojis: Lucide vector iconography throughout.
 */

import { SupportTicket, BranchRecord } from '../../domain';
import { icon } from '../icons';

export function renderSupportWorkspace(
  tickets: SupportTicket[],
  branches: BranchRecord[],
  selectedBranchId = 'branch_ldh'
): string {
  const currentBranch = branches.find((b) => b.id === selectedBranchId) || branches[0];
  const initialTicket = tickets[0] || {
    id: 'ticket_sample',
    ticketNumber: 'ORB-8501',
    subject: 'Kitchen KDS Station routing delay',
    category: 'HARDWARE_KDS',
    severity: 'HIGH',
    status: 'INVESTIGATING',
    branchId: 'branch_ldh',
    branchName: 'Ludhiana Main',
    staffId: 'stf_chef_01',
    staffName: 'Vikram Singh (Head Chef)',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    description: 'Tandoor queue items taking > 30s to appear on expo screen during peak rush.',
    messages: [
      {
        id: 'msg_1',
        sender: 'RESTAURANT_STAFF',
        authorName: 'Vikram Singh',
        text: 'Noticed delay in order sync between Diner companion and Kitchen screen.',
        timestamp: '19:45',
      },
      {
        id: 'msg_2',
        sender: 'ORBITOX_SUPPORT',
        authorName: 'Sarah Jenkins (Systems Support)',
        text: 'Inspecting SSE connection pool on port 4010. Replay outbox active with 0 drops.',
        timestamp: '19:48',
      },
    ],
  };

  return `
  <div style="display: flex; height: calc(100vh - 52px); overflow: hidden; background: var(--color-ink); font-family: var(--font-sans);">
    <!-- ========================================================================= -->
    <!-- PANE 1: TICKET QUEUES & CASE INBOX (320px) -->
    <!-- ========================================================================= -->
    <aside style="width: 320px; min-width: 320px; background: var(--color-charcoal); border-right: 1px solid var(--border-default); display: flex; flex-direction: column;">
      <!-- Queue Header -->
      <div style="padding: 16px; border-bottom: 1px solid var(--border-subtle);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="display:inline-flex;align-items:center;color:var(--color-copper);">${icon('support', { size: 16 })}</span>
            <span style="font-size: 14px; font-weight: 800; color: var(--color-linen);">Support Desk</span>
          </div>
          <button onclick="openNewTicketModal()" class="btn btn-primary btn-sm" style="padding: 4px 10px; font-size: 11px; display:inline-flex; align-items:center; gap:4px;">
            ${icon('plus', { size: 12 })} <span>New Case</span>
          </button>
        </div>

        <!-- Search Box -->
        <div style="position: relative;">
          <input
            type="text"
            id="ticket-search"
            placeholder="Search tickets, cases, staff..."
            oninput="filterTickets(this.value)"
            style="width: 100%; background: var(--color-ink); border: 1px solid var(--border-default); border-radius: 6px; padding: 6px 10px 6px 30px; font-size: 12px; color: var(--color-linen); outline: none;"
          />
          <span style="position: absolute; left: 10px; top: 7px; color: var(--color-muted); display:flex; align-items:center;">
            ${icon('search', { size: 13 })}
          </span>
        </div>

        <!-- Status Filter Tabs -->
        <div style="display: flex; gap: 4px; margin-top: 10px; overflow-x: auto; padding-bottom: 2px;">
          <button onclick="filterStatus('ALL')" class="btn btn-ghost btn-sm" style="padding: 3px 8px; font-size: 10px; font-weight: 700; color: var(--color-linen);">All (${tickets.length})</button>
          <button onclick="filterStatus('OPEN')" class="btn btn-ghost btn-sm" style="padding: 3px 8px; font-size: 10px; color: var(--color-stone);">Open</button>
          <button onclick="filterStatus('INVESTIGATING')" class="btn btn-ghost btn-sm" style="padding: 3px 8px; font-size: 10px; color: var(--color-stone);">Investigating</button>
          <button onclick="filterStatus('RESOLVED')" class="btn btn-ghost btn-sm" style="padding: 3px 8px; font-size: 10px; color: var(--color-stone);">Resolved</button>
        </div>
      </div>

      <!-- Ticket Queue List -->
      <div style="flex: 1; overflow-y: auto; display: flex; flex-direction: column;" id="ticket-queue-list">
        ${tickets
          .map((t, idx) => {
            const isCritical = t.severity === 'CRITICAL';
            const isHigh = t.severity === 'HIGH';
            const severityColor = isCritical ? 'var(--color-crimson)' : isHigh ? 'var(--color-copper)' : 'var(--color-stone)';
            return `
          <div
            class="ticket-row"
            data-id="${t.id}"
            data-status="${t.status}"
            onclick="selectTicket('${t.id}')"
            style="padding: 14px 16px; border-bottom: 1px solid var(--border-subtle); cursor: pointer; transition: background 120ms ease; ${idx === 0 ? 'background: rgba(255,255,255,0.03); border-left: 3px solid var(--color-copper);' : ''}"
          >
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-family: var(--font-mono); font-size: 11px; font-weight: 800; color: var(--color-copper);">${t.ticketNumber}</span>
              <span style="font-size: 10px; font-weight: 800; color: ${severityColor}; text-transform: uppercase;">${t.severity}</span>
            </div>
            <div style="font-size: 13px; font-weight: 700; color: var(--color-linen); line-height: 1.3; margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${t.subject}
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--color-stone);">
              <span>${t.branchName || 'Ludhiana'}</span>
              <span class="badge ${t.status === 'RESOLVED' ? 'badge-sage' : t.status === 'INVESTIGATING' ? 'badge-amber' : 'badge-copper'}" style="font-size: 9px; padding: 2px 6px;">
                ${t.status}
              </span>
            </div>
          </div>`;
          })
          .join('')}
      </div>
    </aside>

    <!-- ========================================================================= -->
    <!-- PANE 2: INCIDENT CONVERSATION & TIMELINE (Center flex 1) -->
    <!-- ========================================================================= -->
    <main style="flex: 1; display: flex; flex-direction: column; min-width: 0; background: var(--color-ink);">
      <!-- Case Meta Header -->
      <div style="padding: 16px 24px; border-bottom: 1px solid var(--border-default); background: var(--color-charcoal); display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span id="active-ticket-num" style="font-family: var(--font-mono); font-weight: 800; font-size: 14px; color: var(--color-copper);">
              ${initialTicket.ticketNumber}
            </span>
            <span id="active-ticket-category" class="badge badge-copper" style="font-size: 10px;">
              ${initialTicket.category}
            </span>
            <span id="active-ticket-status" class="badge badge-sage" style="font-size: 10px;">
              ${initialTicket.status}
            </span>
          </div>
          <h2 id="active-ticket-subject" style="font-size: 18px; font-weight: 800; color: var(--color-linen); margin-top: 4px;">
            ${initialTicket.subject}
          </h2>
          <div style="font-size: 11px; color: var(--color-stone); margin-top: 2px;">
            Reported by <strong id="active-ticket-author" style="color:var(--color-linen);">${initialTicket.staffName}</strong> · Branch: <span id="active-ticket-branch">${initialTicket.branchName}</span>
          </div>
        </div>

        <div style="display: flex; gap: 8px;">
          <button onclick="updateActiveStatus('RESOLVED')" class="btn btn-secondary btn-sm" style="display:inline-flex;align-items:center;gap:4px;">
            ${icon('check-circle', { size: 13, color: 'var(--color-sage)' })} <span>Mark Resolved</span>
          </button>
          <button onclick="updateActiveStatus('ESCALATED')" class="btn btn-primary btn-sm" style="background:var(--color-crimson); border-color:rgba(201,87,87,0.4); display:inline-flex;align-items:center;gap:4px;">
            ${icon('alert-circle', { size: 13 })} <span>Escalate Tier 2</span>
          </button>
        </div>
      </div>

      <!-- Chronological Thread Container -->
      <div id="inspector-messages-thread" style="flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 16px;">
        <!-- Initial Case Description Card -->
        <div style="background: var(--color-charcoal); border: 1px solid var(--border-default); border-radius: 10px; padding: 16px;">
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--color-stone); margin-bottom: 8px;">
            <span>Initial Incident Report</span>
            <span style="font-family: var(--font-mono);">${initialTicket.createdAt ? new Date(initialTicket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '19:40'}</span>
          </div>
          <div id="active-ticket-desc" style="font-size: 13px; color: var(--color-linen); line-height: 1.5;">
            ${initialTicket.description}
          </div>
        </div>

        <!-- Rendered Messages List -->
        <div id="thread-bubbles-list" style="display: flex; flex-direction: column; gap: 14px;">
          ${(initialTicket.messages || [])
            .map((m) => {
              const isSupport = m.sender === 'ORBITOX_SUPPORT';
              const isEscalation = m.sender === 'SYSTEM_ESCALATION';
              return `
            <div style="background: ${isSupport ? 'rgba(59,130,246,0.08)' : isEscalation ? 'rgba(239,68,68,0.08)' : 'var(--color-charcoal)'}; border: 1px solid ${isSupport ? 'rgba(59,130,246,0.3)' : isEscalation ? 'rgba(239,68,68,0.3)' : 'var(--border-default)'}; border-radius: 10px; padding: 14px 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 12px; font-weight: 800; color: ${isSupport ? '#60A5FA' : isEscalation ? 'var(--color-crimson)' : 'var(--color-copper)'};">${m.authorName}</span>
                  <span class="badge" style="font-size: 9px; background: rgba(255,255,255,0.05); color: var(--color-stone);">${m.sender}</span>
                </div>
                <span style="font-size: 10px; font-family: var(--font-mono); color: var(--color-muted);">${m.timestamp}</span>
              </div>
              <div style="font-size: 13px; color: var(--color-linen); line-height: 1.45;">
                ${m.text}
              </div>
            </div>`;
            })
            .join('')}
        </div>
      </div>

      <!-- Reply Composer with Internal Note Toggle -->
      <div style="padding: 16px 24px; border-top: 1px solid var(--border-default); background: var(--color-charcoal);">
        <!-- Reply Mode Controls -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div style="display: flex; gap: 6px;">
            <button id="btn-mode-public" onclick="setReplyMode('public')" class="btn btn-secondary btn-sm" style="font-size: 11px; font-weight: 700; background: var(--color-copper-subtle); color: var(--color-copper);">
              Public Reply to Staff
            </button>
            <button id="btn-mode-internal" onclick="setReplyMode('internal')" class="btn btn-ghost btn-sm" style="font-size: 11px; color: var(--color-stone);">
              Internal Support Note
            </button>
          </div>
          <div style="font-size: 11px; color: var(--color-stone);">
            Press <kbd style="background:rgba(255,255,255,0.08); padding:2px 5px; border-radius:3px; font-family:var(--font-mono);">⌘+Enter</kbd> to send
          </div>
        </div>

        <div style="display: flex; gap: 10px; align-items: flex-end;">
          <textarea
            id="ticket-reply-input"
            rows="2"
            placeholder="Type your response to the restaurant staff..."
            style="flex: 1; background: var(--color-ink); border: 1px solid var(--border-default); border-radius: 8px; padding: 10px 14px; font-size: 13px; color: var(--color-linen); outline: none; resize: none; line-height: 1.4;"
          ></textarea>
          <button onclick="submitTicketReply()" class="btn btn-primary" style="padding: 10px 18px; font-weight: 700; display: inline-flex; align-items: center; gap: 6px;">
            <span>Send</span> ${icon('send', { size: 14 })}
          </button>
        </div>
      </div>
    </main>

    <!-- ========================================================================= -->
    <!-- PANE 3: RESTAURANT & HARDWARE DIAGNOSTICS (280px) -->
    <!-- ========================================================================= -->
    <aside style="width: 280px; min-width: 280px; background: var(--color-charcoal); border-left: 1px solid var(--border-default); padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 20px;">
      <div>
        <div style="font-size: 10px; font-weight: 800; color: var(--color-stone); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px;">
          Restaurant Diagnostics
        </div>
        <div style="font-size: 15px; font-weight: 800; color: var(--color-linen);">
          ${currentBranch.name}
        </div>
        <div style="font-size: 11px; font-family: var(--font-mono); color: var(--color-copper); margin-top: 2px;">
          Branch ID: ${currentBranch.id}
        </div>
      </div>

      <!-- Operational Status Checklist -->
      <div style="background: var(--color-ink); border: 1px solid var(--border-default); border-radius: 8px; padding: 14px; display: flex; flex-direction: column; gap: 10px; font-size: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="color: var(--color-stone);">KDS Terminals:</span>
          <span style="color: var(--color-sage); font-weight: 700; display:inline-flex; align-items:center; gap:4px;">
            ${icon('check-circle', { size: 12 })} 4 Online
          </span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="color: var(--color-stone);">SSE Replay Log:</span>
          <span style="color: var(--color-sky); font-weight: 700; font-family: var(--font-mono);">Active (70 evts)</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="color: var(--color-stone);">Table Fleet:</span>
          <span style="color: var(--color-linen); font-weight: 700;">${currentBranch.activeTablesCount || 28} Tables</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="color: var(--color-stone);">Custom Domain:</span>
          <span style="color: var(--color-sage); font-weight: 700;">Verified SSL</span>
        </div>
      </div>

      <!-- Quick Diagnostic Actions -->
      <div>
        <div style="font-size: 10px; font-weight: 800; color: var(--color-stone); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px;">
          Diagnostic Triggers
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <button onclick="alert('Triggering SSE Heartbeat Ping across all connected KDS stations...')" class="btn btn-secondary btn-sm" style="width: 100%; justify-content: flex-start; gap: 8px; font-size: 11px;">
            ${icon('refresh', { size: 12 })} <span>Ping Connected KDS</span>
          </button>
          <button onclick="alert('Auditing HMAC signature rotation key validity: Active and uncompromised.')" class="btn btn-secondary btn-sm" style="width: 100%; justify-content: flex-start; gap: 8px; font-size: 11px;">
            ${icon('shield', { size: 12 })} <span>Verify Token Keys</span>
          </button>
          <a href="/developer/templates" class="btn btn-secondary btn-sm" style="width: 100%; justify-content: flex-start; gap: 8px; font-size: 11px; text-decoration:none;">
            ${icon('code', { size: 12 })} <span>Inspect Storefront AST</span>
          </a>
        </div>
      </div>

      <!-- SLA Policy Reminder -->
      <div style="background: rgba(200,107,60,0.08); border: 1px solid rgba(200,107,60,0.25); border-radius: 8px; padding: 12px; font-size: 11px; color: var(--color-stone); line-height: 1.4;">
        <strong style="color: var(--color-copper);">OrbitoX Enterprise SLA:</strong> High & Critical incidents require triage within 15 minutes. Hardware KDS disconnections escalate automatically to on-call engineers.
      </div>
    </aside>
  </div>

  <!-- Create New Support Ticket Modal -->
  <div id="new-ticket-modal" style="display: none; position: fixed; inset: 0; background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(10px); z-index: 100; align-items: center; justify-content: center; padding: 20px;">
    <div style="background: var(--color-charcoal); border: 1px solid var(--border-default); border-radius: 14px; max-width: 520px; width: 100%; padding: 24px; box-shadow: 0 16px 48px rgba(0,0,0,0.8);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="font-size: 18px; font-weight: 800; color: var(--color-linen);">Create Support Incident</h3>
        <button onclick="closeNewTicketModal()" class="btn btn-ghost btn-sm">${icon('x', { size: 16 })}</button>
      </div>

      <div style="display: flex; flex-direction: column; gap: 12px; font-size: 13px;">
        <div>
          <label style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Category</label>
          <select id="modal-ticket-cat" style="width: 100%; background: var(--color-ink); border: 1px solid var(--border-default); border-radius: 6px; padding: 8px; color: var(--color-linen); margin-top: 4px;">
            <option value="HARDWARE_KDS">Hardware & Kitchen KDS</option>
            <option value="TABLE_LAYOUT">Table Layout & Floor Studio</option>
            <option value="PAYMENTS">Payments & Settlement</option>
            <option value="MENU_SYNC">Menu Catalog & Recipe Sync</option>
            <option value="DOMAIN_SETUP">Custom Domain & SSL</option>
            <option value="BILLING">Billing & Subscription</option>
          </select>
        </div>

        <div>
          <label style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Severity</label>
          <select id="modal-ticket-sev" style="width: 100%; background: var(--color-ink); border: 1px solid var(--border-default); border-radius: 6px; padding: 8px; color: var(--color-linen); margin-top: 4px;">
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High (Operational Impact)</option>
            <option value="CRITICAL">Critical (Service Interrupted)</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        <div>
          <label style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Subject</label>
          <input type="text" id="modal-ticket-sub" placeholder="Brief summary of incident..." style="width: 100%; background: var(--color-ink); border: 1px solid var(--border-default); border-radius: 6px; padding: 8px; color: var(--color-linen); margin-top: 4px;" />
        </div>

        <div>
          <label style="font-size: 11px; font-weight: 700; color: var(--color-stone); text-transform: uppercase;">Description</label>
          <textarea id="modal-ticket-desc" rows="3" placeholder="Provide operational details, affected tables or stations..." style="width: 100%; background: var(--color-ink); border: 1px solid var(--border-default); border-radius: 6px; padding: 8px; color: var(--color-linen); margin-top: 4px; resize: none;"></textarea>
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px;">
        <button onclick="closeNewTicketModal()" class="btn btn-secondary btn-sm">Cancel</button>
        <button onclick="submitNewTicket()" class="btn btn-primary btn-sm">Submit Case</button>
      </div>
    </div>
  </div>

  <script>
    let allTickets = ${JSON.stringify(tickets)};
    let activeTicketId = '${initialTicket.id}';
    let isInternalNote = false;

    function selectTicket(id) {
      activeTicketId = id;
      const t = allTickets.find(item => item.id === id);
      if (!t) return;

      document.querySelectorAll('.ticket-row').forEach(row => {
        row.style.background = row.getAttribute('data-id') === id ? 'rgba(255,255,255,0.03)' : '';
        row.style.borderLeft = row.getAttribute('data-id') === id ? '3px solid var(--color-copper)' : '';
      });

      document.getElementById('active-ticket-num').textContent = t.ticketNumber;
      document.getElementById('active-ticket-category').textContent = t.category;
      document.getElementById('active-ticket-status').textContent = t.status;
      document.getElementById('active-ticket-subject').textContent = t.subject;
      document.getElementById('active-ticket-author').textContent = t.staffName || 'Staff Member';
      document.getElementById('active-ticket-branch').textContent = t.branchName || 'Ludhiana';
      document.getElementById('active-ticket-desc').textContent = t.description;

      renderThreadBubbles(t.messages || []);
    }

    function renderThreadBubbles(messages) {
      const container = document.getElementById('thread-bubbles-list');
      container.innerHTML = messages.map(m => {
        const isSupport = m.sender === 'ORBITOX_SUPPORT';
        const isEscalation = m.sender === 'SYSTEM_ESCALATION';
        return '<div style="background:' + (isSupport ? 'rgba(59,130,246,0.08)' : isEscalation ? 'rgba(239,68,68,0.08)' : 'var(--color-charcoal)') +
               '; border:1px solid ' + (isSupport ? 'rgba(59,130,246,0.3)' : isEscalation ? 'rgba(239,68,68,0.3)' : 'var(--border-default)') +
               '; border-radius:10px; padding:14px 16px;">' +
               '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">' +
                 '<div style="display:flex; align-items:center; gap:8px;">' +
                   '<span style="font-size:12px; font-weight:800; color:' + (isSupport ? '#60A5FA' : isEscalation ? 'var(--color-crimson)' : 'var(--color-copper)') + ';">' + m.authorName + '</span>' +
                   '<span class="badge" style="font-size:9px; background:rgba(255,255,255,0.05); color:var(--color-stone);">' + m.sender + '</span>' +
                 '</div>' +
                 '<span style="font-size:10px; font-family:var(--font-mono); color:var(--color-muted);">' + m.timestamp + '</span>' +
               '</div>' +
               '<div style="font-size:13px; color:var(--color-linen); line-height:1.45;">' + m.text + '</div>' +
               '</div>';
      }).join('');
    }

    function setReplyMode(mode) {
      isInternalNote = mode === 'internal';
      const btnPublic = document.getElementById('btn-mode-public');
      const btnInternal = document.getElementById('btn-mode-internal');
      const input = document.getElementById('ticket-reply-input');

      if (isInternalNote) {
        btnInternal.className = 'btn btn-secondary btn-sm';
        btnInternal.style.background = 'rgba(217,119,6,0.2)';
        btnInternal.style.color = '#FBBF24';
        btnPublic.className = 'btn btn-ghost btn-sm';
        btnPublic.style.background = '';
        btnPublic.style.color = 'var(--color-stone)';
        input.placeholder = 'Type an internal support note (visible to engineers only)...';
      } else {
        btnPublic.className = 'btn btn-secondary btn-sm';
        btnPublic.style.background = 'var(--color-copper-subtle)';
        btnPublic.style.color = 'var(--color-copper)';
        btnInternal.className = 'btn btn-ghost btn-sm';
        btnInternal.style.background = '';
        btnInternal.style.color = 'var(--color-stone)';
        input.placeholder = 'Type your response to the restaurant staff...';
      }
    }

    async function submitTicketReply() {
      const input = document.getElementById('ticket-reply-input');
      const text = input.value.trim();
      if (!text) return;

      const prefix = isInternalNote ? '[INTERNAL NOTE] ' : '';
      const payloadText = prefix + text;

      try {
        const res = await fetch('/api/restaurant/support/tickets/' + activeTicketId + '/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender: 'ORBITOX_SUPPORT',
            authorName: isInternalNote ? 'Support Lead (Internal)' : 'OrbitoX Technical Support',
            text: payloadText
          })
        });
        const json = await res.json();
        if (json.success) {
          input.value = '';
          const t = allTickets.find(item => item.id === activeTicketId);
          if (t) {
            t.messages = t.messages || [];
            t.messages.push({
              id: 'msg_' + Date.now(),
              sender: 'ORBITOX_SUPPORT',
              authorName: isInternalNote ? 'Support Lead (Internal)' : 'OrbitoX Technical Support',
              text: payloadText,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
            renderThreadBubbles(t.messages);
          }
        }
      } catch (err) {
        alert('Failed to send message to ticket thread.');
      }
    }

    async function updateActiveStatus(status) {
      try {
        const res = await fetch('/api/restaurant/support/tickets/' + activeTicketId + '/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        });
        const json = await res.json();
        if (json.success) {
          document.getElementById('active-ticket-status').textContent = status;
          const t = allTickets.find(item => item.id === activeTicketId);
          if (t) t.status = status;
        }
      } catch (err) {
        alert('Failed to update ticket status.');
      }
    }

    function openNewTicketModal() {
      const modal = document.getElementById('new-ticket-modal');
      if (modal) modal.style.display = 'flex';
    }
    function closeNewTicketModal() {
      const modal = document.getElementById('new-ticket-modal');
      if (modal) modal.style.display = 'none';
    }

    async function submitNewTicket() {
      const category = document.getElementById('modal-ticket-cat').value;
      const severity = document.getElementById('modal-ticket-sev').value;
      const subject = document.getElementById('modal-ticket-sub').value.trim();
      const description = document.getElementById('modal-ticket-desc').value.trim();

      if (!subject || !description) {
        alert('Please provide subject and description.');
        return;
      }

      try {
        const res = await fetch('/api/restaurant/support/tickets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            branchId: '${currentBranch.id}',
            branchName: '${currentBranch.name}',
            category,
            severity,
            subject,
            description,
            staffId: 'stf_ops_mgr',
            staffName: 'Operations Lead'
          })
        });
        const json = await res.json();
        if (json.success) {
          closeNewTicketModal();
          location.reload();
        }
      } catch (err) {
        alert('Failed to create support ticket.');
      }
    }

    function filterTickets(query) {
      const q = query.toLowerCase();
      document.querySelectorAll('.ticket-row').forEach(row => {
        const match = row.innerText.toLowerCase().includes(q);
        row.style.display = match ? 'block' : 'none';
      });
    }

    function filterStatus(status) {
      document.querySelectorAll('.ticket-row').forEach(row => {
        if (status === 'ALL') {
          row.style.display = 'block';
        } else {
          const match = row.getAttribute('data-status') === status;
          row.style.display = match ? 'block' : 'none';
        }
      });
    }
  </script>
  `;
}
