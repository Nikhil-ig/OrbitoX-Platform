import {
  Experience,
  ExperienceGuest,
  Theme,
  Occasion,
  GuestTable,
  SeatingPlanResult,
  CelebrationBudgetReport,
  BudgetItem,
} from './types';

export interface GeneratedMilestone {
  year: string;
  title: string;
  description: string;
  image?: string;
}

export interface GeneratedSpeech {
  title: string;
  role: string;
  tone: string;
  body: string;
  keyQuotes: string[];
  estimatedDeliveryTime: string;
}

export interface RsvpInsightsSummary {
  totalInvitedEstimate: number;
  totalResponded: number;
  attendingCount: number;
  declinedCount: number;
  attendanceRatePercentage: number;
  dietaryBreakdown: Record<string, number>;
  averagePartySize: number;
  recommendedCateringHeadcount: number;
  actionableInsights: string[];
}

export class SmartCelebrationAssistant {
  /**
   * Generates a beautifully drafted story timeline based on personal prompts
   */
  static generateLoveStoryTimeline(
    partner1: string,
    partner2: string,
    notes?: {
      firstMetYear?: string;
      firstMetLocation?: string;
      proposalYear?: string;
      proposalLocation?: string;
      specialMemories?: string;
    }
  ): GeneratedMilestone[] {
    const p1 = partner1.trim() || 'Aarav';
    const p2 = partner2.trim() || 'Meera';
    const firstYear = notes?.firstMetYear || '2021';
    const firstLoc = notes?.firstMetLocation || 'a cozy rooftop cafe';
    const propYear = notes?.proposalYear || '2025';
    const propLoc = notes?.proposalLocation || 'under a canopy of golden sunset clouds';

    return [
      {
        year: firstYear,
        title: 'Where It All Began',
        description: `Fate brought ${p1} and ${p2} together at ${firstLoc}. A chance conversation over coffee quickly turned into hours of shared laughter and the unspoken feeling that something extraordinary was unfolding.`,
        image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&q=80',
      },
      {
        year: String(parseInt(firstYear, 10) + 2),
        title: 'Growing Together',
        description: `Through countless weekend road trips, quiet stargazing nights, and supporting each other through every milestone, ${p1} and ${p2} built a foundation of trust, endless kindness, and shared dreams.`,
        image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&q=80',
      },
      {
        year: propYear,
        title: 'The Forever Promise',
        description: `Surrounded by the magic of ${propLoc}, ${p1} asked the question that changed everything. With tears of joy and full hearts, ${p2} said yes — embarking on the journey to forever.`,
        image: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=600&q=80',
      },
    ];
  }

  /**
   * Generates tailored WhatsApp blast text with emojis, event highlights, and direct link
   */
  static generateWhatsAppInvite(
    experience: {
      title: string;
      eventDate?: string;
      slug: string;
      venueName?: string;
      hostNames?: string;
    },
    guestName?: string
  ): string {
    const greeting = guestName ? `Dear ${guestName},` : `Dear Family & Friends,`;
    const hosts = experience.hostNames || experience.title;
    const date = experience.eventDate || 'Coming Soon';
    const venue = experience.venueName || 'Our Celebration Destination';
    const url = `https://celebrate.orbitox.io/e/${experience.slug}`;

    return `✨ *CELEBRATION INVITATION* ✨\n\n${greeting}\n\nWith immense joy and gratitude, *${hosts}* invite you to be part of our special celebration!\n\n📅 *Date:* ${date}\n📍 *Venue:* ${venue}\n\nWe have created an interactive digital invitation where you can view ceremony details, love story, route directions, and RSVP:\n\n👉 *View & RSVP:* ${url}\n\nKindly confirm your presence by visiting the link above so we can reserve your seat.\n\nWarm regards & love,\n*${hosts}*`;
  }

