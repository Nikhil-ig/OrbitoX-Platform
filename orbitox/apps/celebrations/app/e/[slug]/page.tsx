'use client';

import React, { use, useState, useEffect } from 'react';
import {
  DEFAULT_THEMES,
  DEFAULT_OCCASIONS,
  Experience,
  ExperienceSection,
  SectionEngine,
  Theme,
} from '@orbitox-io/celebrations';
import { ExperienceView } from '@/components/renderer/ExperienceView';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { TemplateSchemaService } from '@/components/template-studio/services/TemplateSchemaService';
import { TemplateSchema, DeviceBreakpoint } from '@/components/template-studio/types/TemplateSchema';
import { SceneGraphRenderer } from '@/components/renderer/SceneGraphRenderer';
import { MusicPlayer } from '@/components/renderer/sections/MusicPlayer';
import { CanonicalProjectDocument } from '@/types/CanonicalProjectDocument';
import { TypographyStudioEngine } from '@/components/template-studio/engine/TypographyStudio';
import { bindDataToGraph } from '@/components/template-studio/engine/GraphDataBinder';

const sectionEngine = new SectionEngine();

function parseSlugToCelebration(slug: string): {
  names: string;
  occasionSlug: string;
  occasionName: string;
} {
  const parts = slug.toLowerCase().split('-');
  const knownOccasions = ['wedding', 'birthday', 'engagement', 'anniversary', 'baby-shower', 'festival'];
  let occasionSlug = 'wedding';
  let occasionName = 'Wedding';

  const matchedOcc = knownOccasions.find((o) => parts.includes(o));
  if (matchedOcc) {
    occasionSlug = matchedOcc;
    const foundOcc = DEFAULT_OCCASIONS.find((o) => o.slug === matchedOcc);
    if (foundOcc) occasionName = foundOcc.name;
  }

  // Filter out occasion / filler words to extract names
  const nameParts = parts.filter(
    (p) => !['wedding', 'birthday', 'engagement', 'anniversary', 'baby', 'shower', 'festival', 'celebration', 'party', 'demo', 'royal', 'experience'].includes(p)
  );

  let names = 'Vikramaditya & Ananya';
  const name0 = nameParts[0];
  const name1 = nameParts[1];
  const name2 = nameParts[2];

  if (nameParts.length === 2 && name0 && name1) {
    const p1 = name0.charAt(0).toUpperCase() + name0.slice(1);
    const p2 = name1.charAt(0).toUpperCase() + name1.slice(1);
    names = `${p1} & ${p2}`;
  } else if (nameParts.length >= 3 && name0 && name1 === 'and' && name2) {
    const p1 = name0.charAt(0).toUpperCase() + name0.slice(1);
    const p2 = name2.charAt(0).toUpperCase() + name2.slice(1);
    names = `${p1} & ${p2}`;
  } else if (nameParts.length > 0) {
    names = nameParts
      .filter((p): p is string => Boolean(p))
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
  }

  return { names, occasionSlug, occasionName };
}

function canonicalProjectToTemplateSchema(doc: CanonicalProjectDocument): TemplateSchema {
  const activePage = (doc.pages && (doc.pages[doc.activePageId] || Object.values(doc.pages)[0])) || null;
  const sections = activePage?.sections || [];

  const scenes = sections.map((sec, idx) => ({
    id: sec.id,
    name: sec.name || `Section ${idx + 1}`,
    slug: sec.kind || `section-${idx + 1}`,
    purpose: sec.kind || 'custom',
    sceneType: (sec.kind as any) || 'custom',
    order: sec.order ?? idx,
    scrollMode: 'normal' as const,
    isRequired: false,
    defaultVisible: !sec.hidden,
    customerToggleable: true,
    navigationLabel: sec.name || `Section ${idx + 1}`,
    layers: [],
    motionPreset: 'fade' as const,
    motionConfig: {
      entryDuration: 0.6,
      entryDelay: 0,
      parallaxDepth: 0,
      staggerDelay: 0.1,
      easing: 'ease-out' as const,
      reducedMotionFallback: 'fade' as const,
    },
    interactions: [],
    transitionToNext: {
      type: 'none' as const,
      durationMs: 300,
      easing: 'ease',
    },
    sceneGraph: {
      rootNodeId: sec.rootNodeId || 'root',
      nodes: sec.nodes || {},
    },
    renderMode: 'graph' as const,
    customStyles: sec.customStyles,
    responsiveVisibility: sec.responsiveVisibility,
  } as any));

  const bg = doc.designSystem?.colors?.background || '#07090E';
  const fg = doc.designSystem?.colors?.foreground || '#FFFFFF';

  return {
    id: doc.id,
    slug: doc.slug,
    name: doc.metadata?.title || doc.slug,
    description: doc.metadata?.description || '',
    scenes: scenes,
    designTokens: {
      colors: {
        backgroundPrimary: bg,
        textPrimary: fg,
        accentPrimary: doc.designSystem?.colors?.primary || '#6366F1',
        surfacePrimary: doc.designSystem?.colors?.surface || '#121317',
        ...doc.designSystem?.colors,
      },
      typography: {
        bodyFont: (doc.designSystem?.typography?.body as any)?.fontFamily || "'Inter', sans-serif",
        headingFont: (doc.designSystem?.typography?.heading as any)?.fontFamily || "'Cinzel', serif",
      },
      spacing: doc.designSystem?.spacing || [0, 4, 8, 12, 16, 24, 32, 48, 64],
    } as any,
    cmsCollections: doc.cmsCollections || {},
    masterComponents: doc.masterComponents || {},
  } as any as TemplateSchema;
}

