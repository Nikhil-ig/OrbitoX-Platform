import { TelemetryService } from '../services/telemetry.service';

export function registerTelemetryRoutes(app: any) {
  // Ingest Live Vitals Stream
  app.post('/api/hospital/telemetry', async (req: any, res: any) => {
    try {
      const contextId = (req.headers['x-context-id'] as string) || undefined;
      const { bedId, vitals } = req.body;
      const result = await TelemetryService.processVitalsStream(bedId, vitals, contextId);
      res.status(200).json({ success: true, result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });
}
