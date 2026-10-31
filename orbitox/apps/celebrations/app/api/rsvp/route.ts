import { NextResponse } from 'next/server';
import { CelebrationsInterconnect } from '@orbitox-io/celebrations/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { guestName, email, phone, attending, partySize, dietaryRequirements, message, experienceId, tenantId } = body;

    if (!guestName || !guestName.trim()) {
      return NextResponse.json({ error: 'Guest name is required' }, { status: 400 });
    }

    const recorded = {
      id: `guest_${Date.now()}`,
      experienceId: experienceId || 'default',
      tenantId: tenantId || 'tenant_default',
      guestName: guestName.trim(),
      email: email?.trim(),
      phone: phone?.trim(),
      attending: attending || 'ATTENDING',
      partySize: partySize || 1,
      dietaryRequirements,
      message,
      createdAt: new Date().toISOString(),
    };

    // INTERCONNECT: Auto-sync to CRM
    const interconnect = CelebrationsInterconnect.getInstance();
    const crmLead = interconnect.syncRsvpToCrm(recorded as any, {
      id: experienceId || 'default',
      title: 'Aarav & Meera Wedding Celebration',
      occasionSlug: 'wedding',
    });

    return NextResponse.json({ success: true, guest: recorded, crmLeadId: crmLead.id, crmScore: crmLead.score });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to submit RSVP' }, { status: 500 });
  }
}
