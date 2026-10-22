import { SceneNodeKind, SceneGraphNode } from './SceneGraphTypes';

export class NodeDefaults {
  static create(kind: SceneNodeKind): Partial<SceneGraphNode> {
    const base = {
      kind,
      name: this.formatKindName(kind),
      geometry: {
        position: 'flow' as const,
        x: 0,
        y: 0,
        width: 'auto',
        height: 'auto',
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        zIndex: 0,
      },
      style: {},
      locked: false,
      hidden: false,
      customerEditable: false,
      customizationLevel: 'LOCKED' as const,
    };

    switch (kind) {
      // ─────────────────────────────────────────────────────────────
      // PRIMITIVES (Prompt #6)
      // ─────────────────────────────────────────────────────────────
      case 'frame':
        return {
          ...base,
          layoutMode: 'freeform',
          geometry: { ...base.geometry, position: 'flow', width: '100%', height: '400px' },
          style: {
            background: { type: 'solid', color: { type: 'solid', value: 'rgba(255, 255, 255, 0.02)' } },
            border: { width: '1px', color: { type: 'token', tokenPath: 'colors.borderSubtle' }, radius: '12px' },
          },
        };

      case 'container':
      case 'group':
        return {
          ...base,
          layoutMode: 'flex',
          geometry: { ...base.geometry, width: '100%', height: 'auto' },
        };

      case 'stack':
        return {
          ...base,
          layoutMode: 'stack',
          geometry: { ...base.geometry, width: '100%', height: 'auto' },
          layoutConfig: {
            direction: 'vertical',
            gap: '1rem',
            padding: { top: 0, right: 0, bottom: 0, left: 0 },
            alignment: { primary: 'start', cross: 'stretch' },
            wrap: false,
            sizing: { primary: 'hug', cross: 'fill' },
          },
        };

      case 'grid':
        return {
          ...base,
          layoutMode: 'grid',
          geometry: { ...base.geometry, width: '100%', height: 'auto' },
          layoutConfig: {
            columns: 2,
            gap: '1.5rem',
            padding: { top: 0, right: 0, bottom: 0, left: 0 },
            alignment: { horizontal: 'start', vertical: 'start' },
          },
        };

      case 'text':
        return {
          ...base,
          geometry: { ...base.geometry, width: '100%' },
          textContent: 'Celebration Headline',
          style: {
            typography: {
              fontFamily: 'var(--cel-font-heading, Cinzel)',
              fontSize: '1.5rem',
              color: { type: 'token', tokenPath: 'colors.textPrimary' },
            },
          },
        };

      case 'richtext':
        return {
          ...base,
          geometry: { ...base.geometry, width: '100%' },
          textContent: 'In the presence of the stars and our most cherished companions, we celebrate this sacred union.',
          style: {
            typography: {
              fontFamily: 'var(--cel-font-body, Outfit)',
              fontSize: '1rem',
              lineHeight: 1.7,
              color: { type: 'token', tokenPath: 'colors.textSecondary' },
            },
          },
        };

      case 'image':
        return {
          ...base,
          geometry: { ...base.geometry, width: '100%', height: '320px' },
          style: {
            background: { type: 'solid', color: { type: 'solid', value: 'rgba(255, 255, 255, 0.05)' } },
            border: { radius: '12px' },
          },
          smartProps: {
            src: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=85',
            alt: 'Celebration visual',
          },
        };

      case 'video':
        return {
          ...base,
          geometry: { ...base.geometry, width: '100%', height: '360px' },
          style: {
            background: { type: 'solid', color: { type: 'solid', value: '#000' } },
            border: { radius: '12px' },
          },
          smartProps: {
            src: '',
            autoPlay: true,
            loop: true,
            muted: true,
          },
        };

      case 'shape':
        return {
          ...base,
          geometry: { ...base.geometry, width: '120px', height: '120px' },
          style: {
            background: { type: 'solid', color: { type: 'token', tokenPath: 'colors.accentPrimary' } },
            border: { radius: '16px' },
          },
        };

      case 'line':
      case 'divider':
        return {
          ...base,
          geometry: { ...base.geometry, width: '100%', height: '1px' },
          style: {
            background: { type: 'solid', color: { type: 'token', tokenPath: 'colors.borderSubtle' } },
          },
        };

      case 'button':
        return {
          ...base,
          name: 'Interactive Button',
          textContent: 'Confirm Attendance',
          geometry: { ...base.geometry, width: 'auto', minWidth: '160px', height: '48px' },
          style: {
            background: { type: 'solid', color: { type: 'token', tokenPath: 'colors.accentPrimary' } },
            border: { radius: '999px' },
            padding: '12px 28px',
            typography: {
              fontFamily: 'var(--cel-font-body, Outfit)',
              fontSize: '0.875rem',
              fontWeight: 600,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: { type: 'solid', value: '#0D1429' },
            },
            shadow: { boxShadow: '0 8px 24px rgba(223, 186, 107, 0.25)' },
          },
          motion: {
            hover: { scale: 1.03, y: -2, duration: 200 },
          },
          interactions: [
            {
              trigger: 'onTap',
              action: 'openModal',
              payload: { modalId: 'rsvp-modal' },
            },
          ],
        };

      case 'icon':
        return {
          ...base,
          name: 'Visual Icon',
          textContent: '✦',
          geometry: { ...base.geometry, width: '32px', height: '32px' },
          style: {
            typography: {
              fontSize: '1.25rem',
              textAlign: 'center',
              color: { type: 'token', tokenPath: 'colors.accentPrimary' },
            },
          },
        };

      // ─────────────────────────────────────────────────────────────
      // CELEBRATION SEMANTIC (Prompt #6)
      // ─────────────────────────────────────────────────────────────
      case 'person':
      case 'portrait':
        return {
          ...base,
          name: 'Portrait Card',
          binding: { fieldKey: 'celebrants[0].firstName', bindingType: 'content' },
          customerEditable: true,
          customizationLevel: 'FLEXIBLE',
          geometry: { ...base.geometry, width: '280px', height: '380px' },
          style: {
            border: { radius: '16px' },
            shadow: { boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)' },
          },
        };

      case 'couple':
      case 'couplecluster':
        return {
          ...base,
          name: 'Dual Couple Portraits',
          layoutMode: 'flex',
          customerEditable: true,
          customizationLevel: 'FLEXIBLE',
          geometry: { ...base.geometry, width: '100%', height: 'auto' },
          layoutConfig: {
            direction: 'horizontal',
            gap: '2rem',
            padding: { top: 0, right: 0, bottom: 0, left: 0 },
            alignment: { primary: 'center', cross: 'center' },
            wrap: false,
            sizing: { primary: 'hug', cross: 'hug' },
          },
        };

      case 'story':
        return {
          ...base,
          name: 'Love Story Timeline',
          customerEditable: true,
          customizationLevel: 'FLEXIBLE',
          geometry: { ...base.geometry, width: '100%', height: 'auto' },
        };

      case 'milestone':
      case 'storymilestone':
        return {
          ...base,
          name: 'Story Milestone',
          binding: { fieldKey: 'story.milestones[0]', bindingType: 'content' },
          customerEditable: true,
          customizationLevel: 'FLEXIBLE',
          geometry: { ...base.geometry, width: '100%', height: 'auto' },
          style: {
            background: { type: 'solid', color: { type: 'solid', value: 'rgba(255, 255, 255, 0.03)' } },
            border: { radius: '10px', width: '1px', color: { type: 'token', tokenPath: 'colors.borderSubtle' } },
            padding: '16px',
          },
        };

      case 'event':
      case 'eventcard':
        return {
          ...base,
          name: 'Itinerary Event Card',
          customerEditable: true,
          customizationLevel: 'FLEXIBLE',
          geometry: { ...base.geometry, width: '100%', height: 'auto' },
          style: {
            background: { type: 'solid', color: { type: 'solid', value: 'rgba(255, 255, 255, 0.03)' } },
            border: { radius: '12px', width: '1px', color: { type: 'token', tokenPath: 'colors.borderSubtle' } },
            padding: '20px',
          },
        };

      case 'venue':
        return {
          ...base,
          name: 'Venue & Logistics Card',
          binding: { fieldKey: 'celebration.venue.name', bindingType: 'content' },
          customerEditable: true,
          customizationLevel: 'FLEXIBLE',
          geometry: { ...base.geometry, width: '100%', height: 'auto' },
        };

      case 'countdown':
        return {
          ...base,
          name: 'Countdown Chronograph',
          binding: { fieldKey: 'celebration.date', bindingType: 'content' },
          customerEditable: true,
          customizationLevel: 'FLEXIBLE',
          geometry: { ...base.geometry, width: '100%', height: 'auto' },
        };

      case 'rsvp':
      case 'rsvpform':
        return {
          ...base,
          name: 'RSVP Form',
          customerEditable: true,
          customizationLevel: 'FLEXIBLE',
          geometry: { ...base.geometry, width: '100%', maxWidth: '520px', height: 'auto' },
          style: {
            background: { type: 'solid', color: { type: 'solid', value: 'rgba(13, 20, 41, 0.85)' } },
            border: { radius: '16px', width: '1px', color: { type: 'token', tokenPath: 'colors.borderAccent' } },
            padding: '24px',
          },
        };

      case 'gallery':
        return {
          ...base,
          name: 'Celebration Gallery Grid',
          customerEditable: true,
          customizationLevel: 'FLEXIBLE',
          geometry: { ...base.geometry, width: '100%', height: 'auto' },
        };

      case 'guestbook':
      case 'blessing':
        return {
          ...base,
          name: 'Blessings & Wishes Wall',
          customerEditable: true,
          customizationLevel: 'FLEXIBLE',
          geometry: { ...base.geometry, width: '100%', height: 'auto' },
        };

      // ─────────────────────────────────────────────────────────────
      // VISUAL FX & ATMOSPHERE (Prompt #6)
      // ─────────────────────────────────────────────────────────────
      case 'gradient':
        return {
          ...base,
          name: 'Radial Luxury Gradient',
          geometry: { ...base.geometry, width: '100%', height: '100%' },
          style: {
            background: {
              type: 'gradient',
              gradient: {
                type: 'radial',
                stops: [
                  { color: 'rgba(223, 186, 107, 0.15)', position: 0 },
                  { color: 'transparent', position: 0.7 },
                ],
              },
            },
          },
        };

      case 'glow':
      case 'lightsource':
        return {
          ...base,
          name: 'Atmospheric Glow Light',
          geometry: { ...base.geometry, width: '300px', height: '300px', opacity: 0.6 },
          style: {
            shadow: { boxShadow: '0 0 80px rgba(223, 186, 107, 0.45)' },
          },
        };

      case 'atmosphere':
      case 'particlefield':
      case 'starfield':
        return {
          ...base,
          name: 'Cosmic Stardust Atmosphere',
          geometry: { ...base.geometry, width: '100%', height: '100%', zIndex: 0, opacity: 0.75 },
        };

      case 'orbit':
        return {
          ...base,
          name: 'Orbital Ring',
          geometry: { ...base.geometry, width: '400px', height: '400px', rotation: 25 },
          style: {
            border: { width: '1px', color: { type: 'token', tokenPath: 'colors.borderSubtle' }, radius: '50%' },
          },
        };

      case 'constellation':
        return {
          ...base,
          name: 'Interactive Constellation Star Map',
          geometry: { ...base.geometry, width: '100%', height: '500px' },
        };

      case 'mask':
        return {
          ...base,
          name: 'Architectural Arch Mask',
          geometry: { ...base.geometry, width: '280px', height: '400px' },
          style: {
            mask: { type: 'shape', value: 'arch' },
          },
        };

      default:
        return base;
    }
  }

  private static formatKindName(kind: string): string {
    return kind.charAt(0).toUpperCase() + kind.slice(1).replace(/_/g, ' ');
  }
}
