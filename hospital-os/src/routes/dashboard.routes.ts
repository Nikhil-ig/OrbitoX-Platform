import { DashboardService } from '../services/dashboard.service';

export function registerDashboardRoutes(app: any) {
  // Get Role-Based Dashboard View
  app.get('/api/hospital/dashboard', async (req: any, res: any) => {
    try {
      const role = (req.headers['x-staff-role'] as string) || 'attending_doctor';
      const contextId = (req.headers['x-context-id'] as string) || 'default-context';
      const dashboard = await DashboardService.getDashboardForRole(role, contextId);
      res.status(200).json({ success: true, dashboard });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });
}