  /**
   * Smart RSVP & Catering Intelligence Matrix
   */
  static analyzeRsvpInsights(guests: ExperienceGuest[]): RsvpInsightsSummary {
    const totalResponded = guests.length;
    const attendingGuests = guests.filter((g) => g.attending === 'ATTENDING');
    const declinedGuests = guests.filter((g) => g.attending === 'DECLINED');

    const attendingCount = attendingGuests.reduce((sum, g) => sum + (g.partySize || 1), 0);
    const declinedCount = declinedGuests.length;

    const rate =
      totalResponded > 0 ? Math.round((attendingGuests.length / totalResponded) * 100) : 0;

    // Dietary matrix
    const dietaryBreakdown: Record<string, number> = {};
    attendingGuests.forEach((g) => {
      if (g.dietaryRequirements && g.dietaryRequirements.trim() !== '') {
        const diet = g.dietaryRequirements.trim();
        dietaryBreakdown[diet] = (dietaryBreakdown[diet] || 0) + (g.partySize || 1);
      }
    });

    const averagePartySize =
      attendingGuests.length > 0
        ? parseFloat((attendingCount / attendingGuests.length).toFixed(1))
        : 1;

    // Buffer of +10% recommended for catering
    const recommendedCateringHeadcount = Math.ceil(attendingCount * 1.1);

    const actionableInsights: string[] = [];

    if (attendingCount > 0) {
      actionableInsights.push(
        `High commitment rate: ${rate}% of responding invitees are attending.`
      );
    }
    if (Object.keys(dietaryBreakdown).length > 0) {
      const specialDietsCount = Object.values(dietaryBreakdown).reduce((a, b) => a + b, 0);
      actionableInsights.push(
        `${specialDietsCount} guests require customized dietary arrangements (e.g. Jain, Vegan).`
      );
    } else {
      actionableInsights.push(`No critical dietary restrictions reported yet.`);
    }

    actionableInsights.push(
      `Recommended catering buffer: plan for ${recommendedCateringHeadcount} plates (includes 10% safety buffer for unexpected plus-ones).`
    );

    return {
      totalInvitedEstimate: Math.max(50, totalResponded * 2),
      totalResponded,
      attendingCount,
      declinedCount,
      attendanceRatePercentage: rate,
      dietaryBreakdown,
      averagePartySize,
      recommendedCateringHeadcount,
      actionableInsights,
    };
  }

