import { NextResponse } from 'next/server';
import {
  Experience,
  DEFAULT_THEMES,
  DEFAULT_OCCASIONS,
  SectionEngine,
} from '@orbitox-io/celebrations';

const sectionEngine = new SectionEngine();

// In-memory store for experiences across API calls
const EXPERIENCES_CACHE: Map<string, Experience> = new Map();

// Initialize with default demo experience
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

const initialDemoExperience: Experience = {
  id: 'exp_demo_aarav_meera',
  tenantId: 'tenant_royal_celebration',
  title: 'Aarav & Meera Wedding Celebration',
  slug: 'aarav-meera-wedding',
  occasionId: 'occ_wedding',
  occasionSlug: 'wedding',
  themeId: DEFAULT_THEMES[0]?.id || 'theme_royal_regalia',
  themeSlug: DEFAULT_THEMES[0]?.slug || 'royal-regalia',
  templateSlug: 'surreal-organimo',
  status: 'PUBLISHED',
  eventDate: '2026-12-18',
  sections: defaultSections,
  featuresEnabled: ['rsvp_tracking', 'photo_gallery', 'wishes_wall', 'background_music'],
  passwordProtection: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

EXPERIENCES_CACHE.set(initialDemoExperience.slug, initialDemoExperience);
EXPERIENCES_CACHE.set(initialDemoExperience.id, initialDemoExperience);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      id,
      title,
      slug,
      tenantId,
      occasionId,
      occasionSlug,
      themeId,
      themeSlug,
      templateSlug,
      eventDate,
      sections,
      featuresEnabled,
      passwordProtection,
      passwordHash,
      metadata,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Clean & normalize slug
    const rawSlug = (slug || title)
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const finalSlug = rawSlug || `celebration-${Date.now().toString(36)}`;
    const now = new Date().toISOString();
    let finalSections = Array.isArray(sections) && sections.length > 0 ? sections : defaultSections;

    // Smart enrichment if sections was generated from defaultSections or missing specific fields
    const hostNames =
      (body.hostNames as string | undefined) ||
      (body.coupleNames as string | undefined) ||
      (body.partner1?.name && body.partner2?.name
        ? `${body.partner1.name} & ${body.partner2.name}`
        : undefined);
    const venueCity = (body.venueCity as string | undefined) || (body.venueAddress as string | undefined);
    const p1Name = body.partner1?.name || (hostNames ? hostNames.split('&')[0]?.trim() : undefined);
    const p1Role = body.partner1?.role || 'The Groom';
    const p1Bio = body.partner1?.bio;
    const p2Name = body.partner2?.name || (hostNames ? hostNames.split('&')[1]?.trim() : undefined);
    const p2Role = body.partner2?.role || 'The Bride';
    const p2Bio = body.partner2?.bio;

    if (hostNames || venueCity || p1Name || p2Name) {
      finalSections = finalSections.map((sec) => {
        if (sec.sectionType === 'hero') {
          return {
            ...sec,
            config: {
              ...sec.config,
              ...(hostNames ? { hostNames } : {}),
              ...(venueCity ? { venueCity } : {}),
              ...(eventDate ? { eventDate } : {}),
            },
          };
        }
        if (sec.sectionType === 'couple_profile') {
          return {
            ...sec,
            config: {
              ...sec.config,
              ...(p1Name ? { partner1Name: p1Name } : {}),
              ...(p1Role ? { partner1Role: p1Role } : {}),
              ...(p1Bio ? { partner1Bio: p1Bio } : {}),
              ...(p2Name ? { partner2Name: p2Name } : {}),
              ...(p2Role ? { partner2Role: p2Role } : {}),
              ...(p2Bio ? { partner2Bio: p2Bio } : {}),
            },
          };
        }
        if (sec.sectionType === 'venue_map') {
          return {
            ...sec,
            config: {
              ...sec.config,
              ...(venueCity ? { address: venueCity, venueName: venueCity } : {}),
            },
          };
        }
        return sec;
      });
    }

    const experienceRecord: Experience = {
      id: id || `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tenantId: tenantId || 'tenant_default',
      title: title.trim(),
      slug: finalSlug,
      occasionId: occasionId || 'occ_wedding',
      occasionSlug: occasionSlug || 'wedding',
      themeId: themeId || (DEFAULT_THEMES[0]?.id ?? 'theme_royal_regalia'),
      themeSlug: themeSlug || (DEFAULT_THEMES[0]?.slug ?? 'royal-regalia'),
      templateSlug: templateSlug || 'surreal-organimo',
      status: 'PUBLISHED',
      eventDate: eventDate || new Date().toISOString().split('T')[0],
      sections: finalSections,
      featuresEnabled: Array.isArray(featuresEnabled) ? featuresEnabled : ['rsvp_tracking', 'wishes_wall', 'photo_gallery'],
      passwordProtection: Boolean(passwordProtection),
      passwordHash: passwordHash || undefined,
      metadata: metadata || {},
      createdAt: body.createdAt || now,
      updatedAt: now,
    };

    // Persist in cache by slug and by id
    EXPERIENCES_CACHE.set(experienceRecord.slug.toLowerCase(), experienceRecord);
    EXPERIENCES_CACHE.set(experienceRecord.id, experienceRecord);

    return NextResponse.json({
      success: true,
      experience: experienceRecord,
      message: 'Celebration experience successfully created and saved',
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { error: err.message || 'Failed to persist experience' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');
    const id = searchParams.get('id');

    if (slug) {
      const cleanSlug = slug.trim().toLowerCase();
      let found = EXPERIENCES_CACHE.get(cleanSlug);
      if (!found) {
        // Auto-seed experience for requested demo slugs
        const isOdyssey = cleanSlug.includes('odyssey');
        const isCelestial = cleanSlug.includes('celestial') || isOdyssey;
        const newDemo: Experience = {
          id: `exp_${cleanSlug.replace(/[^a-z0-9]/g, '_')}`,
          tenantId: 'tenant_royal_celebration',
          title: cleanSlug
            .split('-')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' '),
          slug: cleanSlug,
          occasionId: 'occ_wedding',
          occasionSlug: 'wedding',
          themeId: DEFAULT_THEMES[0]?.id || 'theme_royal_regalia',
          themeSlug: DEFAULT_THEMES[0]?.slug || 'royal-regalia',
          templateSlug: isOdyssey ? 'celestial-odyssey' : isCelestial ? 'celestial-parallax' : 'surreal-organimo',
          status: 'PUBLISHED',
          eventDate: '2026-12-18',
          sections: defaultSections,
          featuresEnabled: ['rsvp_tracking', 'photo_gallery', 'wishes_wall', 'background_music'],
          passwordProtection: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        EXPERIENCES_CACHE.set(cleanSlug, newDemo);
        found = newDemo;
      }
      return NextResponse.json({ success: true, experience: found });
    }

    if (id) {
      const found = EXPERIENCES_CACHE.get(id.trim());
      if (!found) {
        return NextResponse.json(
          { success: false, error: `Experience with id '${id}' not found` },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, experience: found });
    }

    // Return list of all unique experiences
    const all = Array.from(new Set(Array.from(EXPERIENCES_CACHE.values())));
    return NextResponse.json({ success: true, experiences: all });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { error: err.message || 'Failed to retrieve experiences' },
      { status: 500 }
    );
  }
}
