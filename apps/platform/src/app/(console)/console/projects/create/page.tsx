'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ConsoleShell } from '../../components/console-shell';
import {
  Card,
  Button,
  Input,
  Label,
} from '@orbitox-io/ui';
import {
  FolderKanban,
  Layers,
  Building2,
  Server,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Cpu,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

const STEPS = [
  'Template',
  'Identity',
  'Architecture',
  'Features',
  'Plugins',
  'Review & Deploy',
];

interface TemplateOption {
  id: string;
  name: string;
  type: 'restaurant-os' | 'hospital-os' | 'custom-os';
  port: number;
  desc: string;
  plugins: string[];
  features: string[];
  plan: string;
  model: string;
}

const TEMPLATES: TemplateOption[] = [
  {
    id: 'template_restaurant_os',
    name: 'RestaurantOS',
    type: 'restaurant-os',
    port: 4010,
    desc: 'Culinary runtime with Dine PWA, KDS routing, and spatial floor matrix.',
    plugins: ['@orbitox/restaurant'],
    features: ['dine_qr', 'dag_prep_scheduler', 'companion_join', 'realtime_kds'],
    plan: 'restaurant-growth',
    model: 'O2O2B2B2C',
  },
  {
    id: 'template_hospital_os',
    name: 'HospitalOS',
    type: 'hospital-os',
    port: 4030,
    desc: 'Clinical telemetry, emergency triage scoring, and ICU occupancy mesh.',
    plugins: ['@orbitox/hms'],
    features: ['triage_scoring', 'icu_telemetry', 'consultation_mesh'],
    plan: 'hms-pro',
    model: 'HEALTHCARE_NETWORK',
  },
  {
    id: 'template_blank_os',
    name: 'Blank External OS',
    type: 'custom-os',
    port: 4060,
    desc: 'Zero-dependency decoupled foundation preconfigured with Control Bridge.',
    plugins: ['@orbitox/core'],
    features: ['runtime_bridge', 'health_probes'],
    plan: 'plan_custom_starter',
    model: 'CUSTOM',
  },
];

export default function ConsoleProjectCreatePage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = React.useState(0);

  // Form State
  const [name, setName] = React.useState('RestaurantOS');
  const [slug, setSlug] = React.useState('restaurant-os');
  const [type, setType] = React.useState<'restaurant-os' | 'hospital-os' | 'custom-os'>('restaurant-os');
  const [templateId, setTemplateId] = React.useState('template_restaurant_os');
  const [businessModel, setBusinessModel] = React.useState('O2O2B2B2C');
  const [defaultPort, setDefaultPort] = React.useState(4010);
  const [enabledPlugins, setEnabledPlugins] = React.useState<string[]>(['@orbitox/restaurant']);
  const [enabledFeatures, setEnabledFeatures] = React.useState<string[]>([
    'dine_qr',
    'dag_prep_scheduler',
    'companion_join',
    'realtime_kds',
  ]);
  const [selectedPlan, setSelectedPlan] = React.useState('restaurant-growth');
  const [environment, setEnvironment] = React.useState('production');
  const [syncInterval, setSyncInterval] = React.useState(10);

  const [isGenerating, setIsGenerating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSelectTemplate = (t: TemplateOption) => {
    setTemplateId(t.id);
    setName(t.name);
    setSlug(t.id.replace('template_', '').replace(/_/g, '-'));
    setType(t.type);
    setDefaultPort(t.port);
    setEnabledPlugins(t.plugins);
    setEnabledFeatures(t.features);
    setSelectedPlan(t.plan);
    setBusinessModel(t.model);
  };

  const toggleFeature = (feat: string) => {
    setEnabledFeatures((prev) =>
      prev.includes(feat) ? prev.filter((f) => f !== feat) : [...prev, feat],
    );
  };

  const togglePlugin = (plug: string) => {
    setEnabledPlugins((prev) =>
      prev.includes(plug) ? prev.filter((p) => p !== plug) : [...prev, plug],
    );
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const controlPlaneUrl =
        typeof window !== 'undefined'
          ? window.location.origin
          : process.env.NEXT_PUBLIC_CONTROL_PLANE_URL || 'http://localhost:3005';

      const res = await fetch('/api/v1/projects/factory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug,
          type,
          templateId,
          businessModel,
          defaultPort,
          enabledPlugins,
          enabledFeatures,
          planReferences: [selectedPlan],
          environmentMetadata: {
            defaultEnvironment: environment,
            supportedEnvironments: ['development', 'staging', 'production'],
          },
          platformController: {
            controlPlaneUrl,
            syncIntervalSeconds: syncInterval,
            requireSignedConfig: true,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate external project');
      }

      router.push(`/console/projects/${data.project.id}`);
    } catch (err: any) {
      setError(err.message || 'Error creating project');
      setIsGenerating(false);
    }
  };

  return (
    <ConsoleShell activeId="projects">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
        {/* Navigation Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
          <Link href="/console/projects" className="hover:text-[var(--color-text)] transition-colors">
            Projects
          </Link>
          <span>/</span>
          <span className="font-semibold text-[var(--color-text)]">Create Project</span>
        </div>

        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-text)]">
            Create External Project
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Scaffold a decoupled product runtime governed by the OrbitoX Control Plane.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
          {STEPS.map((st, idx) => (
            <div
              key={st}
              className={`p-2.5 rounded-[var(--radius-card)] border text-center transition-all ${
                idx === currentStep
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-semibold'
                  : idx < currentStep
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]'
              }`}
            >
              <div className="text-[10px] uppercase tracking-wider mb-0.5">Step {idx + 1}</div>
              <div className="text-xs truncate">{st}</div>
            </div>
          ))}
        </div>

        {error && (
          <div className="p-4 rounded-[var(--radius-card)] bg-rose-50 dark:bg-rose-950/20 border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs">
            {error}
          </div>
        )}

        {/* Step 1: Choose Template */}
        {currentStep === 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Select an Application Template</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {TEMPLATES.map((t) => (
                <Card
                  key={t.id}
                  className={`p-5 cursor-pointer transition-all border ${
                    templateId === t.id
                      ? 'border-[var(--color-primary)] ring-1 ring-[var(--color-primary)] bg-[var(--color-surface-hover)]'
                      : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50'
                  }`}
                  onClick={() => handleSelectTemplate(t)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-9 w-9 rounded-full bg-[var(--color-surface-raised)] flex items-center justify-center text-[var(--color-primary)]">
                      {t.type === 'restaurant-os' ? (
                        <Layers className="h-4 w-4" />
                      ) : t.type === 'hospital-os' ? (
                        <Building2 className="h-4 w-4" />
                      ) : (
                        <Server className="h-4 w-4" />
                      )}
                    </div>
                    {templateId === t.id && (
                      <CheckCircle2 className="h-4 w-4 text-[var(--color-primary)]" />
                    )}
                  </div>
                  <h3 className="font-bold text-sm text-[var(--color-text)] mb-1">{t.name}</h3>
                  <p className="text-xs text-[var(--color-text-muted)] leading-relaxed mb-3">{t.desc}</p>
                  <div className="text-[11px] font-mono text-[var(--color-text-muted)]">
                    Default Port: {t.port}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Project Identity */}
        {currentStep === 1 && (
          <Card className="p-6 space-y-4">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Project Identity</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="proj-name">Project Display Name</Label>
                <Input
                  id="proj-name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
                  }}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="proj-slug">Project Slug (Identifier)</Label>
                <Input
                  id="proj-slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="proj-type">Runtime Type</Label>
                <select
                  id="proj-type"
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-card)] text-[var(--color-text)]"
                >
                  <option value="restaurant-os">RestaurantOS Runtime</option>
                  <option value="hospital-os">HospitalOS Clinical Runtime</option>
                  <option value="custom-os">Custom External OS Runtime</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="proj-model">Business Architecture</Label>
                <Input
                  id="proj-model"
                  value={businessModel}
                  onChange={(e) => setBusinessModel(e.target.value)}
                />
              </div>
            </div>
          </Card>
        )}

        {/* Step 3: Runtime & Architecture */}
        {currentStep === 2 && (
          <Card className="p-6 space-y-4">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Runtime & Architecture</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="proj-port">Default Runtime Port</Label>
                <Input
                  id="proj-port"
                  type="number"
                  value={defaultPort}
                  onChange={(e) => setDefaultPort(Number(e.target.value))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="proj-env">Default Environment</Label>
                <select
                  id="proj-env"
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-card)] text-[var(--color-text)]"
                >
                  <option value="development">Development</option>
                  <option value="staging">Staging</option>
                  <option value="production">Production</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="proj-sync">Sync Heartbeat (Seconds)</Label>
                <Input
                  id="proj-sync"
                  type="number"
                  value={syncInterval}
                  onChange={(e) => setSyncInterval(Number(e.target.value))}
                  required
                />
              </div>
            </div>
          </Card>
        )}

        {/* Step 4: Capabilities & Features */}
        {currentStep === 3 && (
          <Card className="p-6 space-y-4">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Enabled Capabilities & Modules</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: 'dine_qr', name: 'Dine QR Ordering', desc: 'Guest PWA menu & contactless ordering' },
                { id: 'dag_prep_scheduler', name: 'DAG Kitchen Prep Scheduler', desc: 'Graph-based cook station orchestration' },
                { id: 'companion_join', name: 'Companion Table Join', desc: 'Multi-party real-time order pooling' },
                { id: 'realtime_kds', name: 'Real-time KDS Stream', desc: 'Kitchen Display System event bus' },
                { id: 'triage_scoring', name: 'Emergency Triage Scoring', desc: 'ESI & clinical acuity prioritization' },
                { id: 'icu_telemetry', name: 'ICU Telemetry Stream', desc: 'High-frequency vitals monitor feed' },
                { id: 'consultation_mesh', name: 'Consultation Mesh', desc: 'Physician multi-disciplinary routing' },
                { id: 'runtime_bridge', name: 'Control Bridge SDK', desc: 'Automated configuration push & telemetry' },
              ].map((f) => (
                <div
                  key={f.id}
                  onClick={() => toggleFeature(f.id)}
                  className={`p-3.5 rounded-[var(--radius-card)] border cursor-pointer transition-all flex items-start gap-3 ${
                    enabledFeatures.includes(f.id)
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-hover)]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={enabledFeatures.includes(f.id)}
                    onChange={() => {}}
                    className="mt-0.5 rounded text-[var(--color-primary)]"
                  />
                  <div>
                    <div className="font-semibold text-xs text-[var(--color-text)]">{f.name}</div>
                    <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Step 5: Select Plugins */}
        {currentStep === 4 && (
          <Card className="p-6 space-y-4">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Platform Plugins</h2>
            <div className="space-y-3">
              {[
                { id: '@orbitox/restaurant', name: 'Restaurant Engine (@orbitox/restaurant)', desc: 'Core F&B plugin with table schemas, kitchen orders, and Dine QR' },
                { id: '@orbitox/hms', name: 'Hospital Management System (@orbitox/hms)', desc: 'Clinical EHR, admissions, emergency triage, and bed allocation' },
                { id: '@orbitox/core', name: 'OrbitoX Core Foundation (@orbitox/core)', desc: 'Base lifecycle hook manager, cryptographic tenant sandbox, and event emitter' },
              ].map((p) => (
                <div
                  key={p.id}
                  onClick={() => togglePlugin(p.id)}
                  className={`p-3.5 rounded-[var(--radius-card)] border cursor-pointer transition-all flex items-start gap-3 ${
                    enabledPlugins.includes(p.id)
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-hover)]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={enabledPlugins.includes(p.id)}
                    onChange={() => {}}
                    className="mt-0.5 rounded text-[var(--color-primary)]"
                  />
                  <div>
                    <div className="font-semibold text-xs text-[var(--color-text)]">{p.name}</div>
                    <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{p.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Step 6: Review & Provision */}
        {currentStep === 5 && (
          <Card className="p-6 space-y-6">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Review & Deploy Project</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-card)]">
                <span className="text-[var(--color-text-muted)] block mb-1">Project Name</span>
                <span className="font-bold text-[var(--color-text)]">{name}</span>
              </div>
              <div className="p-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-card)]">
                <span className="text-[var(--color-text-muted)] block mb-1">Slug Identifier</span>
                <span className="font-mono text-[var(--color-text)]">{slug}</span>
              </div>
              <div className="p-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-card)]">
                <span className="text-[var(--color-text-muted)] block mb-1">Runtime Type</span>
                <span className="font-medium text-[var(--color-text)]">{type}</span>
              </div>
              <div className="p-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-card)]">
                <span className="text-[var(--color-text-muted)] block mb-1">Default Port</span>
                <span className="font-mono text-[var(--color-text)]">{defaultPort}</span>
              </div>
              <div className="p-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-card)] sm:col-span-2">
                <span className="text-[var(--color-text-muted)] block mb-1">Plugins</span>
                <span className="font-mono text-[var(--color-text)]">{enabledPlugins.join(', ') || 'None'}</span>
              </div>
              <div className="p-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-card)] sm:col-span-2">
                <span className="text-[var(--color-text-muted)] block mb-1">Active Features</span>
                <span className="text-[var(--color-text)]">{enabledFeatures.join(', ')}</span>
              </div>
            </div>

            <div className="p-4 rounded-[var(--radius-card)] bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-800 text-xs flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <div className="font-semibold text-emerald-800 dark:text-emerald-300">
                  Ready for Control Plane Provisioning
                </div>
                <div className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
                  The project workspace will be created with an Ed25519-signed manifest and registered into the Fleet heartbeat engine.
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Wizard Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              if (currentStep > 0) setCurrentStep((prev) => prev - 1);
              else router.push('/console/projects');
            }}
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
            {currentStep === 0 ? 'Cancel' : 'Previous'}
          </Button>

          {currentStep < STEPS.length - 1 ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setCurrentStep((prev) => prev + 1)}
            >
              Next
              <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={isGenerating}
              onClick={handleGenerate}
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              {isGenerating ? 'Provisioning Project...' : 'Deploy Project'}
            </Button>
          )}
        </div>
      </div>
    </ConsoleShell>
  );
}