  /**
   * Generates Google Calendar link for ceremonies
   */
  static generateGoogleCalendarUrl(event: {
    name: string;
    description?: string;
    venue?: string;
    date: string;
    time?: string;
  }): string {
    const title = encodeURIComponent(event.name);
    const details = encodeURIComponent(event.description || 'Celebration ceremony');
    const location = encodeURIComponent(event.venue || '');

    // Formats dates as YYYYMMDDTHHMMSSZ
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}`;
  }

  /**
   * Generates a personalized speech or toast for celebrations
   */
  static generateHeartfeltSpeech(params: {
    role: 'best_man' | 'maid_of_honor' | 'parent' | 'celebrant' | 'friend';
    tone: 'emotional' | 'humorous' | 'poetic' | 'grand';
    celebrantNames: string;
    keyMemories?: string;
  }): GeneratedSpeech {
    const names = params.celebrantNames.trim() || 'our wonderful celebrants';
    const memories = params.keyMemories?.trim() || 'from childhood dreams to this magical celebration';

    let title = `A Toast to ${names}`;
    let body = '';
    let quotes: string[] = [];
    let deliveryTime = '3 - 4 minutes';

    if (params.role === 'maid_of_honor' || params.role === 'best_man') {
      if (params.tone === 'humorous') {
        title = `A True & Unfiltered Toast to ${names}`;
        body = `Good evening everyone! For those who don't know me, I'm here because someone trusted me with a microphone tonight — which history tells us is always a risky move.\n\nLooking at ${names} today, it is impossible not to smile. I still remember ${memories}. Back then, who would have thought we'd be dressed in our finest, celebrating the most beautiful love story imaginable?\n\nThey say true love isn't about finding someone you can live with; it's about finding someone you can't survive without — especially when ordering takeout at 11 PM or deciding who holds the TV remote.\n\nTo ${names}: May your love continue to be as wild as your happiest adventures and as patient as your patience with each other's quirks. Everyone, please raise your glasses — to forever, laughter, and endless love! 🥂`;
        quotes = [
          '“Love is being weird together and celebrating every single quirk.”',
          '“Raise your glasses to friendship, laughter, and the beginning of forever.”',
        ];
      } else {
        title = `Honoring a Beautiful Journey: A Toast to ${names}`;
        body = `Good evening family and friends. Standing here tonight by the side of ${names} is one of the greatest honors of my life.\n\nWhen you see two people whose souls fit together so effortlessly, it restores your faith in the universe. Thinking back to ${memories}, I saw the quiet shift when their lives aligned — that moment when happiness wasn't just an emotion, but a shared home.\n\nMay your home always be warm with shared laughter, your days blessed with deep companionship, and your bond grow stronger with each passing season. To ${names} — may your love be a beacon for all of us. Cheers! 🥂`;
        quotes = [
          '“True love isn’t something you find; it’s something you build together with kindness.”',
        ];
      }
    } else if (params.role === 'parent') {
      title = `A Parent's Blessing for ${names}`;
      body = `Beloved family and dear guests, our hearts are completely overflowing with gratitude and pride tonight.\n\nWatching our children grow, stumble, find their wings, and now stand before us beside the love of their lives is the greatest blessing parents could ever ask for. Reflecting on ${memories}, every step has led to this golden hour.\n\nTo ${names}: Cherish each other through every high and low. Speak gently, listen deeply, and let forgiveness be your quickest instinct. Our home will always have a door open, and our hearts will forever celebrate you both. May the divine shower you with boundless peace, health, and prosperity.`;
      quotes = ['“To our children: you were our world yesterday, and your happiness is our peace today.”'];
      deliveryTime = '4 - 5 minutes';
    } else {
      title = `Celebrating the Magic of ${names}`;
      body = `Dearest friends and family, what an extraordinary privilege it is to gather in honor of ${names}.\n\nWhen people ask what makes true companionship, tonight is the answer. Surrounded by love, warmth, and the sweet echoes of ${memories}, we witness the unfolding of a legacy.\n\nLet us toast to the adventures yet unwritten, the joy in quiet moments, and a love that stands timeless against the world. To ${names}! 🥂`;
      quotes = ['“Here is to love that inspires, lifts, and endures all things.”'];
      deliveryTime = '2 - 3 minutes';
    }

    return {
      title,
      role: params.role,
      tone: params.tone,
      body,
      keyQuotes: quotes,
      estimatedDeliveryTime: deliveryTime,
    };
  }

  /**
   * Generates an intelligent, dietary-conscious table seating plan
   */
  static generateSmartSeatingPlan(
    guests: ExperienceGuest[],
    tableCapacity: number = 8
  ): SeatingPlanResult {
    const attending = guests.filter((g) => g.attending === 'ATTENDING');
    const tables: GuestTable[] = [];

    // Separate VIPs, special diets, and standard attendees
    const vipGuests = attending.filter((g) => g.isVip || (g.partySize && g.partySize >= 3));
    const dietaryGuests = attending.filter(
      (g) => !g.isVip && g.dietaryRequirements && g.dietaryRequirements !== 'None'
    );
    const standardGuests = attending.filter(
      (g) => !g.isVip && (!g.dietaryRequirements || g.dietaryRequirements === 'None')
    );

    let currentTableNum = 1;

    // 1. VIP / Family Table(s)
    let vipTable: GuestTable = {
      tableNumber: currentTableNum++,
      tableName: 'VIP Royal Family Table (Head Table)',
      capacity: tableCapacity,
      assignedGuests: [],
      totalSeated: 0,
    };

    vipGuests.forEach((g) => {
      const size = g.partySize || 1;
      if (vipTable.totalSeated + size <= vipTable.capacity) {
        vipTable.assignedGuests.push({
          guestId: g.id,
          guestName: g.guestName,
          partySize: size,
          dietary: g.dietaryRequirements,
          isVip: true,
        });
        vipTable.totalSeated += size;
      } else {
        tables.push(vipTable);
        vipTable = {
          tableNumber: currentTableNum++,
          tableName: `VIP Family & Honored Guests (Table ${currentTableNum - 1})`,
          capacity: tableCapacity,
          assignedGuests: [
            {
              guestId: g.id,
              guestName: g.guestName,
              partySize: size,
              dietary: g.dietaryRequirements,
              isVip: true,
            },
          ],
          totalSeated: size,
        };
      }
    });
    if (vipTable.totalSeated > 0) tables.push(vipTable);

    // 2. Dietary Specialized Table (if present)
    if (dietaryGuests.length > 0) {
      let dietTable: GuestTable = {
        tableNumber: currentTableNum++,
        tableName: 'Specialty Dietary & Gourmet Circle',
        capacity: tableCapacity,
        assignedGuests: [],
        totalSeated: 0,
      };

      dietaryGuests.forEach((g) => {
        const size = g.partySize || 1;
        if (dietTable.totalSeated + size <= dietTable.capacity) {
          dietTable.assignedGuests.push({
            guestId: g.id,
            guestName: g.guestName,
            partySize: size,
            dietary: g.dietaryRequirements,
          });
          dietTable.totalSeated += size;
        } else {
          tables.push(dietTable);
          dietTable = {
            tableNumber: currentTableNum++,
            tableName: `Gourmet & Specialty Table ${currentTableNum - 1}`,
            capacity: tableCapacity,
            assignedGuests: [
              {
                guestId: g.id,
                guestName: g.guestName,
                partySize: size,
                dietary: g.dietaryRequirements,
              },
            ],
            totalSeated: size,
          };
        }
      });
      if (dietTable.totalSeated > 0) tables.push(dietTable);
    }

    // 3. Friends & General Tables
    let generalTable: GuestTable = {
      tableNumber: currentTableNum++,
      tableName: `Friends & Celebration Crew (Table ${currentTableNum - 1})`,
      capacity: tableCapacity,
      assignedGuests: [],
      totalSeated: 0,
    };

    standardGuests.forEach((g) => {
      const size = g.partySize || 1;
      if (generalTable.totalSeated + size <= generalTable.capacity) {
        generalTable.assignedGuests.push({
          guestId: g.id,
          guestName: g.guestName,
          partySize: size,
        });
        generalTable.totalSeated += size;
      } else {
        tables.push(generalTable);
        generalTable = {
          tableNumber: currentTableNum++,
          tableName: `Celebration Circle (Table ${currentTableNum - 1})`,
          capacity: tableCapacity,
          assignedGuests: [
            {
              guestId: g.id,
              guestName: g.guestName,
              partySize: size,
            },
          ],
          totalSeated: size,
        };
      }
    });
    if (generalTable.totalSeated > 0) tables.push(generalTable);

    const totalSeated = tables.reduce((acc, t) => acc + t.totalSeated, 0);
    const totalExpected = attending.reduce((acc, g) => acc + (g.partySize || 1), 0);

    return {
      tables,
      unassignedCount: Math.max(0, totalExpected - totalSeated),
      totalSeated,
      vipTableCount: tables.filter((t) => t.tableName.includes('VIP')).length,
    };
  }

  /**
   * Intelligently estimates celebration budget breakdowns by occasion & headcount
   */
  static estimateCelebrationBudget(
    occasionSlug: string,
    expectedGuests: number = 100,
    tier: 'budget' | 'premium' | 'royal_luxury' = 'premium'
  ): CelebrationBudgetReport {
    const guests = Math.max(10, expectedGuests);

    let basePerGuest = 3500; // INR
    if (tier === 'budget') basePerGuest = 1800;
    if (tier === 'royal_luxury') basePerGuest = 9500;

    // Adjust for occasion multiplier
    if (occasionSlug === 'wedding') basePerGuest = Math.round(basePerGuest * 1.6);
    else if (occasionSlug === 'corporate-event') basePerGuest = Math.round(basePerGuest * 1.3);
    else if (occasionSlug === 'birthday') basePerGuest = Math.round(basePerGuest * 0.7);

    const totalEstimatedBudgetInr = basePerGuest * guests;

    const categories: BudgetItem[] = [
      {
        category: 'Venue, Hospitality & Banquets',
        allocatedInr: Math.round(totalEstimatedBudgetInr * 0.42),
        percentage: 42,
        description: 'Prime venue reservation, hall decor base, guest welcome & stay suites.',
        status: 'essential',
      },
      {
        category: 'Catering, Live Counters & Mixology',
        allocatedInr: Math.round(totalEstimatedBudgetInr * 0.3),
        percentage: 30,
        description: 'Multi-course menu, live gourmet stations, beverages, and desserts.',
        status: 'essential',
      },
      {
        category: 'Decor, Florals & Ambient Lighting',
        allocatedInr: Math.round(totalEstimatedBudgetInr * 0.14),
        percentage: 14,
        description: 'Thematic stage, floral canopies, centerpieces, and mood lighting.',
        status: 'recommended',
      },
      {
        category: 'Photography & Cinematic Films',
        allocatedInr: Math.round(totalEstimatedBudgetInr * 0.08),
        percentage: 8,
        description: 'Drone coverage, candid wedding film, live streaming, and photobook.',
        status: 'recommended',
      },
      {
        category: 'Entertainment, DJ & Sound Engineering',
        allocatedInr: Math.round(totalEstimatedBudgetInr * 0.04),
        percentage: 4,
        description: 'Live acoustic performers, DJ console, intelligent sound & party lights.',
        status: 'optional',
      },
      {
        category: 'OrbitoX Digital Platform & Tech Concierge',
        allocatedInr: Math.round(totalEstimatedBudgetInr * 0.02),
        percentage: 2,
        description: 'Custom domain, instant RSVP sync, venue projector wall & SMS passes.',
        status: 'essential',
      },
    ];

    const savingsTips = [
      `Lock in caterers with a guaranteed +10% headcount buffer to avoid costly last-minute spot charges.`,
      `Select in-season regional flowers for decor to save up to 25% without compromising aesthetics.`,
      `Leverage OrbitoX digital invitations and QR gate passes to completely eliminate high print & courier costs.`,
    ];

    return {
      totalEstimatedBudgetInr,
      costPerGuestInr: basePerGuest,
      categories,
      savingsTips,
    };
  }

  /**
   * Generates a tamper-evident guest check-in pass payload
   */
  static generateGuestCheckInPass(
    guest: ExperienceGuest,
    experienceSlug: string
  ): {
    passToken: string;
    qrPayload: string;
    gateDisplay: string;
  } {
    const raw = `${guest.id}_${experienceSlug}_${guest.partySize || 1}_${Date.now()}`;
    const token = `OXPASS-${Buffer.from(raw).toString('base64').substring(0, 16).toUpperCase()}`;

    const qrPayload = JSON.stringify({
      token,
      guestId: guest.id,
      guestName: guest.guestName,
      partySize: guest.partySize || 1,
      dietary: guest.dietaryRequirements || 'Standard',
      vip: !!guest.isVip,
    });

    return {
      passToken: token,
      qrPayload,
      gateDisplay: `${guest.guestName} (${guest.partySize || 1} Guests)${guest.isVip ? ' [VIP]' : ''}`,
    };
  }
}
