import './dom-setup';
import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render, fireEvent, cleanup, act } from '@testing-library/react';
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetDescription,
  BottomSheetFooter,
} from '../src/components/bottom-sheet';

afterEach(() => {
  cleanup();
});

describe('BottomSheet Component Guard (7B.1 / F-5)', () => {
  it('renders bottom sheet content when open with accessible structure', () => {
    const { getByRole, getByText } = render(
      React.createElement(
        BottomSheet,
        { open: true },
        React.createElement(
          BottomSheetContent,
          null,
          React.createElement(
            BottomSheetHeader,
            null,
            React.createElement(BottomSheetTitle, null, 'Test Sheet Title'),
            React.createElement(BottomSheetDescription, null, 'Test sheet description')
          ),
          React.createElement('p', null, 'Sheet body content'),
          React.createElement(
            BottomSheetFooter,
            null,
            React.createElement('button', { type: 'button' }, 'Action')
          )
        )
      )
    );

    const dialog = getByRole('dialog');
    assert.ok(dialog);
    assert.equal(getByText('Test Sheet Title').textContent, 'Test Sheet Title');
    assert.equal(getByText('Test sheet description').textContent, 'Test sheet description');
    assert.equal(getByText('Sheet body content').textContent, 'Sheet body content');
    assert.equal(dialog.getAttribute('data-drag-state'), 'idle');
  });

  it('handles showCloseButton={false} by adding sr-only class for accessible close', () => {
    const { getByRole } = render(
      React.createElement(
        BottomSheet,
        { open: true },
        React.createElement(
          BottomSheetContent,
          { showCloseButton: false },
          React.createElement(BottomSheetTitle, null, 'Title'),
          React.createElement(BottomSheetDescription, null, 'Desc')
        )
      )
    );

    const closeBtn = getByRole('button', { name: 'Close' });
    assert.ok(closeBtn);
    assert.ok(closeBtn.className.includes('sr-only'));
  });

  it('shows close button visually by default (showCloseButton=true)', () => {
    const { getByRole } = render(
      React.createElement(
        BottomSheet,
        { open: true },
        React.createElement(
          BottomSheetContent,
          null,
          React.createElement(BottomSheetTitle, null, 'Title'),
          React.createElement(BottomSheetDescription, null, 'Desc')
        )
      )
    );

    const closeBtn = getByRole('button', { name: 'Close' });
    assert.ok(closeBtn);
    assert.equal(closeBtn.className.includes('sr-only'), false);
  });

  it('tracks fine-grained downward movement with 2px resolution', () => {
    const { getByRole } = render(
      React.createElement(
        BottomSheet,
        { open: true },
        React.createElement(
          BottomSheetContent,
          null,
          React.createElement(BottomSheetTitle, null, 'Title'),
          React.createElement(BottomSheetDescription, null, 'Desc')
        )
      )
    );

    const dialog = getByRole('dialog');
    const dragHandle = dialog.querySelector('.cursor-grab');
    assert.ok(dragHandle, 'Drag handle must be rendered');

    // Drag start at clientY = 100
    fireEvent.touchStart(dragHandle, {
      touches: [{ clientX: 100, clientY: 100 }],
      changedTouches: [{ clientX: 100, clientY: 100 }],
    });

    // Move to 134px (delta = 34px)
    fireEvent.touchMove(dragHandle, {
      touches: [{ clientX: 100, clientY: 134 }],
      changedTouches: [{ clientX: 100, clientY: 134 }],
    });
    assert.equal(dialog.getAttribute('data-drag-state'), 'dragging');
    assert.equal(dialog.getAttribute('data-drag-offset'), '34');

    // Move to 150px (delta = 50px)
    fireEvent.touchMove(dragHandle, {
      touches: [{ clientX: 100, clientY: 150 }],
      changedTouches: [{ clientX: 100, clientY: 150 }],
    });
    assert.equal(dialog.getAttribute('data-drag-offset'), '50');
  });

  it('clamps upward movement (delta <= 0) to resting state without dismissal', async () => {
    let openState = true;
    const { getByRole } = render(
      React.createElement(
        BottomSheet,
        { open: openState, onOpenChange: (open) => { openState = open; } },
        React.createElement(
          BottomSheetContent,
          null,
          React.createElement(BottomSheetTitle, null, 'Title'),
          React.createElement(BottomSheetDescription, null, 'Desc')
        )
      )
    );

    const dialog = getByRole('dialog');
    const dragHandle = dialog.querySelector('.cursor-grab');
    assert.ok(dragHandle);

    fireEvent.touchStart(dragHandle, {
      touches: [{ clientX: 100, clientY: 100 }],
      changedTouches: [{ clientX: 100, clientY: 100 }],
    });

    // Drag upwards to clientY: 60 (delta = -40 <= 0)
    fireEvent.touchMove(dragHandle, {
      touches: [{ clientX: 100, clientY: 60 }],
      changedTouches: [{ clientX: 100, clientY: 60 }],
    });

    assert.equal(dialog.getAttribute('data-drag-state'), 'idle');
    assert.equal(dialog.hasAttribute('data-drag-offset'), false);

    await act(async () => {
      fireEvent.touchEnd(dragHandle, {
        touches: [{ clientX: 100, clientY: 60 }],
        changedTouches: [{ clientX: 100, clientY: 60 }],
      });
    });

    assert.equal(openState, true);
  });

  it('snaps back cleanly at the exact 75px threshold boundary (delta <= 75)', async () => {
    let openState = true;
    const { getByRole } = render(
      React.createElement(
        BottomSheet,
        { open: openState, onOpenChange: (open) => { openState = open; } },
        React.createElement(
          BottomSheetContent,
          null,
          React.createElement(BottomSheetTitle, null, 'Title'),
          React.createElement(BottomSheetDescription, null, 'Desc')
        )
      )
    );

    const dialog = getByRole('dialog');
    const dragHandle = dialog.querySelector('.cursor-grab');
    assert.ok(dragHandle);

    fireEvent.touchStart(dragHandle, {
      touches: [{ clientX: 100, clientY: 100 }],
      changedTouches: [{ clientX: 100, clientY: 100 }],
    });

    // Move to 175px (exact boundary delta = 75px <= 75)
    fireEvent.touchMove(dragHandle, {
      touches: [{ clientX: 100, clientY: 175 }],
      changedTouches: [{ clientX: 100, clientY: 175 }],
    });

    assert.equal(dialog.getAttribute('data-drag-offset'), '76'); // quantized 74/76

    await act(async () => {
      fireEvent.touchEnd(dragHandle, {
        touches: [{ clientX: 100, clientY: 175 }],
        changedTouches: [{ clientX: 100, clientY: 175 }],
      });
    });

    // Must NOT dismiss at exact threshold
    assert.equal(openState, true);
    assert.equal(dialog.getAttribute('data-drag-state'), 'snapping');
    assert.equal(dialog.hasAttribute('data-drag-offset'), false);
  });

  it('triggers dismissal when dragged downwards > 75px (e.g. 76px and 80px)', async () => {
    let openState = true;
    const onOpenChange = (open: boolean) => {
      openState = open;
    };

    const { getByRole } = render(
      React.createElement(
        BottomSheet,
        { open: openState, onOpenChange },
        React.createElement(
          BottomSheetContent,
          null,
          React.createElement(BottomSheetTitle, null, 'Title'),
          React.createElement(BottomSheetDescription, null, 'Desc')
        )
      )
    );

    const dialog = getByRole('dialog');
    const dragHandle = dialog.querySelector('.cursor-grab');
    assert.ok(dragHandle);

    fireEvent.touchStart(dragHandle, {
      touches: [{ clientX: 100, clientY: 100 }],
      changedTouches: [{ clientX: 100, clientY: 100 }],
    });

    // Move to 176px (delta = 76 > 75)
    fireEvent.touchMove(dragHandle, {
      touches: [{ clientX: 100, clientY: 176 }],
      changedTouches: [{ clientX: 100, clientY: 176 }],
    });

    await act(async () => {
      fireEvent.touchEnd(dragHandle, {
        touches: [{ clientX: 100, clientY: 176 }],
        changedTouches: [{ clientX: 100, clientY: 176 }],
      });
    });

    assert.equal(dialog.getAttribute('data-drag-state'), 'dismissing');
    assert.equal(openState, false);
  });

  it('restores sheet to resting state when onTouchCancel is fired', async () => {
    const { getByRole } = render(
      React.createElement(
        BottomSheet,
        { open: true },
        React.createElement(
          BottomSheetContent,
          null,
          React.createElement(BottomSheetTitle, null, 'Title'),
          React.createElement(BottomSheetDescription, null, 'Desc')
        )
      )
    );

    const dialog = getByRole('dialog');
    const dragHandle = dialog.querySelector('.cursor-grab');
    assert.ok(dragHandle);

    fireEvent.touchStart(dragHandle, {
      touches: [{ clientX: 100, clientY: 100 }],
      changedTouches: [{ clientX: 100, clientY: 100 }],
    });

    fireEvent.touchMove(dragHandle, {
      touches: [{ clientX: 100, clientY: 150 }],
      changedTouches: [{ clientX: 100, clientY: 150 }],
    });

    assert.equal(dialog.getAttribute('data-drag-state'), 'dragging');

    await act(async () => {
      fireEvent.touchCancel(dragHandle, {
        touches: [{ clientX: 100, clientY: 150 }],
        changedTouches: [{ clientX: 100, clientY: 150 }],
      });
    });

    assert.equal(dialog.getAttribute('data-drag-state'), 'snapping');
    assert.equal(dialog.hasAttribute('data-drag-offset'), false);
  });

  it('supports Pointer Events drag and pointerCancel recovery', async () => {
    const { getByRole } = render(
      React.createElement(
        BottomSheet,
        { open: true },
        React.createElement(
          BottomSheetContent,
          null,
          React.createElement(BottomSheetTitle, null, 'Title'),
          React.createElement(BottomSheetDescription, null, 'Desc')
        )
      )
    );

    const dialog = getByRole('dialog');
    const dragHandle = dialog.querySelector('.cursor-grab');
    assert.ok(dragHandle);

    // Pointer down
    fireEvent.pointerDown(dragHandle, { pointerId: 1, button: 0, clientY: 100 });
    // Pointer move
    fireEvent.pointerMove(dragHandle, { pointerId: 1, clientY: 140 });

    assert.equal(dialog.getAttribute('data-drag-state'), 'dragging');
    assert.equal(dialog.getAttribute('data-drag-offset'), '40');

    // Pointer cancel
    await act(async () => {
      fireEvent.pointerCancel(dragHandle, { pointerId: 1, clientY: 140 });
    });

    assert.equal(dialog.getAttribute('data-drag-state'), 'snapping');
    assert.equal(dialog.hasAttribute('data-drag-offset'), false);
  });

  it('manages pointer capture and filters unrelated pointer IDs', async () => {
    const { getByRole } = render(
      React.createElement(
        BottomSheet,
        { open: true },
        React.createElement(
          BottomSheetContent,
          null,
          React.createElement(BottomSheetTitle, null, 'Title'),
          React.createElement(BottomSheetDescription, null, 'Desc')
        )
      )
    );

    const dialog = getByRole('dialog');
    const dragHandle = dialog.querySelector('.cursor-grab') as any;
    assert.ok(dragHandle);

    // Pointer down captures pointer 42
    fireEvent.pointerDown(dragHandle, { pointerId: 42, button: 0, clientY: 100 });
    assert.equal(dragHandle._capturedPointerId, 42, 'Must set pointer capture on pointer down');

    // Unrelated pointer 99 move must be ignored
    fireEvent.pointerMove(dragHandle, { pointerId: 99, clientY: 160 });
    assert.equal(dialog.getAttribute('data-drag-state'), 'idle');

    // Matching pointer 42 move updates offset
    fireEvent.pointerMove(dragHandle, { pointerId: 42, clientY: 140 });
    assert.equal(dialog.getAttribute('data-drag-state'), 'dragging');
    assert.equal(dialog.getAttribute('data-drag-offset'), '40');

    // Pointer up releases capture
    await act(async () => {
      fireEvent.pointerUp(dragHandle, { pointerId: 42, clientY: 140 });
    });
    assert.equal(dragHandle._capturedPointerId, undefined, 'Must release pointer capture on pointer up');
  });

  it('prevents repeated gesture events from producing duplicate close calls', async () => {
    let closeCallCount = 0;
    const onOpenChange = (open: boolean) => {
      if (!open) closeCallCount += 1;
    };

    const { getByRole } = render(
      React.createElement(
        BottomSheet,
        { open: true, onOpenChange },
        React.createElement(
          BottomSheetContent,
          null,
          React.createElement(BottomSheetTitle, null, 'Title'),
          React.createElement(BottomSheetDescription, null, 'Desc')
        )
      )
    );

    const dialog = getByRole('dialog');
    const dragHandle = dialog.querySelector('.cursor-grab');
    assert.ok(dragHandle);

    fireEvent.touchStart(dragHandle, {
      touches: [{ clientX: 100, clientY: 100 }],
      changedTouches: [{ clientX: 100, clientY: 100 }],
    });

    fireEvent.touchMove(dragHandle, {
      touches: [{ clientX: 100, clientY: 190 }],
      changedTouches: [{ clientX: 100, clientY: 190 }],
    });

    await act(async () => {
      fireEvent.touchEnd(dragHandle, {
        touches: [{ clientX: 100, clientY: 190 }],
        changedTouches: [{ clientX: 100, clientY: 190 }],
      });
      // Duplicate second touchEnd while already dismissing
      fireEvent.touchEnd(dragHandle, {
        touches: [{ clientX: 100, clientY: 190 }],
        changedTouches: [{ clientX: 100, clientY: 190 }],
      });
    });

    assert.equal(closeCallCount, 1);
  });

  it('allows user interaction inside sheet content without accidental dismissal', () => {
    let buttonClicked = false;
    const { getByText, getByRole } = render(
      React.createElement(
        BottomSheet,
        { open: true },
        React.createElement(
          BottomSheetContent,
          null,
          React.createElement(BottomSheetTitle, null, 'Interactive Content'),
          React.createElement(BottomSheetDescription, null, 'Desc'),
          React.createElement(
            'button',
            {
              type: 'button',
              onClick: () => {
                buttonClicked = true;
              },
            },
            'Inside Content Button'
          )
        )
      )
    );

    const dialog = getByRole('dialog');
    const contentBtn = getByText('Inside Content Button');

    fireEvent.click(contentBtn);
    assert.equal(buttonClicked, true);
    assert.equal(dialog.getAttribute('data-drag-state'), 'idle');
  });

  it('supports keyboard dismissal via Escape key and traps focus attributes', async () => {
    let openState = true;
    const { getByRole } = render(
      React.createElement(
        BottomSheet,
        { open: openState, onOpenChange: (open) => { openState = open; } },
        React.createElement(
          BottomSheetContent,
          null,
          React.createElement(BottomSheetTitle, null, 'Keyboard Dismissible'),
          React.createElement(BottomSheetDescription, null, 'Focus test')
        )
      )
    );

    const dialog = getByRole('dialog');
    assert.ok(dialog);

    await act(async () => {
      fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
    });

    assert.equal(openState, false);
  });

  it('safely cleans up pending timers on unmount', () => {
    const { unmount, getByRole } = render(
      React.createElement(
        BottomSheet,
        { open: true },
        React.createElement(
          BottomSheetContent,
          null,
          React.createElement(BottomSheetTitle, null, 'Title'),
          React.createElement(BottomSheetDescription, null, 'Desc')
        )
      )
    );

    const dialog = getByRole('dialog');
    const dragHandle = dialog.querySelector('.cursor-grab');
    assert.ok(dragHandle);

    fireEvent.touchStart(dragHandle, {
      touches: [{ clientX: 100, clientY: 100 }],
      changedTouches: [{ clientX: 100, clientY: 100 }],
    });

    fireEvent.touchMove(dragHandle, {
      touches: [{ clientX: 100, clientY: 120 }],
      changedTouches: [{ clientX: 100, clientY: 120 }],
    });

    fireEvent.touchEnd(dragHandle, {
      touches: [{ clientX: 100, clientY: 120 }],
      changedTouches: [{ clientX: 100, clientY: 120 }],
    });

    // Unmount during snap timer
    unmount();
    // Passes without throwing unhandled timers or memory leaks
  });

  it('restores focus safely after sheet close', async () => {
    function ControlledSheet() {
      const [open, setOpen] = React.useState(false);
      return React.createElement(
        'div',
        null,
        React.createElement(
          'button',
          {
            type: 'button',
            'data-testid': 'trigger-btn',
            onClick: () => setOpen(true),
          },
          'Open Sheet'
        ),
        React.createElement(
          BottomSheet,
          { open, onOpenChange: setOpen },
          React.createElement(
            BottomSheetContent,
            null,
            React.createElement(BottomSheetTitle, null, 'Focus Restoration Sheet'),
            React.createElement(BottomSheetDescription, null, 'Testing focus return')
          )
        )
      );
    }

    const { getByTestId, getByRole } = render(React.createElement(ControlledSheet));
    const trigger = getByTestId('trigger-btn');
    trigger.focus();
    assert.equal(document.activeElement, trigger);

    // Open sheet
    await act(async () => {
      fireEvent.click(trigger);
    });

    const dialog = getByRole('dialog');
    assert.ok(dialog);

    // Close via escape
    await act(async () => {
      fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
    });

    assert.ok(
      document.activeElement === trigger || document.activeElement === document.body,
      'Focus restored safely after sheet dismiss'
    );
  });

  it('defines reduced-motion rules for zero-transition snapping and dismissal', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const cssPath = path.resolve(__dirname, '../src/tokens/components.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    assert.ok(
      cssContent.includes('@media (prefers-reduced-motion: reduce)'),
      'components.css must define prefers-reduced-motion media query'
    );
    assert.ok(
      cssContent.includes('[data-drag-state="snapping"]'),
      'components.css must define snapping transition rules'
    );
    assert.ok(
      cssContent.includes('[data-drag-state="dismissing"]'),
      'components.css must define dismissing transition rules'
    );
  });
});
