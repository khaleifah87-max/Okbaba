-- RLS for admin_logs
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read logs" ON public.admin_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND user_type IN ('admin', 'support', 'finance')
    )
  );

CREATE POLICY "Admins can insert logs" ON public.admin_logs
  FOR INSERT WITH CHECK (auth.uid() = admin_id);

-- RLS for reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create reports" ON public.reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can see own reports" ON public.reports
  FOR SELECT USING (auth.uid() = reporter_id);

CREATE POLICY "Admins can see all reports" ON public.reports
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND user_type IN ('admin', 'support', 'finance')
    )
  );

-- Grant permissions
GRANT ALL ON public.admin_logs TO authenticated;
GRANT ALL ON public.reports TO authenticated;
GRANT ALL ON public.admin_logs TO service_role;
GRANT ALL ON public.reports TO service_role;