function buildFallbackExperience(slug: string): Experience {
  const { names, occasionSlug, occasionName } = parseSlugToCelebration(slug);
  const defaultTheme: Theme =
    DEFAULT_THEMES.find((t) => t.slug === 'royal-regalia') || (DEFAULT_THEMES[0] as Theme);

  const defaultSections = sectionEngine.buildDefaultSections([
    'hero',
    'countdown',
    'couple_profile',
    'story',
    'events_schedule',
    'venue_map',
    'dress_code',
    'gallery',
    'gift_registry',
    'live_poll',
    'rsvp',
    'wishes_guestbook',
  ]);

  const nameList = names.includes('&') ? names.split('&').map((s) => s.trim()) : [names, ''];
  const p1 = nameList[0] || 'Aarav';
  const p2 = nameList[1] || 'Meera';

  const enrichedSections: ExperienceSection[] = defaultSections.map((sec) => {
    if (sec.sectionType === 'hero') {
      return {
        ...sec,
        config: {
          ...sec.config,
          hostNames: names,
          headline: occasionSlug === 'birthday' ? `Celebrating ${p1}!` : 'We are getting married!',
          subheadline: 'Together with our families, we invite you to celebrate',
          eventDate: '2026-12-18',
          venueCity: 'Udaipur, Rajasthan',
          venueName: 'Jagmandir Island Palace',
        },
      };
    }
    if (sec.sectionType === 'couple_profile') {
      return {
        ...sec,
        config: {
          ...sec.config,
          partner1Name: p1,
          partner1Role: occasionSlug === 'wedding' ? 'The Groom' : 'Celebrant',
          partner2Name: p2,
          partner2Role: occasionSlug === 'wedding' ? 'The Bride' : 'Guest of Honor',
        },
      };
    }
    if (sec.sectionType === 'wishes_guestbook') {
      return {
        ...sec,
        config: {
          ...sec.config,
          hostNames: names,
          subtitle: `Leave your love, blessings, and memorable advice for ${names}`,
        },
      };
    }
    return sec;
  });

  return {
    id: `exp_dynamic_${slug}`,
    tenantId: 'tenant_royal_celebration',
    title: `${names} ${occasionName} Celebration`,
    slug: slug,
    occasionId: `occ_${occasionSlug}`,
    occasionSlug: occasionSlug,
    themeId: slug.includes('celestial')
      ? 'theme_celestial_rose_gold'
      : defaultTheme.id,
    themeSlug: slug.includes('celestial')
      ? 'celestial-rose-gold'
      : defaultTheme.slug,
    templateSlug: slug.includes('odyssey') || slug.includes('world')
      ? 'celestial-odyssey'
      : slug.includes('celestial') || slug.includes('parallax')
        ? 'celestial-parallax'
        : slug.includes('amalfi')
        ? 'amalfi-riviera'
        : slug.includes('glasshouse')
          ? 'enchanted-glasshouse'
          : slug.includes('doors')
            ? 'romantic-doors'
            : slug.includes('regalia') || slug.includes('royal')
              ? 'royal-regalia'
              : slug.includes('party') || slug.includes('nocturne')
                ? 'party-nocturne'
                : 'royal-regalia',
    status: 'PUBLISHED',
    eventDate: '2026-12-18',
    sections: enrichedSections,
    featuresEnabled: ['rsvp_tracking', 'photo_gallery', 'wishes_wall', 'background_music'],
    passwordProtection: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export default function ExperiencePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  // 1. Studio Zero Modern TemplateSchema State
  const [templateSchema, setTemplateSchema] = useState<TemplateSchema | null>(() => {
    try {
      const schema = TemplateSchemaService.getSchema(slug);
      if (
        schema &&
        schema.scenes &&
        schema.scenes.length > 0 &&
        schema.scenes.some((s) => s.sceneGraph && Object.keys(s.sceneGraph.nodes || {}).length > 0)
      ) {
        return schema;
      }
    } catch (err) {
      console.warn('Failed to parse TemplateSchema:', err);
    }
    return null;
  });

  const [device, setDevice] = useState<DeviceBreakpoint>('desktop');

  // 2. Legacy Experience Fallback State
  const [experience, setExperience] = useState<Experience | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached =
          localStorage.getItem(`orbitox_exp_${slug}`) ||
          localStorage.getItem('orbitox_exp_preview');
        if (cached) {
          return JSON.parse(cached) as Experience;
        }
      } catch (e) {
        console.warn('Could not read cached experience from localStorage:', e);
      }
    }
    if (slug === 'preview') {
      return buildFallbackExperience('preview');
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(!templateSchema && !experience);

  // Preload typography styles & Google Fonts immediately
  useEffect(() => {
    TypographyStudioEngine.ensureGoogleFontsLoaded();
  }, []);

  // Responsive device listener
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateDevice = () => {
      const w = window.innerWidth;
      if (w < 640) setDevice('mobile');
      else if (w < 1024) setDevice('tablet');
      else setDevice('desktop');
    };
    updateDevice();
    window.addEventListener('resize', updateDevice);
    return () => window.removeEventListener('resize', updateDevice);
  }, []);

  // Fetch / Reconcile Experience if neither schema nor experience was loaded synchronously
  useEffect(() => {
    let isMounted = true;

    // Check template schema again in effect to ensure client-side hydration has latest edits
    if (typeof window !== 'undefined') {
      try {
        const schema = TemplateSchemaService.getSchema(slug);
        if (
          schema &&
          schema.scenes &&
          schema.scenes.length > 0 &&
          schema.scenes.some((s) => s.sceneGraph && Object.keys(s.sceneGraph.nodes || {}).length > 0)
        ) {
          if (isMounted) {
            setTemplateSchema(schema);
            setIsLoading(false);
            return;
          }
        }
      } catch {}
    }

    if (templateSchema) {
      setIsLoading(false);
      return;
    }

    if (slug === 'preview' && experience) {
      setIsLoading(false);
      return;
    }

    async function loadExperience() {
      // 1. Check Canonical Studio Project Storage API
      try {
        const projRes = await fetch(`/api/studio/projects/${encodeURIComponent(slug)}`);
        if (projRes.ok) {
          const projData = await projRes.json();
          if (projData.success && projData.project && isMounted) {
            const converted = canonicalProjectToTemplateSchema(projData.project);
            setTemplateSchema(converted);
            setIsLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Failed to load project from /api/studio/projects:', err);
      }

      // 2. Check LocalStorage or Builtin Blueprint via TemplateSchemaService
      try {
        const schema = TemplateSchemaService.getSchema(slug);
        if (
          schema &&
          schema.scenes &&
          schema.scenes.length > 0 &&
          schema.scenes.some((s) => s.sceneGraph && Object.keys(s.sceneGraph.nodes || {}).length > 0)
        ) {
          if (isMounted) {
            setTemplateSchema(schema);
            setIsLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Failed to load schema from TemplateSchemaService:', err);
      }

      // 3. Fallback to Legacy /api/experiences
      try {
        const res = await fetch(`/api/experiences?slug=${encodeURIComponent(slug)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.experience && isMounted) {
            setExperience(data.experience);
            if (typeof window !== 'undefined') {
              localStorage.setItem(`orbitox_exp_${slug}`, JSON.stringify(data.experience));
            }
            setIsLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Failed to fetch experience from API:', err);
      }

      // 4. Ultimate Fallback
      if (isMounted) {
        setExperience((prev) => prev || buildFallbackExperience(slug));
        setIsLoading(false);
      }
    }

    loadExperience();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  // Loading Screen
  if (isLoading || (!templateSchema && !experience)) {
    return (
      <div
        id="sz-loading-screen"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#07090E',
          color: 'var(--cel-gold, #D4AF37)',
          fontFamily: "'Cinzel', serif",
        }}
      >
        <Loader2 size={36} className="animate-spin" style={{ marginBottom: '16px' }} />
        <span style={{ letterSpacing: '3px', fontSize: '1rem', textTransform: 'uppercase' }}>
          Preparing Published Website...
        </span>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 1. MODERN SCENE-GRAPH TEMPLATE SCHEMA RENDERER
  // ─────────────────────────────────────────────────────────────
  if (templateSchema && templateSchema.scenes && templateSchema.scenes.length > 0) {
    const tokens = templateSchema.designTokens || ({} as any);
    const bg = tokens.colors?.backgroundPrimary || '#07090E';
    const fg = tokens.colors?.textPrimary || '#FFFFFF';

    return (
      <main
        id="orbitox-real-website-view"
        style={{
          minHeight: '100vh',
          background: bg,
          color: fg,
          position: 'relative',
          overflowX: 'hidden',
          fontFamily: tokens.typography?.bodyFont || (tokens.typography as any)?.fontFamilies?.body || "'Inter', sans-serif",
        }}
      >
        {/* Floating Ambient Music Player if audio configured */}
        {templateSchema.audioSupport?.hasDefaultAudio && (
          <MusicPlayer
            theme={{
              id: 'custom',
              name: 'Custom',
              slug: 'custom',
              description: '',
              styleConfig: {
                primaryColor: tokens.colors?.accentPrimary || '#D4AF37',
                secondaryColor: tokens.colors?.accentSecondary || '#8B5CF6',
                fontFamily: 'sans-serif',
                cardRadius: '16px',
                glowColor: 'rgba(212, 175, 55, 0.4)',
                backgroundStyle: 'gradient',
              },
            } as any}
            audioUrl={templateSchema.audioSupport.defaultTrackUrl}
            trackTitle={templateSchema.audioSupport.defaultTrackTitle}
          />
        )}

        {/* Continuous Section Scenes Flow */}
        <div id="orbitox-live-scenes-container" style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
          {templateSchema.scenes.map((scene, idx) => {
            // Respect responsive visibility per device breakpoint
            if ((scene as any).responsiveVisibility && (scene as any).responsiveVisibility[device] === false) {
              return null;
            }

            const boundGraph = scene.sceneGraph
              ? bindDataToGraph(scene.sceneGraph, {} as any)
              : null;

            return (
              <section
                key={scene.id}
                id={`sz-section-container-${scene.id}`}
                data-section-slug={scene.slug}
                data-section-index={idx}
                style={{
                  position: 'relative',
                  width: '100%',
                  minHeight: '100px',
                }}
              >
                {boundGraph && (
                  <SceneGraphRenderer
                    sceneGraph={boundGraph}
                    device={device}
                    tokens={tokens}
                    isEditorMode={false}
                    schema={templateSchema}
                  />
                )}
              </section>
            );
          })}
        </div>

        {/* Floating "Edit in Studio" badge for admin/creator */}
        <div
          id="sz-floating-edit-badge"
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '24px',
            zIndex: 9999,
          }}
        >
          <Link
            href={`/admin/template-studio?template=${encodeURIComponent(slug)}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(15, 23, 42, 0.90)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              borderRadius: '9999px',
              padding: '8px 16px',
              color: '#93C5FD',
              fontSize: '0.75rem',
              fontWeight: 600,
              textDecoration: 'none',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6), 0 0 15px rgba(59, 130, 246, 0.25)',
              transition: 'all 0.15s ease',
            }}
          >
            <span style={{ fontSize: '0.85rem' }}>✎</span>
            <span>Edit in Studio Zero</span>
          </Link>
        </div>
      </main>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. LEGACY EXPERIENCE VIEW FALLBACK
  // ─────────────────────────────────────────────────────────────
  const theme: Theme =
    DEFAULT_THEMES.find(
      (t) => t.slug === experience?.themeSlug || t.id === experience?.themeId
    ) || (DEFAULT_THEMES[0] as Theme);

  return <ExperienceView experience={experience!} theme={theme} />;
}
